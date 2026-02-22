import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLibraryStore, type AudioFile } from '../src/stores/libraryStore'
import { useTagStore } from '../src/stores/tagStore'

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
  mockElectronAPI.backupCreate.mockResolvedValue({})
})

describe('mergeTag in libraryStore', () => {
  it('merges source tag into target tag', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    tagStore.createTag('percussion')
    tagStore.createTag('drums')
    library.files = [
      makeFile({ tags: ['percussion'] }),
      makeFile({ name: 'b.wav', path: '/sounds/b.wav', tags: ['drums'] }),
    ]

    const result = await library.mergeTag('percussion', 'drums')
    expect(result.error).toBeUndefined()
    expect(library.files[0].tags).toContain('drums')
    expect(library.files[0].tags).not.toContain('percussion')
  })

  it('prevents merging from uncategorized', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    tagStore.createTag('drums')
    const result = await library.mergeTag('uncategorized', 'drums')

    expect(result.error).toBe('Cannot merge from uncategorized tag')
  })

  it('prevents merging to self', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    tagStore.createTag('drums')
    const result = await library.mergeTag('drums', 'drums')

    expect(result.error).toBe('Source and target tags must be different')
  })

  it('errors if source tag does not exist', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    tagStore.createTag('drums')
    const result = await library.mergeTag('nonexistent', 'drums')

    expect(result.error).toContain('Source tag')
  })

  it('errors if target tag does not exist', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    tagStore.createTag('percussion')
    const result = await library.mergeTag('percussion', 'nonexistent')

    expect(result.error).toContain('Target tag')
  })

  it('removes source tag after merge', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    tagStore.createTag('old')
    tagStore.createTag('new')
    library.files = [makeFile({ tags: ['old'] })]

    await library.mergeTag('old', 'new')

    expect(tagStore.tagDefinitions).not.toHaveProperty('old')
  })

  it('avoids duplicates when both files have both tags', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    tagStore.createTag('percussion')
    tagStore.createTag('drums')
    library.files = [
      makeFile({ tags: ['percussion', 'drums'] }),
    ]

    await library.mergeTag('percussion', 'drums')

    expect(library.files[0].tags).toEqual(['drums'])
  })

  it('handles multiple files correctly', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    tagStore.createTag('old')
    tagStore.createTag('new')
    library.files = [
      makeFile({ tags: ['old'] }),
      makeFile({ name: 'b.wav', path: '/sounds/b.wav', tags: ['old', 'other'] }),
      makeFile({ name: 'c.wav', path: '/sounds/c.wav', tags: [] }),
    ]

    await library.mergeTag('old', 'new')

    expect(library.files[0].tags).toEqual(['new'])
    expect(library.files[1].tags).toContain('new')
    expect(library.files[1].tags).not.toContain('old')
    expect(library.files[2].tags).toEqual([])
  })

  it('calls saveMetadata after merge', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    tagStore.createTag('old')
    tagStore.createTag('new')
    library.files = [makeFile({ tags: ['old'] })]

    await library.mergeTag('old', 'new')

    expect(mockElectronAPI.writeMetadata).toHaveBeenCalled()
  })

  it('preserves other tags on file after merge', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    tagStore.createTag('percussion')
    tagStore.createTag('drums')
    tagStore.createTag('other')
    library.files = [
      makeFile({ tags: ['percussion', 'other'] }),
    ]

    await library.mergeTag('percussion', 'drums')

    expect(library.files[0].tags).toContain('drums')
    expect(library.files[0].tags).toContain('other')
    expect(library.files[0].tags).not.toContain('percussion')
  })
})
