<template>
  <section class="settings-section">
    <h3>Backups</h3>

    <div class="backup-controls">
      <button class="btn btn-primary" @click="handleCreateBackup" :disabled="creating">
        {{ creating ? 'Creating...' : 'Create Backup Now' }}
      </button>
      <div class="backup-settings">
        <label>Keep last</label>
        <input
          v-model.number="settings.maxBackups"
          type="number"
          min="1"
          max="100"
          class="number-input"
        />
        <span>backups</span>
        <button class="btn btn-secondary" @click="handlePurge" :disabled="purging">
          {{ purging ? 'Purging...' : 'Purge Old' }}
        </button>
      </div>
    </div>

    <div v-if="settings.backupsError" class="error-message">
      {{ settings.backupsError }}
    </div>

    <div v-if="settings.backupsLoading" class="loading">Loading backups...</div>

    <div v-else-if="settings.backups.length === 0" class="empty-state">
      No backups yet. Click "Create Backup Now" to create one.
    </div>

    <div v-else class="backups-list">
      <div v-for="backup in settings.backups" :key="backup.filename" class="backup-item">
        <div class="backup-info">
          <div class="backup-timestamp">
            {{ formatDate(backup.timestamp) }}
          </div>
          <div class="backup-size">
            {{ formatBytes(backup.size) }}
          </div>
        </div>
        <div class="backup-actions">
          <button class="btn btn-secondary btn-sm" @click="handleRestore(backup.filename)">
            Restore
          </button>
          <button class="btn btn-danger-subtle btn-sm" @click="handleDelete(backup.filename)">
            Delete
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatBytes } from '@/utils/formatBytes'

const library = useLibraryStore()
const settings = useSettingsStore()

const creating = ref(false)
const purging = ref(false)

onMounted(() => {
  settings.loadBackups()
})

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

async function handleCreateBackup() {
  creating.value = true
  try {
    const metaRaw = await window.electronAPI.readMetadata()
    await settings.createBackup(metaRaw)
  } catch (err) {
    settings.backupsError.value = (err as Error).message
  } finally {
    creating.value = false
  }
}

async function handleRestore(filename: string) {
  try {
    const data = await window.electronAPI.backupRestore(filename)
    await window.electronAPI.writeMetadata(data)
    await library.rescan()
  } catch (err) {
    settings.backupsError.value = (err as Error).message
  }
}

async function handleDelete(filename: string) {
  try {
    await settings.deleteBackup(filename)
  } catch (err) {
    settings.backupsError.value = (err as Error).message
  }
}

async function handlePurge() {
  purging.value = true
  try {
    await settings.purgeOldBackups()
  } catch (err) {
    settings.backupsError.value = (err as Error).message
  } finally {
    purging.value = false
  }
}
</script>

<style scoped>
.settings-section {
  margin-bottom: 32px;
}

h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.backup-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.backup-settings {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
}

.backup-settings label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
}

.number-input {
  width: 50px;
  padding: 4px 6px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
}

.number-input:focus {
  outline: none;
  border-color: var(--accent);
}

.btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-secondary {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-primary);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

.btn-danger-subtle {
  color: var(--danger, #ff4d4d);
}

.btn-danger-subtle:hover {
  background: color-mix(in srgb, var(--danger, #ff4d4d) 10%, transparent);
}

.btn:hover:not(:disabled) {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  font-size: 11px;
  color: var(--danger, #ff4d4d);
  padding: 8px 12px;
  background: color-mix(in srgb, var(--danger, #ff4d4d) 10%, transparent);
  border-radius: 4px;
  margin-bottom: 12px;
}

.loading {
  text-align: center;
  padding: 16px;
  color: var(--text-secondary);
  font-size: 12px;
}

.empty-state {
  text-align: center;
  padding: 16px;
  color: var(--text-muted);
  font-size: 12px;
}

.backups-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.backup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
}

.backup-info {
  display: flex;
  gap: 16px;
  flex: 1;
}

.backup-timestamp {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.backup-size {
  font-size: 11px;
  color: var(--text-secondary);
}

.backup-actions {
  display: flex;
  gap: 8px;
}
</style>
