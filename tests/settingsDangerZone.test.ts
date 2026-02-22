import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLibraryStore, _resetLibraryStore, type AudioFile } from '../src/stores/libraryStore'
import { useTagStore, _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'

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
  _resetLibraryStore()
  _resetTagStore()
  _resetThemeStore()
  vi.resetAllMocks()
  mockElectronAPI.writeMetadata.mockResolvedValue(undefined)
  mockElectronAPI.backupCreate.mockResolvedValue({})
})

describe('Danger Zone: clear all tags', () => {
  it('removes tags from all files', async () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav', tags: ['percussion', 'heavy'] }),
      makeFile({ path: '/b.wav', name: 'b.wav', tags: ['ambient'] }),
      makeFile({ path: '/c.wav', name: 'c.wav', tags: [] }),
    ]

    for (const file of library.files) {
      file.tags = []
    }
    await library.saveMetadata()

    expect(library.files[0].tags).toEqual([])
    expect(library.files[1].tags).toEqual([])
    expect(library.files[2].tags).toEqual([])
    expect(mockElectronAPI.writeMetadata).toHaveBeenCalled()
  })
})

describe('Danger Zone: delete all tag definitions', () => {
  it('removes all tags except uncategorized', () => {
    const tagStore = useTagStore()
    tagStore.createTag('percussion')
    tagStore.createTag('ambient')
    tagStore.createTag('metal')

    const allTags = Object.keys(tagStore.tagDefinitions).filter(t => t !== 'uncategorized')
    for (const tag of allTags) {
      tagStore.deleteTag(tag)
    }

    expect(Object.keys(tagStore.tagDefinitions)).toEqual(['uncategorized'])
  })

  it('clears tags from files and deletes definitions', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('percussion')

    library.files = [
      makeFile({ path: '/a.wav', tags: ['percussion'] }),
    ]

    // Clear tags from files
    for (const file of library.files) {
      file.tags = []
    }
    // Delete definitions
    const allTags = Object.keys(tagStore.tagDefinitions).filter(t => t !== 'uncategorized')
    for (const tag of allTags) {
      tagStore.deleteTag(tag)
    }
    await library.saveMetadata()

    expect(library.files[0].tags).toEqual([])
    expect(tagStore.tagDefinitions).not.toHaveProperty('percussion')
  })
})

describe('Danger Zone: clear all descriptions', () => {
  it('removes descriptions from all files', async () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav', description: 'Punchy kick' }),
      makeFile({ path: '/b.wav', name: 'b.wav', description: 'Soft pad' }),
      makeFile({ path: '/c.wav', name: 'c.wav', description: '' }),
    ]

    for (const file of library.files) {
      file.description = ''
    }
    await library.saveMetadata()

    expect(library.files[0].description).toBe('')
    expect(library.files[1].description).toBe('')
    expect(mockElectronAPI.writeMetadata).toHaveBeenCalled()
  })
})

describe('Danger Zone: reset all metadata', () => {
  it('clears tags, descriptions, and playback history', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('percussion')

    library.files = [
      makeFile({
        path: '/a.wav',
        tags: ['percussion'],
        description: 'Kick sample',
        lastPlayed: '2026-01-01T00:00:00Z',
      }),
    ]

    // Reset all
    for (const file of library.files) {
      file.tags = []
      file.description = ''
      file.lastPlayed = null
    }
    const allTags = Object.keys(tagStore.tagDefinitions).filter(t => t !== 'uncategorized')
    for (const tag of allTags) {
      tagStore.deleteTag(tag)
    }
    await library.saveMetadata()

    expect(library.files[0].tags).toEqual([])
    expect(library.files[0].description).toBe('')
    expect(library.files[0].lastPlayed).toBeNull()
    expect(Object.keys(tagStore.tagDefinitions)).toEqual(['uncategorized'])
  })

  it('does not remove files from the array (only metadata)', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav' }),
      makeFile({ path: '/b.wav', name: 'b.wav' }),
    ]

    for (const file of library.files) {
      file.tags = []
      file.description = ''
      file.lastPlayed = null
    }

    expect(library.files).toHaveLength(2)
  })
})
