import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLibraryStore, type AudioFile, type SortColumn } from '../src/stores/libraryStore'
import { useTagStore } from '../src/stores/tagStore'

// Mock window.electronAPI
const mockElectronAPI = {
  selectDirectory: vi.fn(),
  startScan: vi.fn(),
  onScanProgress: vi.fn(),
  onScanDone: vi.fn(),
  removeScanListeners: vi.fn(),
  readMetadata: vi.fn(),
  writeMetadata: vi.fn(),
  getAudioDuration: vi.fn(),
  showInFinder: vi.fn(),
  copyPath: vi.fn(),
  showContextMenu: vi.fn(),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
  onContextMenuPlay: vi.fn(),
  onContextMenuAddTag: vi.fn(),
  onContextMenuEditDescription: vi.fn(),
  onContextMenuDelete: vi.fn(),
  onContextMenuRename: vi.fn(),
  getRootDirectory: vi.fn(),
  setRootDirectory: vi.fn(),
  getStorePath: vi.fn(),
  getStoreData: vi.fn(),
  clearTagData: vi.fn(),
  toggleDevTools: vi.fn(),
  backupCreate: vi.fn(),
  backupList: vi.fn(),
  backupDelete: vi.fn(),
  backupRestore: vi.fn(),
  saveFileDialog: vi.fn(),
  selectFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}

vi.stubGlobal('window', { electronAPI: mockElectronAPI })

function makeFile(overrides: Partial<AudioFile> = {}): AudioFile {
  return {
    path: '/sounds/test.wav',
    name: 'test.wav',
    extension: '.wav',
    size: 1024,
    duration: 2.5,
    tags: [],
    description: '',
    lastPlayed: null,
    createdAt: null,
    modifiedAt: null,
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  mockElectronAPI.writeMetadata.mockResolvedValue(undefined)
  mockElectronAPI.deleteFile.mockResolvedValue({ success: true })
  mockElectronAPI.renameFile.mockResolvedValue({ success: true, newPath: '/sounds/renamed.wav' })
  mockElectronAPI.backupCreate.mockResolvedValue({})
  mockElectronAPI.backupList.mockResolvedValue([])
})

describe('libraryStore', () => {
  describe('filteredFiles', () => {
    it('returns all files when no filters active', () => {
      const store = useLibraryStore()
      store.files = [makeFile(), makeFile({ path: '/b.mp3', name: 'b.mp3' })]

      expect(store.filteredFiles).toHaveLength(2)
    })

    it('filters by single extension', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ extension: '.wav' }),
        makeFile({ path: '/b.mp3', name: 'b.mp3', extension: '.mp3' }),
        makeFile({ path: '/c.flac', name: 'c.flac', extension: '.flac' }),
      ]
      store.filterExtension = ['.mp3']

      expect(store.filteredFiles).toHaveLength(1)
      expect(store.filteredFiles[0].extension).toBe('.mp3')
    })

    it('filters by multiple extensions', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ extension: '.wav' }),
        makeFile({ path: '/b.mp3', name: 'b.mp3', extension: '.mp3' }),
        makeFile({ path: '/c.flac', name: 'c.flac', extension: '.flac' }),
      ]
      store.filterExtension = ['.mp3', '.flac']

      expect(store.filteredFiles).toHaveLength(2)
      expect(store.filteredFiles[0].extension).toBe('.mp3')
      expect(store.filteredFiles[1].extension).toBe('.flac')
    })

    it('shows all files when no extensions are selected', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ extension: '.wav' }),
        makeFile({ path: '/b.mp3', name: 'b.mp3', extension: '.mp3' }),
      ]
      store.filterExtension = []

      expect(store.filteredFiles).toHaveLength(2)
    })

    it('filters tagged files', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ tags: ['impact'] }),
        makeFile({ path: '/b.wav', name: 'b.wav', tags: [] }),
      ]
      store.filterTagged = 'tagged'

      expect(store.filteredFiles).toHaveLength(1)
      expect(store.filteredFiles[0].tags).toContain('impact')
    })

    it('filters untagged files', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ tags: ['impact'] }),
        makeFile({ path: '/b.wav', name: 'b.wav', tags: [] }),
      ]
      store.filterTagged = 'untagged'

      expect(store.filteredFiles).toHaveLength(1)
      expect(store.filteredFiles[0].tags).toHaveLength(0)
    })

    it('filters by description chip matching filename', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'kick_hard.wav' }),
        makeFile({ path: '/b.wav', name: 'snare_soft.wav' }),
      ]
      store.addDescriptionFilter('kick')

      expect(store.filteredFiles).toHaveLength(1)
      expect(store.filteredFiles[0].name).toBe('kick_hard.wav')
    })

    it('filters by description chip matching description field', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'a.wav', description: 'deep bass hit' }),
        makeFile({ path: '/b.wav', name: 'b.wav', description: 'high pitched tone' }),
      ]
      store.addDescriptionFilter('bass')

      expect(store.filteredFiles).toHaveLength(1)
      expect(store.filteredFiles[0].description).toBe('deep bass hit')
    })

    it('filters by tag chip', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ tags: ['impact', 'metal'] }),
        makeFile({ path: '/b.wav', name: 'b.wav', tags: ['ambient'] }),
      ]
      store.addTagFilter('metal')

      expect(store.filteredFiles).toHaveLength(1)
      expect(store.filteredFiles[0].tags).toContain('metal')
    })

    it('combines tag chip and description chip (AND)', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'click_01.wav', tags: ['ui'] }),
        makeFile({ path: '/b.wav', name: 'click_02.wav', tags: ['foley'] }),
        makeFile({ path: '/c.wav', name: 'boom.wav', tags: ['ui'] }),
      ]
      store.addTagFilter('ui')
      store.addDescriptionFilter('click')

      expect(store.filteredFiles).toHaveLength(1)
      expect(store.filteredFiles[0].name).toBe('click_01.wav')
    })

    it('multiple description chips are AND-ed', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'impact_metal_01.wav' }),
        makeFile({ path: '/b.wav', name: 'impact_wood_01.wav' }),
      ]
      store.addDescriptionFilter('impact')
      store.addDescriptionFilter('metal')

      expect(store.filteredFiles).toHaveLength(1)
      expect(store.filteredFiles[0].name).toBe('impact_metal_01.wav')
    })

    it('description chip filter is case insensitive', () => {
      const store = useLibraryStore()
      store.files = [makeFile({ name: 'Kick_HARD.wav' })]
      store.addDescriptionFilter('kick')

      expect(store.filteredFiles).toHaveLength(1)
    })

    it('multiple tag chips require file to have all tags', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'a.wav', tags: ['impact', 'metal'] }),
        makeFile({ path: '/b.wav', name: 'b.wav', tags: ['impact'] }),
      ]
      store.addTagFilter('impact')
      store.addTagFilter('metal')

      expect(store.filteredFiles).toHaveLength(1)
      expect(store.filteredFiles[0].name).toBe('a.wav')
    })
  })

  describe('chip filter functions', () => {
    it('addTagFilter adds a tag to selectedTags', () => {
      const store = useLibraryStore()
      store.addTagFilter('impact')
      expect(store.selectedTags).toContain('impact')
    })

    it('addTagFilter ignores duplicates', () => {
      const store = useLibraryStore()
      store.addTagFilter('impact')
      store.addTagFilter('impact')
      expect(store.selectedTags).toHaveLength(1)
    })

    it('removeTagFilter removes a tag from selectedTags', () => {
      const store = useLibraryStore()
      store.addTagFilter('impact')
      store.addTagFilter('metal')
      store.removeTagFilter('impact')
      expect(store.selectedTags).toEqual(['metal'])
    })

    it('removeTagFilter is a no-op when tag is not active', () => {
      const store = useLibraryStore()
      store.removeTagFilter('nope')
      expect(store.selectedTags).toHaveLength(0)
    })

    it('addDescriptionFilter adds trimmed text', () => {
      const store = useLibraryStore()
      store.addDescriptionFilter('  the little horn  ')
      expect(store.descriptionFilters).toContain('the little horn')
    })

    it('addDescriptionFilter ignores empty/whitespace-only strings', () => {
      const store = useLibraryStore()
      store.addDescriptionFilter('   ')
      store.addDescriptionFilter('')
      expect(store.descriptionFilters).toHaveLength(0)
    })

    it('addDescriptionFilter ignores duplicates', () => {
      const store = useLibraryStore()
      store.addDescriptionFilter('bass hit')
      store.addDescriptionFilter('bass hit')
      expect(store.descriptionFilters).toHaveLength(1)
    })

    it('removeDescriptionFilter removes a description chip', () => {
      const store = useLibraryStore()
      store.addDescriptionFilter('kick')
      store.addDescriptionFilter('bass')
      store.removeDescriptionFilter('kick')
      expect(store.descriptionFilters).toEqual(['bass'])
    })

    it('clearAllFilters resets both selectedTags and descriptionFilters', () => {
      const store = useLibraryStore()
      store.addTagFilter('impact')
      store.addDescriptionFilter('kick')
      store.clearAllFilters()
      expect(store.selectedTags).toHaveLength(0)
      expect(store.descriptionFilters).toHaveLength(0)
    })

    it('no filters active → all files shown', () => {
      const store = useLibraryStore()
      store.files = [makeFile(), makeFile({ path: '/b.wav', name: 'b.wav' })]
      expect(store.filteredFiles).toHaveLength(2)
    })
  })

  describe('tag operations', () => {
    it('adds a tag to a file', () => {
      const store = useLibraryStore()
      const file = makeFile()
      store.files = [file]

      store.addTagToFile(file.path, 'impact')

      expect(file.tags).toContain('impact')
    })

    it('does not add duplicate tags', () => {
      const store = useLibraryStore()
      const file = makeFile({ tags: ['impact'] })
      store.files = [file]

      store.addTagToFile(file.path, 'impact')

      expect(file.tags).toEqual(['impact'])
    })

    it('removes a tag from a file', () => {
      const store = useLibraryStore()
      const file = makeFile({ tags: ['impact', 'metal'] })
      store.files = [file]

      store.removeTagFromFile(file.path, 'impact')

      expect(file.tags).toEqual(['metal'])
    })

    it('handles removing tag from nonexistent file', () => {
      const store = useLibraryStore()
      store.files = []

      // Should not throw
      store.removeTagFromFile('/nope.wav', 'tag')
    })
  })

  describe('description', () => {
    it('sets a description on a file', () => {
      const store = useLibraryStore()
      const file = makeFile()
      store.files = [file]

      store.setDescription(file.path, 'A nice kick drum')

      expect(file.description).toBe('A nice kick drum')
    })
  })

  describe('playback', () => {
    it('sets current file and playing state', () => {
      const store = useLibraryStore()
      const file = makeFile()
      store.files = [file]

      store.playFile(file)

      expect(store.currentFile?.path).toBe(file.path)
      expect(store.isPlaying).toBe(true)
      expect(file.lastPlayed).toBeTruthy()
    })

    it('stops playback', () => {
      const store = useLibraryStore()
      store.isPlaying = true

      store.stopPlayback()

      expect(store.isPlaying).toBe(false)
    })
  })

  describe('deleteFile', () => {
    it('removes the file from the list on success', async () => {
      const store = useLibraryStore()
      const file = makeFile()
      store.files = [file]

      const result = await store.deleteFile(file.path)

      expect(result.error).toBeUndefined()
      expect(store.files).toHaveLength(0)
    })

    it('stops playback and clears currentFile when deleting the active track', async () => {
      const store = useLibraryStore()
      const file = makeFile()
      store.files = [file]
      store.currentFile = file
      store.isPlaying = true

      await store.deleteFile(file.path)

      expect(store.currentFile).toBeNull()
      expect(store.isPlaying).toBe(false)
    })

    it('does not affect playback when deleting a non-active file', async () => {
      const store = useLibraryStore()
      const active = makeFile({ path: '/sounds/active.wav', name: 'active.wav' })
      const other = makeFile({ path: '/sounds/other.wav', name: 'other.wav' })
      store.files = [active, other]
      store.currentFile = active
      store.isPlaying = true

      await store.deleteFile(other.path)

      expect(store.currentFile?.path).toBe(active.path)
      expect(store.isPlaying).toBe(true)
      expect(store.files).toHaveLength(1)
    })

    it('returns error and keeps file in list on failure', async () => {
      const store = useLibraryStore()
      const file = makeFile()
      store.files = [file]
      mockElectronAPI.deleteFile.mockResolvedValue({ success: false, error: 'Permission denied' })

      const result = await store.deleteFile(file.path)

      expect(result.error).toBe('Permission denied')
      expect(store.files).toHaveLength(1)
    })
  })

  describe('renameFile', () => {
    it('updates path and name in the files list', async () => {
      const store = useLibraryStore()
      const file = makeFile({ path: '/sounds/kick.wav', name: 'kick.wav' })
      store.files = [file]
      mockElectronAPI.renameFile.mockResolvedValue({ success: true, newPath: '/sounds/kick_v2.wav' })

      const result = await store.renameFile('/sounds/kick.wav', 'kick_v2.wav')

      expect(result.error).toBeUndefined()
      expect(result.newPath).toBe('/sounds/kick_v2.wav')
      expect(store.files[0].path).toBe('/sounds/kick_v2.wav')
      expect(store.files[0].name).toBe('kick_v2.wav')
    })

    it('tags survive rename (saved under new name)', async () => {
      const store = useLibraryStore()
      const file = makeFile({ path: '/sounds/kick.wav', name: 'kick.wav', tags: ['impact'] })
      store.files = [file]
      mockElectronAPI.renameFile.mockResolvedValue({ success: true, newPath: '/sounds/kick_v2.wav' })

      await store.renameFile('/sounds/kick.wav', 'kick_v2.wav')
      await store.saveMetadata()

      const saved = JSON.parse(mockElectronAPI.writeMetadata.mock.calls[0][0])
      expect(saved.files['kick_v2.wav']).toBeDefined()
      expect(saved.files['kick_v2.wav'].tags).toEqual(['impact'])
      expect(saved.files['kick.wav']).toBeUndefined()
    })

    it('updates currentFile reference when renaming the active track', async () => {
      const store = useLibraryStore()
      const file = makeFile({ path: '/sounds/kick.wav', name: 'kick.wav' })
      store.files = [file]
      store.currentFile = file
      mockElectronAPI.renameFile.mockResolvedValue({ success: true, newPath: '/sounds/kick_v2.wav' })

      await store.renameFile('/sounds/kick.wav', 'kick_v2.wav')

      expect(store.currentFile?.path).toBe('/sounds/kick_v2.wav')
      expect(store.currentFile?.name).toBe('kick_v2.wav')
    })

    it('returns error and leaves file unchanged on failure', async () => {
      const store = useLibraryStore()
      const file = makeFile({ path: '/sounds/kick.wav', name: 'kick.wav' })
      store.files = [file]
      mockElectronAPI.renameFile.mockResolvedValue({ success: false, error: 'File in use' })

      const result = await store.renameFile('/sounds/kick.wav', 'kick_v2.wav')

      expect(result.error).toBe('File in use')
      expect(store.files[0].name).toBe('kick.wav')
      expect(store.files[0].path).toBe('/sounds/kick.wav')
    })
  })

  describe('saveMetadata', () => {
    it('saves files with tags/description to metadata', async () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ tags: ['impact'], description: 'A hit' }),
        makeFile({ path: '/b.wav', name: 'b.wav', tags: [], description: '' }),
      ]

      await store.saveMetadata()

      expect(mockElectronAPI.writeMetadata).toHaveBeenCalledOnce()
      const saved = JSON.parse(mockElectronAPI.writeMetadata.mock.calls[0][0])
      expect(saved.version).toBe(1)
      expect(saved.files['test.wav']).toBeDefined()
      // File with no tags/description should not be saved
      expect(saved.files['b.wav']).toBeUndefined()
    })

    it('keys tags by file.name, not file.path', async () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/library/deep/kick_01.wav', name: 'kick_01.wav', tags: ['impact'] }),
      ]

      await store.saveMetadata()

      const saved = JSON.parse(mockElectronAPI.writeMetadata.mock.calls[0][0])
      // Name is the key
      expect(saved.files['kick_01.wav']).toBeDefined()
      expect(saved.files['kick_01.wav'].tags).toEqual(['impact'])
      // Path is NOT used as a key
      expect(saved.files['/library/deep/kick_01.wav']).toBeUndefined()
    })

    it('preserves tags for files not yet loaded during a partial scan', async () => {
      // Regression: if saveMetadata() is called while files.value is only partially
      // populated (e.g. user clicks a file mid-scan), files not yet arrived in batches
      // must not lose their saved tags on the next restart.
      const store = useLibraryStore()

      // Simulate a rescan having read metadata that includes two tagged files,
      // but only one has arrived in files.value so far.
      mockElectronAPI.readMetadata.mockResolvedValue(JSON.stringify({
        version: 1,
        files: {
          'kick.wav':  { tags: ['impact'], description: '', lastPlayed: null },
          'snare.wav': { tags: ['perc'],   description: '', lastPlayed: null },
        },
        tags: {},
      }))
      mockElectronAPI.onScanProgress.mockImplementation(() => {})
      mockElectronAPI.onScanDone.mockImplementation(() => {})
      mockElectronAPI.startScan.mockImplementation(() => {
        // Don't fire any progress/done — simulate scan still in flight
      })
      store.rootDirectory = '/sounds'

      // Start rescan and flush one microtask tick so readMetadata resolves
      // and lastReadMeta is stored — but the scan itself never completes.
      const scanPromise = store.rescan()
      await new Promise(r => setTimeout(r, 0))

      // Only kick.wav has loaded into files.value so far
      store.files = [makeFile({ name: 'kick.wav', tags: ['impact'] })]

      // User plays kick.wav mid-scan → triggers saveMetadata()
      await store.saveMetadata()

      const saved = JSON.parse(mockElectronAPI.writeMetadata.mock.calls[0][0])

      // kick.wav should be present (it's in files.value)
      expect(saved.files['kick.wav']).toBeDefined()
      expect(saved.files['kick.wav'].tags).toEqual(['impact'])

      // snare.wav is NOT yet in files.value but was in lastReadMeta — must not be erased
      expect(saved.files['snare.wav']).toBeDefined()
      expect(saved.files['snare.wav'].tags).toEqual(['perc'])

      // Clean up the dangling scan promise
      scanPromise.catch(() => {})
    })
  })

  describe('editTag', () => {
    it('renames the tag in tagDefinitions and updates all file tags', async () => {
      const store = useLibraryStore()
      const tagStore = useTagStore()
      tagStore.createTag('impact', '#ff0000')
      store.files = [
        makeFile({ name: 'a.wav', path: '/a.wav', tags: ['impact'] }),
        makeFile({ name: 'b.wav', path: '/b.wav', tags: ['impact', 'metal'] }),
        makeFile({ name: 'c.wav', path: '/c.wav', tags: ['metal'] }),
      ]

      const result = await store.editTag('impact', 'kick', '#ff0000')

      expect(result.error).toBeUndefined()
      expect(tagStore.tagDefinitions).not.toHaveProperty('impact')
      expect(tagStore.tagDefinitions).toHaveProperty('kick')
      expect(store.files[0].tags).toContain('kick')
      expect(store.files[1].tags).toContain('kick')
      expect(store.files[2].tags).not.toContain('kick')
    })

    it('changes the tag color', async () => {
      const store = useLibraryStore()
      const tagStore = useTagStore()
      tagStore.createTag('ambient', '#ffffff')
      store.files = []

      await store.editTag('ambient', 'ambient', '#4da6ff')

      expect(tagStore.tagDefinitions.ambient.color).toBe('#4da6ff')
    })

    it('returns error when new name is empty', async () => {
      const store = useLibraryStore()
      const tagStore = useTagStore()
      tagStore.createTag('impact', '#ff0000')

      const result = await store.editTag('impact', '  ', '#ff0000')

      expect(result.error).toBeTruthy()
      expect(tagStore.tagDefinitions).toHaveProperty('impact')
    })

    it('returns error when new name is already taken', async () => {
      const store = useLibraryStore()
      const tagStore = useTagStore()
      tagStore.createTag('impact', '#ff0000')
      tagStore.createTag('metal', '#888888')

      const result = await store.editTag('impact', 'metal', '#ff0000')

      expect(result.error).toBeTruthy()
      expect(tagStore.tagDefinitions).toHaveProperty('impact')
    })

    it('does not error when new name is the same as old name (color-only change)', async () => {
      const store = useLibraryStore()
      const tagStore = useTagStore()
      tagStore.createTag('impact', '#ff0000')
      store.files = []

      const result = await store.editTag('impact', 'impact', '#00ff00')

      expect(result.error).toBeUndefined()
      expect(tagStore.tagDefinitions.impact.color).toBe('#00ff00')
    })

    it('saves metadata after a successful edit', async () => {
      const store = useLibraryStore()
      const tagStore = useTagStore()
      tagStore.createTag('impact', '#ff0000')
      store.files = []

      await store.editTag('impact', 'kick', '#ff0000')

      expect(mockElectronAPI.writeMetadata).toHaveBeenCalled()
    })
  })

  describe('clearTagFromAllFiles', () => {
    it('removes the tag from every file that has it', async () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'a.wav', path: '/a.wav', tags: ['impact', 'metal'] }),
        makeFile({ name: 'b.wav', path: '/b.wav', tags: ['impact'] }),
        makeFile({ name: 'c.wav', path: '/c.wav', tags: ['metal'] }),
      ]

      await store.clearTagFromAllFiles('impact')

      expect(store.files[0].tags).toEqual(['metal'])
      expect(store.files[1].tags).toEqual([])
      expect(store.files[2].tags).toEqual(['metal'])
    })

    it('saves metadata after clearing', async () => {
      const store = useLibraryStore()
      store.files = [makeFile({ tags: ['impact'] })]

      await store.clearTagFromAllFiles('impact')

      expect(mockElectronAPI.writeMetadata).toHaveBeenCalled()
    })

    it('is a no-op when no files have the tag', async () => {
      const store = useLibraryStore()
      store.files = [makeFile({ tags: ['metal'] })]

      await store.clearTagFromAllFiles('impact')

      expect(store.files[0].tags).toEqual(['metal'])
    })
  })

  describe('sorting', () => {
    it('sorts by name ascending by default', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'zebra.wav', path: '/z.wav' }),
        makeFile({ name: 'alpha.wav', path: '/a.wav' }),
        makeFile({ name: 'mango.wav', path: '/m.wav' }),
      ]

      expect(store.filteredFiles.map(f => f.name)).toEqual(['alpha.wav', 'mango.wav', 'zebra.wav'])
    })

    it('toggles to descending when the same column is clicked again', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'zebra.wav', path: '/z.wav' }),
        makeFile({ name: 'alpha.wav', path: '/a.wav' }),
      ]

      store.setSort('name') // already 'name' asc → becomes desc
      expect(store.sortDirection).toBe('desc')
      expect(store.filteredFiles[0].name).toBe('zebra.wav')
    })

    it('resets to ascending when switching to a different column', () => {
      const store = useLibraryStore()
      store.setSort('name') // becomes desc
      store.setSort('duration') // new column → always starts asc

      expect(store.sortColumn).toBe('duration')
      expect(store.sortDirection).toBe('asc')
    })

    it('sorts by duration ascending with nulls last', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'long.wav',  path: '/long.wav',  duration: 10 }),
        makeFile({ name: 'null.wav',  path: '/null.wav',  duration: null }),
        makeFile({ name: 'short.wav', path: '/short.wav', duration: 2 }),
      ]
      store.setSort('duration')

      expect(store.filteredFiles.map(f => f.name)).toEqual(['short.wav', 'long.wav', 'null.wav'])
    })

    it('sorts by duration descending with nulls last', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'long.wav',  path: '/long.wav',  duration: 10 }),
        makeFile({ name: 'null.wav',  path: '/null.wav',  duration: null }),
        makeFile({ name: 'short.wav', path: '/short.wav', duration: 2 }),
      ]
      store.setSort('duration')
      store.setSort('duration') // desc

      expect(store.filteredFiles.map(f => f.name)).toEqual(['long.wav', 'short.wav', 'null.wav'])
    })

    it('sorts by file type (extension) ascending', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'a.wav',  path: '/a.wav',  extension: '.wav' }),
        makeFile({ name: 'b.mp3',  path: '/b.mp3',  extension: '.mp3' }),
        makeFile({ name: 'c.flac', path: '/c.flac', extension: '.flac' }),
      ]
      store.setSort('type')

      expect(store.filteredFiles.map(f => f.extension)).toEqual(['.flac', '.mp3', '.wav'])
    })

    it('sorts by tag count ascending', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'many.wav', path: '/many.wav', tags: ['a', 'b', 'c'] }),
        makeFile({ name: 'none.wav', path: '/none.wav', tags: [] }),
        makeFile({ name: 'one.wav',  path: '/one.wav',  tags: ['x'] }),
      ]
      store.setSort('tags')

      expect(store.filteredFiles.map(f => f.name)).toEqual(['none.wav', 'one.wav', 'many.wav'])
    })

    it('sorts by createdAt ascending', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'new.wav', path: '/new.wav', createdAt: '2026-02-21T00:00:00Z' }),
        makeFile({ name: 'old.wav', path: '/old.wav', createdAt: '2024-01-01T00:00:00Z' }),
      ]
      store.setSort('createdAt')

      expect(store.filteredFiles[0].name).toBe('old.wav')
      expect(store.filteredFiles[1].name).toBe('new.wav')
    })

    it('sorts by createdAt descending', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'old.wav', path: '/old.wav', createdAt: '2024-01-01T00:00:00Z' }),
        makeFile({ name: 'new.wav', path: '/new.wav', createdAt: '2026-02-21T00:00:00Z' }),
      ]
      store.setSort('createdAt')
      store.setSort('createdAt') // desc

      expect(store.filteredFiles[0].name).toBe('new.wav')
      expect(store.filteredFiles[1].name).toBe('old.wav')
    })

    it('sorts by modifiedAt ascending', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'new.wav', path: '/new.wav', modifiedAt: '2026-02-21T00:00:00Z' }),
        makeFile({ name: 'old.wav', path: '/old.wav', modifiedAt: '2024-01-01T00:00:00Z' }),
      ]
      store.setSort('modifiedAt')

      expect(store.filteredFiles[0].name).toBe('old.wav')
      expect(store.filteredFiles[1].name).toBe('new.wav')
    })

    it('sorts by modifiedAt descending with nulls last', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'old.wav',  path: '/old.wav',  modifiedAt: '2024-01-01T00:00:00Z' }),
        makeFile({ name: 'null.wav', path: '/null.wav', modifiedAt: null }),
        makeFile({ name: 'new.wav',  path: '/new.wav',  modifiedAt: '2026-02-21T00:00:00Z' }),
      ]
      store.setSort('modifiedAt')
      store.setSort('modifiedAt') // desc

      expect(store.filteredFiles.map(f => f.name)).toEqual(['new.wav', 'old.wav', 'null.wav'])
    })

    it('sort is applied after all filters', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'zebra_ui.wav',  path: '/z.wav', tags: ['ui'] }),
        makeFile({ name: 'alpha_ui.wav',  path: '/a.wav', tags: ['ui'] }),
        makeFile({ name: 'middle_sfx.wav', path: '/m.wav', tags: ['sfx'] }),
      ]
      store.addTagFilter('ui')
      // default sort is name asc

      expect(store.filteredFiles.map(f => f.name)).toEqual(['alpha_ui.wav', 'zebra_ui.wav'])
    })

    it('setSort with a non-SortColumn type does nothing unexpected', () => {
      const store = useLibraryStore()
      const before = store.sortColumn

      // calling with same column twice → toggles direction then back
      store.setSort('name' as SortColumn)
      store.setSort('name' as SortColumn)

      expect(store.sortColumn).toBe(before)
      expect(store.sortDirection).toBe('asc')
    })
  })
})
