<template>
  <BaseModal title="Tag Store Debug Viewer" maxWidth="600px" @close="$emit('close')">
    <div class="store-path">
      <label>Store file:</label>
      <span class="path-value">{{ storePath }}</span>
    </div>

    <input
      v-model="searchQuery"
      class="debug-search"
      type="text"
      placeholder="Search JSON…"
    />

    <div class="json-container">
      <pre><code>{{ filteredJson }}</code></pre>
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
const searchQuery = ref('')

const storeJson = computed(() => {
  try {
    return JSON.stringify(JSON.parse(storeData.value), null, 2)
  } catch {
    return storeData.value || '{}'
  }
})

const filteredJson = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return storeJson.value

  try {
    const parsed = JSON.parse(storeData.value)
    const filtered = filterObject(parsed, query)
    return JSON.stringify(filtered, null, 2)
  } catch {
    return storeJson.value
  }
})

function filterObject(obj: unknown, query: string): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.filter(item => JSON.stringify(item).toLowerCase().includes(query))
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key.toLowerCase().includes(query)) {
      result[key] = value
    } else if (typeof value === 'object' && value !== null) {
      const nested = filterObject(value, query)
      if (typeof nested === 'object' && nested !== null && Object.keys(nested).length > 0) {
        result[key] = nested
      }
    } else if (String(value).toLowerCase().includes(query)) {
      result[key] = value
    }
  }
  return result
}

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

.debug-search {
  width: 100%;
  padding: 6px 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}

.debug-search:focus {
  border-color: var(--accent);
}

.debug-search::placeholder {
  color: var(--text-muted);
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
