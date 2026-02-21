import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTagStore } from './tagStore'

export interface AudioFile {
  path: string
  name: string
  extension: string
  size: number
  duration: number | null
  tags: string[]
  description: string
  lastPlayed: string | null
}

export interface LibraryMetadata {
  version: number
  files: Record<string, {
    tags: string[]
    description: string
    lastPlayed: string | null
  }>
  tags: Record<string, { color: string }>
}

export const useLibraryStore = defineStore('library', () => {
  const files = ref<AudioFile[]>([])
  const rootDirectory = ref<string | null>(null)
  const searchQuery = ref('')
  const filterExtension = ref<string | null>(null)
  const filterTagged = ref<'all' | 'tagged' | 'untagged'>('all')
  const isScanning = ref(false)

  // Current playback
  const currentFile = ref<AudioFile | null>(null)
  const isPlaying = ref(false)

  const filteredFiles = computed(() => {
    let result = files.value

    // Extension filter
    if (filterExtension.value) {
      result = result.filter(f => f.extension === filterExtension.value)
    }

    // Tagged filter
    if (filterTagged.value === 'tagged') {
      result = result.filter(f => f.tags.length > 0)
    } else if (filterTagged.value === 'untagged') {
      result = result.filter(f => f.tags.length === 0)
    }

    // Search query
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      const tagQueries: string[] = []
      const textQueries: string[] = []

      q.split(/\s+/).forEach(token => {
        if (token.startsWith('#')) {
          tagQueries.push(token.slice(1))
        } else {
          textQueries.push(token)
        }
      })

      result = result.filter(file => {
        const matchesTags = tagQueries.every(tq =>
          file.tags.some(tag => tag.toLowerCase().includes(tq))
        )
        const matchesText = textQueries.every(tq =>
          file.name.toLowerCase().includes(tq) ||
          file.description.toLowerCase().includes(tq)
        )
        return matchesTags && matchesText
      })
    }

    return result
  })

  async function selectAndScanDirectory() {
    const dir = await window.electronAPI.selectDirectory()
    if (!dir) return

    rootDirectory.value = dir
    await rescan()
  }

  async function rescan() {
    if (!rootDirectory.value) return

    isScanning.value = true
    try {
      const scannedFiles = await window.electronAPI.scanDirectory(rootDirectory.value)
      const metaRaw = await window.electronAPI.readMetadata()
      const meta: LibraryMetadata = JSON.parse(metaRaw)

      // Load tag definitions into tag store
      const tagStore = useTagStore()
      tagStore.loadTags(meta.tags)

      // Merge scanned files with metadata
      files.value = scannedFiles.map(sf => {
        const fileMeta = meta.files[sf.path]
        return {
          ...sf,
          duration: null, // Loaded lazily
          tags: fileMeta?.tags ?? [],
          description: fileMeta?.description ?? '',
          lastPlayed: fileMeta?.lastPlayed ?? null,
        }
      })

      // Kick off async duration loading
      loadDurations()
    } finally {
      isScanning.value = false
    }
  }

  async function loadDurations() {
    for (const file of files.value) {
      if (file.duration === null) {
        file.duration = await window.electronAPI.getAudioDuration(file.path)
      }
    }
  }

  async function saveMetadata() {
    const tagStore = useTagStore()
    const meta: LibraryMetadata = {
      version: 1,
      files: {},
      tags: tagStore.tagDefinitions,
    }

    for (const file of files.value) {
      if (file.tags.length > 0 || file.description || file.lastPlayed) {
        meta.files[file.path] = {
          tags: file.tags,
          description: file.description,
          lastPlayed: file.lastPlayed,
        }
      }
    }

    await window.electronAPI.writeMetadata(JSON.stringify(meta, null, 2))
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

  function playFile(file: AudioFile) {
    currentFile.value = file
    isPlaying.value = true
    file.lastPlayed = new Date().toISOString()
    saveMetadata()
  }

  function stopPlayback() {
    isPlaying.value = false
  }

  return {
    files,
    rootDirectory,
    searchQuery,
    filterExtension,
    filterTagged,
    isScanning,
    currentFile,
    isPlaying,
    filteredFiles,
    selectAndScanDirectory,
    rescan,
    saveMetadata,
    addTagToFile,
    removeTagFromFile,
    setDescription,
    playFile,
    stopPlayback,
  }
})
