<template>
  <BaseModal title="Tag Store Debug Viewer" maxWidth="600px" @close="$emit('close')">
    <div class="store-path">
      <label>Store file:</label>
      <span class="path-value">{{ storePath }}</span>
    </div>

    <div class="json-container">
      <pre><code>{{ storeJson }}</code></pre>
    </div>

    <template #actions>
      <template v-if="!confirmDelete">
        <button class="btn" @click="$emit('close')">Close</button>
        <button class="btn btn-danger" @click="confirmDelete = true">
          Delete {{ dirName }} Taglist
        </button>
      </template>
      <template v-else>
        <span class="confirm-text">Are you sure? This clears all tags.</span>
        <button class="btn" @click="confirmDelete = false">Cancel</button>
        <button class="btn btn-danger" @click="doClear">Continue</button>
      </template>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTagStore } from '@/stores/tagStore'
import { useLibraryStore } from '@/stores/libraryStore'
import BaseModal from './BaseModal.vue'

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

.confirm-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin-right: auto;
}
</style>
