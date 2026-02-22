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

describe('addTagToFiles (batch)', () => {
  it('adds tag to multiple files by path', () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('percussion')

    library.files = [
      makeFile({ path: '/a.wav', name: 'a.wav' }),
      makeFile({ path: '/b.wav', name: 'b.wav' }),
      makeFile({ path: '/c.wav', name: 'c.wav' }),
    ]

    library.addTagToFiles(['/a.wav', '/b.wav'], 'percussion')

    expect(library.files[0].tags).toContain('percussion')
    expect(library.files[1].tags).toContain('percussion')
    expect(library.files[2].tags).not.toContain('percussion')
  })

  it('does not duplicate tags', () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('percussion')

    library.files = [
      makeFile({ path: '/a.wav', tags: ['percussion'] }),
    ]

    library.addTagToFiles(['/a.wav'], 'percussion')

    expect(library.files[0].tags).toEqual(['percussion'])
  })

  it('calls saveMetadata after batch add', () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('test')

    library.files = [makeFile({ path: '/a.wav' })]
    library.addTagToFiles(['/a.wav'], 'test')

    expect(mockElectronAPI.writeMetadata).toHaveBeenCalled()
  })

  it('handles empty path list gracefully', () => {
    const library = useLibraryStore()
    library.files = [makeFile()]

    library.addTagToFiles([], 'test')

    expect(library.files[0].tags).toEqual([])
  })
})

describe('removeTagFromFiles (batch)', () => {
  it('removes tag from multiple files', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav', tags: ['percussion', 'other'] }),
      makeFile({ path: '/b.wav', name: 'b.wav', tags: ['percussion'] }),
      makeFile({ path: '/c.wav', name: 'c.wav', tags: ['other'] }),
    ]

    library.removeTagFromFiles(['/a.wav', '/b.wav'], 'percussion')

    expect(library.files[0].tags).toEqual(['other'])
    expect(library.files[1].tags).toEqual([])
    expect(library.files[2].tags).toEqual(['other'])
  })

  it('preserves other tags', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav', tags: ['percussion', 'bass', 'heavy'] }),
    ]

    library.removeTagFromFiles(['/a.wav'], 'percussion')

    expect(library.files[0].tags).toEqual(['bass', 'heavy'])
  })

  it('calls saveMetadata after batch remove', () => {
    const library = useLibraryStore()
    library.files = [makeFile({ path: '/a.wav', tags: ['test'] })]

    library.removeTagFromFiles(['/a.wav'], 'test')

    expect(mockElectronAPI.writeMetadata).toHaveBeenCalled()
  })
})

describe('setDescriptionForFiles (batch)', () => {
  it('sets description for multiple files', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav', name: 'a.wav' }),
      makeFile({ path: '/b.wav', name: 'b.wav' }),
      makeFile({ path: '/c.wav', name: 'c.wav' }),
    ]

    library.setDescriptionForFiles(['/a.wav', '/b.wav'], 'Punchy kick')

    expect(library.files[0].description).toBe('Punchy kick')
    expect(library.files[1].description).toBe('Punchy kick')
    expect(library.files[2].description).toBe('')
  })

  it('overwrites existing descriptions', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav', description: 'Old description' }),
    ]

    library.setDescriptionForFiles(['/a.wav'], 'New description')

    expect(library.files[0].description).toBe('New description')
  })

  it('calls saveMetadata after batch description update', () => {
    const library = useLibraryStore()
    library.files = [makeFile({ path: '/a.wav' })]

    library.setDescriptionForFiles(['/a.wav'], 'Test')

    expect(mockElectronAPI.writeMetadata).toHaveBeenCalled()
  })
})
