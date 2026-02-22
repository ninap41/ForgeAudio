import { ref, computed, reactive } from 'vue'
import { useTagStore } from './tagStore'
import { useThemeStore } from './themeStore'

export type SortColumn = 'name' | 'tags' | 'duration' | 'type' | 'createdAt' | 'modifiedAt'

export interface AudioFile {
  path: string
  name: string
  extension: string
  size: number
  duration: number | null
  tags: string[]
  description: string
  lastPlayed: string | null
  createdAt: string | null
  modifiedAt: string | null
}

export interface LibraryMetadata {
  version: number
  files: Record<string, {
    tags: string[]
    description: string
    lastPlayed: string | null
  }>
  tags: Record<string, { color: string }>
  theme?: Record<string, string>
}

// Module-scope state (singleton)
const files = ref<AudioFile[]>([])
const rootDirectory = ref<string | null>(null)
const searchQuery = ref('')
const filterExtension = ref<string[]>([])
const filterTagged = ref<'all' | 'tagged' | 'untagged'>('all')
const isScanning = ref(false)
const sortColumn = ref<SortColumn>('name')
const sortDirection = ref<'asc' | 'desc'>('asc')

// Chip-based active filters
const selectedTags = ref<string[]>([])
const descriptionFilters = ref<string[]>([])

// Last metadata read from disk — used as a base when saving to avoid erasing
// tags for files that haven't arrived in the scan yet (partial-scan data loss).
let lastReadMeta: LibraryMetadata | null = null

// Current playback
const currentFile = ref<AudioFile | null>(null)
const isPlaying = ref(false)

const filteredFiles = computed(() => {
  let result = files.value

  // Extension filter
  if (filterExtension.value.length > 0) {
    result = result.filter(f => filterExtension.value.includes(f.extension))
  }

  // Tagged filter
  if (filterTagged.value === 'tagged') {
    result = result.filter(f => f.tags.length > 0)
  } else if (filterTagged.value === 'untagged') {
    result = result.filter(f => f.tags.length === 0)
  }

  // Tag chip filters — file must have ALL selected tags
  if (selectedTags.value.length > 0) {
    result = result.filter(f =>
      selectedTags.value.every(tag => f.tags.includes(tag))
    )
  }

  // Description chip filters — each chip must match name or description (AND across chips)
  if (descriptionFilters.value.length > 0) {
    result = result.filter(f =>
      descriptionFilters.value.every(q => {
        const lq = q.toLowerCase()
        return f.name.toLowerCase().includes(lq) || f.description.toLowerCase().includes(lq)
      })
    )
  }

  // Sort — nulls always land at the end regardless of direction
  const dir = sortDirection.value === 'asc' ? 1 : -1
  return [...result].sort((a, b) => {
    switch (sortColumn.value) {
      case 'name':
        return dir * a.name.localeCompare(b.name)
      case 'tags':
        return dir * (a.tags.length - b.tags.length)
      case 'duration': {
        if (a.duration === null && b.duration === null) return 0
        if (a.duration === null) return 1
        if (b.duration === null) return -1
        return dir * (a.duration - b.duration)
      }
      case 'type':
        return dir * a.extension.localeCompare(b.extension)
      case 'createdAt': {
        if (!a.createdAt && !b.createdAt) return 0
        if (!a.createdAt) return 1
        if (!b.createdAt) return -1
        return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      }
      case 'modifiedAt': {
        if (!a.modifiedAt && !b.modifiedAt) return 0
        if (!a.modifiedAt) return 1
        if (!b.modifiedAt) return -1
        return dir * (new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime())
      }
      default:
        return 0
    }
  })
})

export function useLibraryStore() {
  const tagStore = useTagStore()
  const themeStore = useThemeStore()

  async function initFromPersistedDirectory() {
    const dir = await window.electronAPI.getRootDirectory()
    if (dir) {
      rootDirectory.value = dir
      await rescan()
    }
  }

  async function selectAndScanDirectory() {
    const dir = await window.electronAPI.selectDirectory()
    if (!dir) return

    rootDirectory.value = dir
    await window.electronAPI.setRootDirectory(dir)
    await rescan()
  }

  async function rescan() {
    if (!rootDirectory.value) return

    isScanning.value = true
    files.value = []

    try {
      // Read metadata first (fast local file read) so it's ready when batches arrive
      const metaRaw = await window.electronAPI.readMetadata()
      const meta: LibraryMetadata = JSON.parse(metaRaw)
      lastReadMeta = meta

      tagStore.loadTags(meta.tags)
      themeStore.loadTheme(meta.theme)

      // Clean up any leftover listeners from a previous scan
      window.electronAPI.removeScanListeners()

      // Stream scan results, merging each batch with metadata as it arrives
      await new Promise<void>((resolve) => {
        window.electronAPI.onScanProgress((batch) => {
          files.value.push(...batch.map(sf => {
            const fileMeta = meta.files[sf.name]
            return {
              ...sf,
              duration: null,
              tags: fileMeta?.tags ?? [],
              description: fileMeta?.description ?? '',
              lastPlayed: fileMeta?.lastPlayed ?? null,
            } as AudioFile
          }))
        })

        window.electronAPI.onScanDone(() => {
          resolve()
        })

        window.electronAPI.startScan(rootDirectory.value!)
      })

      // Kick off parallel duration loading
      loadDurations()
    } finally {
      isScanning.value = false
    }
  }

  async function loadDurations() {
    const CONCURRENCY = 8
    const snapshot = [...files.value]
    let index = 0

    async function worker() {
      while (index < snapshot.length) {
        const file = snapshot[index++]
        if (file.duration === null) {
          file.duration = await window.electronAPI.getAudioDuration(file.path)
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  }

  async function saveMetadata() {
    const meta: LibraryMetadata = {
      version: 1,
      files: {},
      tags: tagStore.tagDefinitions,
      theme: Object.keys(themeStore.currentTheme).length > 0 ? themeStore.currentTheme : undefined,
    }

    // Seed with the last read state so files not yet in files.value (e.g. during
    // a partial scan) keep their saved tags instead of being silently erased.
    if (lastReadMeta) {
      Object.assign(meta.files, lastReadMeta.files)
    }

    // Overlay with the current in-memory state for every file we do have loaded.
    // Files with no data are explicitly removed so stale entries don't accumulate.
    for (const file of files.value) {
      if (file.tags.length > 0 || file.description || file.lastPlayed) {
        meta.files[file.name] = {
          tags: file.tags,
          description: file.description,
          lastPlayed: file.lastPlayed,
        }
      } else {
        delete meta.files[file.name]
      }
    }

    // Preserve rootDirectory if it exists in the stored metadata
    if (lastReadMeta && (lastReadMeta as any).rootDirectory) {
      ;(meta as any).rootDirectory = (lastReadMeta as any).rootDirectory
    }

    await window.electronAPI.writeMetadata(JSON.stringify(meta, null, 2))

    // Fire-and-forget auto-backup
    import('./settingsStore').then(({ useSettingsStore }) => {
      const settingsStore = useSettingsStore()
      window.electronAPI.backupCreate(JSON.stringify(meta, null, 2))
        .then(() => settingsStore.purgeOldBackups())
        .catch(() => {}) // non-fatal
    })
  }

  function addTagToFile(filePath: string, tag: string) {
    const file = files.value.find(f => f.path === filePath)
    if (file && !file.tags.includes(tag)) {
      file.tags.push(tag)
      saveMetadata()
    }
  }

  function removeTagFromFile(filePath: string, tag: string) {
    const file = files.value.find(f => f.path === filePath)
    if (file) {
      file.tags = file.tags.filter(t => t !== tag)
      saveMetadata()
    }
  }

  function setDescription(filePath: string, description: string) {
    const file = files.value.find(f => f.path === filePath)
    if (file) {
      file.description = description
      saveMetadata()
    }
  }

  async function deleteFile(filePath: string): Promise<{ error?: string }> {
    const result = await window.electronAPI.deleteFile(filePath)
    if (!result.success) return { error: result.error }

    files.value = files.value.filter(f => f.path !== filePath)
    if (currentFile.value?.path === filePath) {
      currentFile.value = null
      isPlaying.value = false
    }
    await saveMetadata()
    return {}
  }

  async function renameFile(oldPath: string, newName: string): Promise<{ error?: string; newPath?: string }> {
    const result = await window.electronAPI.renameFile(oldPath, newName)
    if (!result.success) return { error: result.error }

    const file = files.value.find(f => f.path === oldPath)
    if (file) {
      file.path = result.newPath!
      file.name = newName
    }
    if (currentFile.value?.path === oldPath && file) {
      currentFile.value = file
    }
    await saveMetadata()
    return { newPath: result.newPath }
  }

  function addTagFilter(tag: string) {
    if (!selectedTags.value.includes(tag)) {
      selectedTags.value = [...selectedTags.value, tag]
    }
  }

  function removeTagFilter(tag: string) {
    selectedTags.value = selectedTags.value.filter(t => t !== tag)
  }

  function addDescriptionFilter(text: string) {
    const trimmed = text.trim()
    if (trimmed && !descriptionFilters.value.includes(trimmed)) {
      descriptionFilters.value = [...descriptionFilters.value, trimmed]
    }
  }

  function removeDescriptionFilter(text: string) {
    descriptionFilters.value = descriptionFilters.value.filter(t => t !== text)
  }

  function clearAllFilters() {
    selectedTags.value = []
    descriptionFilters.value = []
  }

  async function editTag(
    oldName: string,
    newName: string,
    newColor: string,
  ): Promise<{ error?: string }> {
    const trimmed = newName.trim().toLowerCase()
    if (!trimmed) return { error: 'Tag name cannot be empty' }
    if (trimmed !== oldName && tagStore.tagDefinitions[trimmed]) {
      return { error: `Tag "${trimmed}" already exists` }
    }
    if (trimmed !== oldName) {
      tagStore.renameTag(oldName, trimmed)
      for (const file of files.value) {
        const idx = file.tags.indexOf(oldName)
        if (idx !== -1) file.tags[idx] = trimmed
      }
    }
    tagStore.setTagColor(trimmed, newColor)
    await saveMetadata()
    return {}
  }

  async function mergeTag(source: string, target: string): Promise<{ error?: string }> {
    // Guard: source cannot be uncategorized
    if (source === 'uncategorized') {
      return { error: 'Cannot merge from uncategorized tag' }
    }
    // Guard: source and target must be different
    if (source === target) {
      return { error: 'Source and target tags must be different' }
    }
    // Guard: both must exist in tagStore
    if (!tagStore.tagDefinitions[source]) {
      return { error: `Source tag "${source}" does not exist` }
    }
    if (!tagStore.tagDefinitions[target]) {
      return { error: `Target tag "${target}" does not exist` }
    }

    // For each file with source tag: add target (if absent), remove source
    for (const file of files.value) {
      if (file.tags.includes(source)) {
        if (!file.tags.includes(target)) {
          file.tags.push(target)
        }
        file.tags = file.tags.filter(t => t !== source)
      }
    }

    // Delete source tag
    tagStore.deleteTag(source)

    await saveMetadata()
    return {}
  }

  async function clearTagFromAllFiles(tagName: string) {
    for (const file of files.value) {
      file.tags = file.tags.filter(t => t !== tagName)
    }
    await saveMetadata()
  }

  function addTagToFiles(filePaths: string[], tag: string) {
    for (const file of files.value) {
      if (filePaths.includes(file.path) && !file.tags.includes(tag)) {
        file.tags.push(tag)
      }
    }
    saveMetadata()
  }

  function removeTagFromFiles(filePaths: string[], tag: string) {
    for (const file of files.value) {
      if (filePaths.includes(file.path)) {
        file.tags = file.tags.filter(t => t !== tag)
      }
    }
    saveMetadata()
  }

  function setDescriptionForFiles(filePaths: string[], description: string) {
    for (const file of files.value) {
      if (filePaths.includes(file.path)) {
        file.description = description
      }
    }
    saveMetadata()
  }

  function setSort(col: SortColumn) {
    if (sortColumn.value === col) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortColumn.value = col
      sortDirection.value = 'asc'
    }
  }

  function playFile(file: AudioFile) {
    currentFile.value = file
    isPlaying.value = true
    file.lastPlayed = new Date().toISOString()
    saveMetadata()
  }

  function stopPlayback() {
    isPlaying.value = false
  }

  return reactive({
    files,
    rootDirectory,
    searchQuery,
    filterExtension,
    filterTagged,
    isScanning,
    sortColumn,
    sortDirection,
    selectedTags,
    descriptionFilters,
    currentFile,
    isPlaying,
    filteredFiles,
    initFromPersistedDirectory,
    selectAndScanDirectory,
    rescan,
    saveMetadata,
    addTagToFile,
    removeTagFromFile,
    setDescription,
    deleteFile,
    renameFile,
    playFile,
    stopPlayback,
    addTagFilter,
    removeTagFilter,
    addDescriptionFilter,
    removeDescriptionFilter,
    clearAllFilters,
    editTag,
    mergeTag,
    clearTagFromAllFiles,
    addTagToFiles,
    removeTagFromFiles,
    setDescriptionForFiles,
    setSort,
  })
}

export function _resetLibraryStore() {
  files.value = []
  rootDirectory.value = null
  searchQuery.value = ''
  filterExtension.value = []
  filterTagged.value = 'all'
  isScanning.value = false
  sortColumn.value = 'name'
  sortDirection.value = 'asc'
  selectedTags.value = []
  descriptionFilters.value = []
  lastReadMeta = null
  currentFile.value = null
  isPlaying.value = false
}
