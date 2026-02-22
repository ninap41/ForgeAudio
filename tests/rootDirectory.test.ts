import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLibraryStore, _resetLibraryStore } from '../src/stores/libraryStore'
import { _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'
import { _resetSettingsStore } from '../src/stores/settingsStore'

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
  backupCreate: vi.fn().mockResolvedValue({ filename: 'test.json' }),
  backupList: vi.fn().mockResolvedValue([]),
  backupDelete: vi.fn(),
}

vi.stubGlobal('window', { electronAPI: mockElectronAPI })

beforeEach(() => {
  _resetLibraryStore()
  _resetTagStore()
  _resetThemeStore()
  _resetSettingsStore()
  vi.resetAllMocks()
  mockElectronAPI.writeMetadata.mockResolvedValue(undefined)
  mockElectronAPI.setRootDirectory.mockResolvedValue(undefined)
  mockElectronAPI.readMetadata.mockResolvedValue(JSON.stringify({
    version: 1, files: {}, tags: {},
  }))
})

describe('root directory persistence', () => {
  it('initFromPersistedDirectory sets rootDirectory and triggers rescan when stored dir exists', async () => {
    mockElectronAPI.getRootDirectory.mockResolvedValue('/sounds/library')
    // Make scan complete immediately
    mockElectronAPI.onScanProgress.mockImplementation(() => {})
    mockElectronAPI.onScanDone.mockImplementation((cb: () => void) => cb())

    const store = useLibraryStore()
    await store.initFromPersistedDirectory()

    expect(store.rootDirectory).toBe('/sounds/library')
    expect(mockElectronAPI.startScan).toHaveBeenCalledWith('/sounds/library', 50)
  })

  it('initFromPersistedDirectory does nothing when no stored dir', async () => {
    mockElectronAPI.getRootDirectory.mockResolvedValue(null)

    const store = useLibraryStore()
    await store.initFromPersistedDirectory()

    expect(store.rootDirectory).toBeNull()
    expect(mockElectronAPI.startScan).not.toHaveBeenCalled()
  })

  it('initFromPersistedDirectory stays empty when IPC returns null', async () => {
    mockElectronAPI.getRootDirectory.mockResolvedValue(null)

    const store = useLibraryStore()
    await store.initFromPersistedDirectory()

    expect(store.rootDirectory).toBeNull()
    expect(store.files).toHaveLength(0)
  })

  it('selectAndScanDirectory persists chosen directory via setRootDirectory', async () => {
    mockElectronAPI.selectDirectory.mockResolvedValue('/new/folder')
    mockElectronAPI.onScanProgress.mockImplementation(() => {})
    mockElectronAPI.onScanDone.mockImplementation((cb: () => void) => cb())

    const store = useLibraryStore()
    await store.selectAndScanDirectory()

    expect(mockElectronAPI.setRootDirectory).toHaveBeenCalledWith('/new/folder')
    expect(store.rootDirectory).toBe('/new/folder')
  })

  it('selectAndScanDirectory does not persist when user cancels', async () => {
    mockElectronAPI.selectDirectory.mockResolvedValue(null)

    const store = useLibraryStore()
    await store.selectAndScanDirectory()

    expect(mockElectronAPI.setRootDirectory).not.toHaveBeenCalled()
    expect(store.rootDirectory).toBeNull()
  })
})
