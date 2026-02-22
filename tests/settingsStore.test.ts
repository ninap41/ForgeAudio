import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSettingsStore, _resetSettingsStore } from '../src/stores/settingsStore'

const mockElectronAPI = {
  backupCreate: vi.fn(),
  backupList: vi.fn(),
  backupDelete: vi.fn(),
  backupRestore: vi.fn(),
}

vi.stubGlobal('window', { electronAPI: mockElectronAPI })

beforeEach(() => {
  _resetSettingsStore()
  vi.resetAllMocks()
})

describe('settingsStore', () => {
  it('initializes with empty backups', () => {
    const store = useSettingsStore()
    expect(store.backups).toEqual([])
    expect(store.backupsLoading).toBe(false)
    expect(store.backupsError).toBe(null)
    expect(store.maxBackups).toBe(10)
  })

  it('loadBackups calls electronAPI.backupList', async () => {
    const mockBackups: BackupEntry[] = [
      { filename: 'backup1.json', timestamp: '2026-02-21T10:00:00Z', size: 1024 },
    ]
    mockElectronAPI.backupList.mockResolvedValue(mockBackups)

    const store = useSettingsStore()
    await store.loadBackups()

    expect(mockElectronAPI.backupList).toHaveBeenCalled()
    expect(store.backups).toEqual(mockBackups)
    expect(store.backupsError).toBe(null)
  })

  it('loadBackups sets error on failure', async () => {
    mockElectronAPI.backupList.mockRejectedValue(new Error('Load failed'))

    const store = useSettingsStore()
    await store.loadBackups()

    expect(store.backups).toEqual([])
    expect(store.backupsError).toBe('Load failed')
  })

  it('createBackup calls backupCreate and reloads list', async () => {
    mockElectronAPI.backupCreate.mockResolvedValue({})
    mockElectronAPI.backupList.mockResolvedValue([
      { filename: 'backup1.json', timestamp: '2026-02-21T10:00:00Z', size: 512 },
    ])

    const store = useSettingsStore()
    await store.createBackup('{"test": true}')

    expect(mockElectronAPI.backupCreate).toHaveBeenCalledWith('{"test": true}')
    expect(store.backups).toHaveLength(1)
  })

  it('deleteBackup removes from list', async () => {
    const store = useSettingsStore()
    store.backups = [
      { filename: 'backup1.json', timestamp: '2026-02-21T10:00:00Z', size: 512 },
      { filename: 'backup2.json', timestamp: '2026-02-21T11:00:00Z', size: 512 },
    ]

    mockElectronAPI.backupDelete.mockResolvedValue(undefined)
    await store.deleteBackup('backup1.json')

    expect(mockElectronAPI.backupDelete).toHaveBeenCalledWith('backup1.json')
    expect(store.backups).toHaveLength(1)
    expect(store.backups[0].filename).toBe('backup2.json')
  })

  it('purgeOldBackups deletes entries beyond maxBackups', async () => {
    const store = useSettingsStore()
    store.maxBackups = 2
    store.backups = [
      { filename: 'backup1.json', timestamp: '2026-02-21T10:00:00Z', size: 512 },
      { filename: 'backup2.json', timestamp: '2026-02-21T11:00:00Z', size: 512 },
      { filename: 'backup3.json', timestamp: '2026-02-21T12:00:00Z', size: 512 },
    ]

    mockElectronAPI.backupDelete.mockResolvedValue(undefined)
    await store.purgeOldBackups()

    expect(mockElectronAPI.backupDelete).toHaveBeenCalledWith('backup3.json')
    expect(store.backups).toHaveLength(2)
  })

  it('purgeOldBackups does nothing if under limit', async () => {
    const store = useSettingsStore()
    store.maxBackups = 5
    store.backups = [
      { filename: 'backup1.json', timestamp: '2026-02-21T10:00:00Z', size: 512 },
      { filename: 'backup2.json', timestamp: '2026-02-21T11:00:00Z', size: 512 },
    ]

    await store.purgeOldBackups()

    expect(mockElectronAPI.backupDelete).not.toHaveBeenCalled()
    expect(store.backups).toHaveLength(2)
  })
})
