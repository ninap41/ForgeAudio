<template>
  <div class="modal-overlay" @click.self="$emit('close')" role="dialog" aria-modal="true" aria-label="Tag Store Debug">
    <div class="modal debug-modal">
      <h3>Tag Store Debug Viewer</h3>

      <div class="store-path">
        <label>Store file:</label>
        <span class="path-value">{{ storePath }}</span>
      </div>

      <div class="json-container">
        <pre><code>{{ storeJson }}</code></pre>
      </div>

      <div v-if="!confirmDelete" class="modal-actions">
        <button class="btn" @click="$emit('close')">Close</button>
        <button class="btn btn-danger" @click="confirmDelete = true">
          Delete {{ dirName }} Taglist
        </button>
      </div>
      <div v-else class="modal-actions confirm-row">
        <span class="confirm-text">Are you sure? This clears all tags.</span>
        <button class="btn" @click="confirmDelete = false">Cancel</button>
        <button class="btn btn-danger" @click="doClear">Continue</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTagStore } from '@/stores/tagStore'
import { useLibraryStore } from '@/stores/libraryStore'

defineEmits<{ close: [] }>()

const tagStore = useTagStore()
const library = useLibraryStore()

const storePath = ref('')
const storeData = ref('')
const confirmDelete = ref(false)

const storeJson = computed(() => {
  try {
    return JSON.stringify(JSON.parse(storeData.value), null, 2)
  } catch {
    return storeData.value || '{}'
  }
})

const dirName = computed(() => {
  if (!library.rootDirectory) return 'Tag'
  return library.rootDirectory.split('/').pop() ?? 'Tag'
})

async function loadData() {
  storePath.value = await window.electronAPI.getStorePath()
  storeData.value = await window.electronAPI.getStoreData()
}

async function doClear() {
  await window.electronAPI.clearTagData()
  // Reload tag store to defaults
  tagStore.loadTags({ uncategorized: { color: '#888888' } })
  // Clear in-memory file tags
  for (const file of library.files) {
    file.tags = []
  }
  confirmDelete.value = false
  await loadData()
}

onMounted(loadData)
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  min-width: 320px;
  max-width: 600px;
  width: 90%;
}

.debug-modal h3 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

.store-path {
  font-size: 12px;
  margin-bottom: 12px;
  display: flex;
  gap: 6px;
  align-items: baseline;
}

.store-path label {
  color: var(--text-muted);
  flex-shrink: 0;
}

.path-value {
  color: var(--text-secondary);
  word-break: break-all;
  font-family: monospace;
  font-size: 11px;
}

.json-container {
  max-height: 400px;
  overflow: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  margin-bottom: 16px;
}

.json-container pre {
  margin: 0;
  padding: 12px;
  font-size: 11px;
  font-family: monospace;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.confirm-row {
  align-items: center;
}

.confirm-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin-right: auto;
}

.btn {
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s;
}

.btn:hover { background: var(--bg-hover); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-danger {
  background: #7f1d1d;
  border-color: #991b1b;
  color: #fca5a5;
}

.btn-danger:hover { background: #991b1b; }
</style>
