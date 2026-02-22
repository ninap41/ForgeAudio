<template>
  <section class="settings-section">
    <h3>Export & Import</h3>

    <div class="actions-grid">
      <!-- Export -->
      <div class="action-card">
        <h4>Export Library</h4>
        <p class="action-description">Save your library data to a file</p>
        <button class="btn btn-primary" @click="handleExport" :disabled="exporting">
          {{ exporting ? 'Exporting...' : 'Export Library' }}
        </button>
        <div v-if="exportError" class="error-message">{{ exportError }}</div>
        <div v-if="exportSuccess" class="success-message">
          Exported to: {{ exportSuccess }}
        </div>
      </div>

      <!-- Import -->
      <div class="action-card">
        <h4>Import Library</h4>
        <p class="action-description">Load library data from a file</p>
        <button class="btn btn-primary" @click="handleImport" :disabled="importing">
          {{ importing ? 'Importing...' : 'Import Library' }}
        </button>
        <div v-if="importError" class="error-message">{{ importError }}</div>
        <div v-if="importSuccess" class="success-message">Library imported successfully</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'

const library = useLibraryStore()

const exporting = ref(false)
const exportError = ref('')
const exportSuccess = ref('')

const importing = ref(false)
const importError = ref('')
const importSuccess = ref(false)

async function handleExport() {
  exporting.value = true
  exportError.value = ''
  exportSuccess.value = ''

  try {
    const path = await window.electronAPI.saveFileDialog('library.json')
    if (!path) {
      exporting.value = false
      return
    }

    const metaRaw = await window.electronAPI.readMetadata()
    await window.electronAPI.writeFile(path, metaRaw)
    exportSuccess.value = path
  } catch (err) {
    exportError.value = (err as Error).message
  } finally {
    exporting.value = false
  }
}

async function handleImport() {
  importing.value = true
  importError.value = ''
  importSuccess.value = false

  try {
    const filePath = await window.electronAPI.selectFile()
    if (!filePath) {
      importing.value = false
      return
    }

    const data = await window.electronAPI.readFile(filePath)
    const parsed = JSON.parse(data)

    if (parsed.version !== 1) {
      throw new Error('Invalid library file: missing or invalid version')
    }

    await window.electronAPI.writeMetadata(data)
    await library.rescan()
    importSuccess.value = true
  } catch (err) {
    importError.value = (err as Error).message
  } finally {
    importing.value = false
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

h4 {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.action-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-description {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0;
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
  padding: 4px 8px;
  background: color-mix(in srgb, var(--danger, #ff4d4d) 10%, transparent);
  border-radius: 4px;
  word-break: break-word;
}

.success-message {
  font-size: 11px;
  color: var(--success, #4dff4d);
  padding: 4px 8px;
  background: color-mix(in srgb, var(--success, #4dff4d) 10%, transparent);
  border-radius: 4px;
  word-break: break-word;
}
</style>
