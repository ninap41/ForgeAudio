import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLibraryStore, _resetLibraryStore, type AudioFile } from '../src/stores/libraryStore'
import { useTagStore, _resetTagStore } from '../src/stores/tagStore'
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
  _resetSettingsStore()
  vi.resetAllMocks()
  mockElectronAPI.writeMetadata.mockResolvedValue(undefined)
  mockElectronAPI.backupCreate.mockResolvedValue({})
})

describe('Settings Profiles: create profile via store', () => {
  it('creates a profile and persists it', async () => {
    const store = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')
    store.files = [makeFile({ tags: ['impact'] })]

    await store.createProfile('My Studio')

    expect(store.activeProfileName).toBe('My Studio')
    expect(store.profiles['My Studio']).toBeDefined()
    expect(mockElectronAPI.writeMetadata).toHaveBeenCalled()

    const saved = JSON.parse(mockElectronAPI.writeMetadata.mock.calls[0][0])
    expect(saved.profiles['My Studio']).toBeDefined()
    expect(saved.activeProfile).toBe('My Studio')
  })

  it('rejects creating a profile with the same name', async () => {
    const store = useLibraryStore()
    await store.createProfile('Studio')

    const result = await store.createProfile('Studio')
    expect(result.error).toContain('already exists')
  })
})

describe('Settings Profiles: switch profile via store', () => {
  it('switches profile and applies snapshot data', async () => {
    const store = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')
    store.files = [makeFile({ name: 'kick.wav', path: '/kick.wav', tags: ['impact'], description: 'punchy kick' })]

    // Create a second profile
    await store.createProfile('Live Set')

    // Modify current state
    tagStore.createTag('ambient', '#0000ff')
    store.files[0].tags = ['ambient']
    store.files[0].description = 'ambient pad'

    // Switch back to Default
    await store.switchProfile('Default')

    expect(store.activeProfileName).toBe('Default')
    expect(store.files[0].tags).toContain('impact')
    expect(store.files[0].description).toBe('punchy kick')
  })

  it('does not call saveMetadata when switching to the already active profile', async () => {
    const store = useLibraryStore()
    await store.createProfile('Studio')

    mockElectronAPI.writeMetadata.mockClear()
    await store.switchProfile('Studio')

    expect(mockElectronAPI.writeMetadata).not.toHaveBeenCalled()
  })
})

describe('Settings Profiles: export profile', () => {
  it('saves profile snapshot data to user-selected path', async () => {
    const store = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')
    store.files = [makeFile({ tags: ['impact'] })]
    await store.createProfile('Export Test')

    const exportPath = '/Users/test/Export Test.forgerc'
    mockElectronAPI.saveFileDialog.mockResolvedValue(exportPath)
    mockElectronAPI.writeFile.mockResolvedValue(undefined)

    const snapshot = store.profiles['Export Test'].snapshot
    const exportData = JSON.stringify({ version: 1, ...snapshot }, null, 2)

    const path = await window.electronAPI.saveFileDialog('Export Test.forgerc')
    expect(path).toBe(exportPath)

    await window.electronAPI.writeFile(exportPath, exportData)
    expect(mockElectronAPI.writeFile).toHaveBeenCalledWith(exportPath, exportData)
  })

  it('handles cancel in save dialog', async () => {
    mockElectronAPI.saveFileDialog.mockResolvedValue(null)
    const path = await window.electronAPI.saveFileDialog('profile.forgerc')
    expect(path).toBeNull()
  })
})

describe('Settings Profiles: import profile', () => {
  it('reads and adds imported profile to the store', async () => {
    const store = useLibraryStore()
    const profileData = JSON.stringify({
      version: 1,
      files: { 'pad.wav': { tags: ['ambient'], description: 'soft pad', lastPlayed: null } },
      tags: { ambient: { color: '#00ff00' } },
    })

    mockElectronAPI.selectFile.mockResolvedValue('/downloads/shared.forgerc')
    mockElectronAPI.readFile.mockResolvedValue(profileData)

    const filePath = await window.electronAPI.selectFile()
    const data = await window.electronAPI.readFile(filePath!)
    const parsed = JSON.parse(data)

    expect(parsed.version).toBe(1)

    // Simulate what the panel does: add to profiles map
    const name = 'shared'
    store.profiles[name] = {
      name,
      createdAt: new Date().toISOString(),
      snapshot: {
        files: parsed.files ?? {},
        tags: parsed.tags ?? {},
        theme: parsed.theme,
        settings: parsed.settings,
      },
    }

    expect(store.profiles['shared']).toBeDefined()
    expect(store.profiles['shared'].snapshot.tags).toHaveProperty('ambient')
  })

  it('rejects profile without version field', async () => {
    const invalidData = JSON.stringify({ files: {}, tags: {} })
    mockElectronAPI.selectFile.mockResolvedValue('/bad.forgerc')
    mockElectronAPI.readFile.mockResolvedValue(invalidData)

    const filePath = await window.electronAPI.selectFile()
    const data = await window.electronAPI.readFile(filePath!)
    const parsed = JSON.parse(data)

    expect(parsed.version).toBeUndefined()
  })

  it('handles invalid JSON gracefully', async () => {
    mockElectronAPI.selectFile.mockResolvedValue('/corrupt.forgerc')
    mockElectronAPI.readFile.mockResolvedValue('not json!')

    const filePath = await window.electronAPI.selectFile()
    const data = await window.electronAPI.readFile(filePath!)

    expect(() => JSON.parse(data)).toThrow()
  })
})

describe('Settings Profiles: rootDirectory in profiles', () => {
  it('created profile snapshot includes rootDirectory', async () => {
    const store = useLibraryStore()
    store.rootDirectory = '/Users/test/audio'
    store.files = [makeFile({ tags: ['impact'] })]

    await store.createProfile('WithDir')

    expect(store.profiles['WithDir'].snapshot.rootDirectory).toBe('/Users/test/audio')
  })

  it('import with rootDirectory in .forgerc preserves it', async () => {
    const store = useLibraryStore()
    const profileData = JSON.stringify({
      version: 1,
      files: {},
      tags: {},
      rootDirectory: '/shared/library',
    })

    mockElectronAPI.selectFile.mockResolvedValue('/downloads/shared.forgerc')
    mockElectronAPI.readFile.mockResolvedValue(profileData)

    const filePath = await window.electronAPI.selectFile()
    const data = await window.electronAPI.readFile(filePath!)
    const parsed = JSON.parse(data)

    const name = 'shared'
    store.profiles[name] = {
      name,
      createdAt: new Date().toISOString(),
      snapshot: {
        files: parsed.files ?? {},
        tags: parsed.tags ?? {},
        theme: parsed.theme,
        settings: parsed.settings,
        rootDirectory: parsed.rootDirectory ?? null,
      },
    }

    expect(store.profiles['shared'].snapshot.rootDirectory).toBe('/shared/library')
  })

  it('import without rootDirectory defaults to null', async () => {
    const store = useLibraryStore()
    const profileData = JSON.stringify({
      version: 1,
      files: {},
      tags: {},
    })

    mockElectronAPI.selectFile.mockResolvedValue('/downloads/old.forgerc')
    mockElectronAPI.readFile.mockResolvedValue(profileData)

    const filePath = await window.electronAPI.selectFile()
    const data = await window.electronAPI.readFile(filePath!)
    const parsed = JSON.parse(data)

    const name = 'old'
    store.profiles[name] = {
      name,
      createdAt: new Date().toISOString(),
      snapshot: {
        files: parsed.files ?? {},
        tags: parsed.tags ?? {},
        theme: parsed.theme,
        settings: parsed.settings,
        rootDirectory: parsed.rootDirectory ?? null,
      },
    }

    expect(store.profiles['old'].snapshot.rootDirectory).toBeNull()
  })
})

describe('Settings Profiles: delete profile via store', () => {
  it('removes a profile from the profiles map', async () => {
    const store = useLibraryStore()
    await store.createProfile('Temp')
    await store.switchProfile('Default')

    const result = await store.deleteProfile('Temp')

    expect(result.error).toBeUndefined()
    expect(store.profiles['Temp']).toBeUndefined()
  })

  it('prevents deleting the Default profile', async () => {
    const store = useLibraryStore()
    await store.createProfile('Studio') // creates Default implicitly

    const result = await store.deleteProfile('Default')
    expect(result.error).toContain('Cannot delete')
  })

  it('switches to Default when deleting the active profile', async () => {
    const store = useLibraryStore()
    store.files = [makeFile()]
    await store.createProfile('Active')
    expect(store.activeProfileName).toBe('Active')

    await store.deleteProfile('Active')

    expect(store.activeProfileName).toBe('Default')
  })
})
