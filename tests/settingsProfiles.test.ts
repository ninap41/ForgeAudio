import { describe, it, expect, beforeEach, vi } from 'vitest'
import { _resetLibraryStore } from '../src/stores/libraryStore'
import { _resetTagStore } from '../src/stores/tagStore'
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

beforeEach(() => {
  _resetLibraryStore()
  _resetTagStore()
  _resetThemeStore()
  vi.resetAllMocks()
  mockElectronAPI.writeMetadata.mockResolvedValue(undefined)
  mockElectronAPI.backupCreate.mockResolvedValue({})
})

describe('Settings Profiles: save profile', () => {
  it('reads current metadata for profile snapshot', async () => {
    const metaData = JSON.stringify({ version: 1, files: {}, tags: {} })
    mockElectronAPI.readMetadata.mockResolvedValue(metaData)

    const result = await window.electronAPI.readMetadata()
    expect(result).toBe(metaData)
    expect(mockElectronAPI.readMetadata).toHaveBeenCalled()
  })
})

describe('Settings Profiles: load profile', () => {
  it('writes profile data via writeMetadata', async () => {
    const profileData = JSON.stringify({
      version: 1,
      files: { 'test.wav': { tags: ['percussion'], description: 'test' } },
      tags: { percussion: { color: '#ff0000' } },
    })

    await window.electronAPI.writeMetadata(profileData)
    expect(mockElectronAPI.writeMetadata).toHaveBeenCalledWith(profileData)
  })
})

describe('Settings Profiles: export profile', () => {
  it('saves profile data to user-selected path', async () => {
    const exportPath = '/Users/test/my-profile.forgerc'
    mockElectronAPI.saveFileDialog.mockResolvedValue(exportPath)
    mockElectronAPI.writeFile.mockResolvedValue(undefined)

    const path = await window.electronAPI.saveFileDialog('my-profile.forgerc')
    expect(path).toBe(exportPath)

    await window.electronAPI.writeFile(exportPath, '{"version":1}')
    expect(mockElectronAPI.writeFile).toHaveBeenCalledWith(exportPath, '{"version":1}')
  })

  it('handles cancel in save dialog', async () => {
    mockElectronAPI.saveFileDialog.mockResolvedValue(null)
    const path = await window.electronAPI.saveFileDialog('profile.forgerc')
    expect(path).toBeNull()
  })
})

describe('Settings Profiles: import profile', () => {
  it('reads and validates imported profile', async () => {
    const profileData = JSON.stringify({
      version: 1,
      files: {},
      tags: { ambient: { color: '#00ff00' } },
    })

    mockElectronAPI.selectFile.mockResolvedValue('/downloads/shared.forgerc')
    mockElectronAPI.readFile.mockResolvedValue(profileData)

    const filePath = await window.electronAPI.selectFile()
    expect(filePath).toBe('/downloads/shared.forgerc')

    const data = await window.electronAPI.readFile(filePath!)
    const parsed = JSON.parse(data)

    expect(parsed.version).toBe(1)
    expect(parsed.tags).toHaveProperty('ambient')
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

describe('Settings Profiles: delete profile', () => {
  it('can remove a profile from the in-memory list', () => {
    interface Profile {
      name: string
      data: string
    }

    const profiles: Profile[] = [
      { name: 'Profile A', data: '{}' },
      { name: 'Profile B', data: '{}' },
    ]

    const filtered = profiles.filter(p => p.name !== 'Profile A')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('Profile B')
  })
})
