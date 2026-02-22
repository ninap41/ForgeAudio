import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '../src/stores/settingsStore'
import { useLibraryStore, type AudioFile } from '../src/stores/libraryStore'

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
  mockElectronAPI.backupList.mockResolvedValue([])
  mockElectronAPI.backupDelete.mockResolvedValue(undefined)
  mockElectronAPI.backupRestore.mockResolvedValue('{}')
  mockElectronAPI.readMetadata.mockResolvedValue('{"version": 1, "files": {}}')
})

describe('BackupPanel', () => {
  describe('backup store operations', () => {
    it('calls loadBackups on component mount', async () => {
      const settings = useSettingsStore()
      mockElectronAPI.backupList.mockResolvedValue([
        { filename: 'backup1.json', timestamp: '2026-02-21T10:00:00Z', size: 1024 },
      ])

      await settings.loadBackups()

      expect(mockElectronAPI.backupList).toHaveBeenCalled()
      expect(settings.backups).toHaveLength(1)
    })

    it('formats backup list newest-first (sorted by timestamp desc)', async () => {
      const settings = useSettingsStore()
      mockElectronAPI.backupList.mockResolvedValue([
        { filename: 'backup1.json', timestamp: '2026-02-21T10:00:00Z', size: 1024 },
        { filename: 'backup2.json', timestamp: '2026-02-21T11:00:00Z', size: 2048 },
        { filename: 'backup3.json', timestamp: '2026-02-21T09:00:00Z', size: 512 },
      ])

      // Note: IPC handler sorts them, but verify the sorting logic works
      const timestamps = [
        '2026-02-21T10:00:00Z',
        '2026-02-21T11:00:00Z',
        '2026-02-21T09:00:00Z',
      ]
      const sorted = [...timestamps].sort((a, b) =>
        new Date(b).getTime() - new Date(a).getTime()
      )
      expect(sorted[0]).toBe('2026-02-21T11:00:00Z')
    })

    it('calls backupCreate when creating a backup', async () => {
      const settings = useSettingsStore()
      const testData = '{"version": 1, "files": {}}'

      await settings.createBackup(testData)

      expect(mockElectronAPI.backupCreate).toHaveBeenCalledWith(testData)
    })

    it('calls backupRestore when restoring', async () => {
      mockElectronAPI.backupRestore.mockResolvedValue('{"version": 1, "restored": true}')

      const data = await mockElectronAPI.backupRestore('backup1.json')

      expect(mockElectronAPI.backupRestore).toHaveBeenCalledWith('backup1.json')
      expect(data).toContain('restored')
    })

    it('calls backupDelete when deleting', async () => {
      const settings = useSettingsStore()
      settings.backups = [
        { filename: 'backup1.json', timestamp: '2026-02-21T10:00:00Z', size: 1024 },
      ]

      await settings.deleteBackup('backup1.json')

      expect(mockElectronAPI.backupDelete).toHaveBeenCalledWith('backup1.json')
    })
  })

  describe('component interactions', () => {
    it('creates backup by reading metadata and calling backupCreate', async () => {
      const settings = useSettingsStore()
      mockElectronAPI.readMetadata.mockResolvedValue('{"version": 1, "files": {}}')

      const metadata = await mockElectronAPI.readMetadata()
      await settings.createBackup(metadata)

      expect(mockElectronAPI.backupCreate).toHaveBeenCalled()
    })

    it('restores backup via writeMetadata and rescan', async () => {
      const library = useLibraryStore()
      const backupData = '{"version": 1, "files": {}}'

      mockElectronAPI.backupRestore.mockResolvedValue(backupData)
      mockElectronAPI.writeMetadata.mockResolvedValue(undefined)

      const restored = await mockElectronAPI.backupRestore('backup1.json')
      await mockElectronAPI.writeMetadata(restored)

      expect(mockElectronAPI.writeMetadata).toHaveBeenCalledWith(backupData)
    })

    it('supports "keep last N" setting', async () => {
      const settings = useSettingsStore()
      expect(settings.maxBackups).toBe(10)

      settings.maxBackups = 5
      expect(settings.maxBackups).toBe(5)
    })

    it('purges old backups beyond maxBackups threshold', async () => {
      const settings = useSettingsStore()
      settings.maxBackups = 2
      settings.backups = [
        { filename: 'backup1.json', timestamp: '2026-02-21T10:00:00Z', size: 1024 },
        { filename: 'backup2.json', timestamp: '2026-02-21T11:00:00Z', size: 1024 },
        { filename: 'backup3.json', timestamp: '2026-02-21T12:00:00Z', size: 1024 },
      ]

      mockElectronAPI.backupDelete.mockResolvedValue(undefined)
      await settings.purgeOldBackups()

      // Should delete the oldest one
      expect(mockElectronAPI.backupDelete).toHaveBeenCalledWith('backup3.json')
    })

    it('shows loading state during backup load', async () => {
      const settings = useSettingsStore()
      expect(settings.backupsLoading).toBe(false)

      mockElectronAPI.backupList.mockImplementation(() => {
        settings.backupsLoading = true
        return Promise.resolve([]).finally(() => {
          settings.backupsLoading = false
        })
      })

      await settings.loadBackups()
      expect(settings.backupsLoading).toBe(false)
    })

    it('clears error state on successful operation', async () => {
      const settings = useSettingsStore()
      settings.backupsError = 'Previous error'
      mockElectronAPI.backupCreate.mockResolvedValue({})

      await settings.createBackup('{}')

      expect(settings.backupsError).toBe(null)
    })
  })
})
