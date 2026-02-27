import { ref, reactive } from 'vue'

const backups = ref<BackupEntry[]>([])
const backupsLoading = ref(false)
const backupsError = ref<string | null>(null)
const maxBackups = ref(10)

// Advanced settings
const scannerBatchSize = ref(50)
const durationConcurrency = ref(8)
const autoLoadDurations = ref(true)
const autoBackup = ref(true)
const showBootSplash = ref(true)

export function useSettingsStore() {
  async function loadBackups() {
    try {
      backupsLoading.value = true
      backupsError.value = null
      backups.value = await window.electronAPI.backupList()
    } catch (err) {
      backupsError.value = (err as Error).message
      backups.value = []
    } finally {
      backupsLoading.value = false
    }
  }

  async function createBackup(data: string) {
    try {
      backupsError.value = null
      await window.electronAPI.backupCreate(data)
      await loadBackups()
    } catch (err) {
      backupsError.value = (err as Error).message
      throw err
    }
  }

  async function deleteBackup(filename: string) {
    try {
      backupsError.value = null
      await window.electronAPI.backupDelete(filename)
      backups.value = backups.value.filter(b => b.filename !== filename)
    } catch (err) {
      backupsError.value = (err as Error).message
      throw err
    }
  }

  async function purgeOldBackups() {
    // Refresh from disk so we don't operate on a stale list
    // (auto-backup bypasses createBackup, so backups.value may be outdated)
    await loadBackups()
    if (backups.value.length > maxBackups.value) {
      const toDelete = backups.value.slice(maxBackups.value)
      for (const backup of toDelete) {
        try {
          await deleteBackup(backup.filename)
        } catch {
          // Silently continue — file may already be deleted by a concurrent purge
        }
      }
    }
  }

  function loadSettings(settings?: Record<string, unknown>) {
    if (!settings || typeof settings !== 'object') return

    if (typeof settings.scannerBatchSize === 'number') {
      scannerBatchSize.value = Math.max(10, Math.min(200, settings.scannerBatchSize))
    }
    if (typeof settings.durationConcurrency === 'number') {
      durationConcurrency.value = Math.max(1, Math.min(32, settings.durationConcurrency))
    }
    if (typeof settings.autoLoadDurations === 'boolean') {
      autoLoadDurations.value = settings.autoLoadDurations
    }
    if (typeof settings.autoBackup === 'boolean') {
      autoBackup.value = settings.autoBackup
    }
    if (typeof settings.showBootSplash === 'boolean') {
      showBootSplash.value = settings.showBootSplash
    }
  }

  function getSettingsSnapshot() {
    return {
      scannerBatchSize: scannerBatchSize.value,
      durationConcurrency: durationConcurrency.value,
      autoLoadDurations: autoLoadDurations.value,
      autoBackup: autoBackup.value,
      showBootSplash: showBootSplash.value,
    }
  }

  return reactive({
    backups,
    backupsLoading,
    backupsError,
    maxBackups,
    scannerBatchSize,
    durationConcurrency,
    autoLoadDurations,
    autoBackup,
    showBootSplash,
    loadBackups,
    createBackup,
    deleteBackup,
    purgeOldBackups,
    loadSettings,
    getSettingsSnapshot,
  })
}

export function _resetSettingsStore() {
  backups.value = []
  backupsLoading.value = false
  backupsError.value = null
  maxBackups.value = 10
  scannerBatchSize.value = 50
  durationConcurrency.value = 8
  autoLoadDurations.value = true
  autoBackup.value = true
  showBootSplash.value = true
}
