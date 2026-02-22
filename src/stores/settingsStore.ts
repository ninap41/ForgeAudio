import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const backups = ref<BackupEntry[]>([])
  const backupsLoading = ref(false)
  const backupsError = ref<string | null>(null)
  const maxBackups = ref(10)

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
    if (backups.value.length > maxBackups.value) {
      const toDelete = backups.value.slice(maxBackups.value)
      for (const backup of toDelete) {
        try {
          await deleteBackup(backup.filename)
        } catch {
          // Silently continue
        }
      }
    }
  }

  return {
    backups,
    backupsLoading,
    backupsError,
    maxBackups,
    loadBackups,
    createBackup,
    deleteBackup,
    purgeOldBackups,
  }
})
