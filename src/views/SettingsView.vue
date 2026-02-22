<template>
  <div class="settings-view">
    <h2>Settings</h2>

    <section class="settings-section">
      <h3>Library</h3>
      <div class="setting-row">
        <span class="setting-label">Root directory</span>
        <span class="setting-value">{{ library.rootDirectory ?? 'Not set' }}</span>
        <button class="btn" @click="library.selectAndScanDirectory()">Change</button>
      </div>
    </section>

    <section class="settings-section">
      <h3>Tags</h3>

      <div class="tag-list">
        <div
          v-for="(def, tagName) in tagStore.tagDefinitions"
          :key="tagName"
          class="tag-row"
        >
          <input
            type="color"
            :value="def.color"
            @input="(e) => { tagStore.setTagColor(tagName, (e.target as HTMLInputElement).value); library.saveMetadata() }"
            class="color-picker"
          />
          <span class="tag-name">{{ tagName }}</span>
          <span class="tag-count">{{ tagCounts[tagName] ?? 0 }} sound{{ (tagCounts[tagName] ?? 0) !== 1 ? 's' : '' }}</span>
          <button
            v-if="tagName !== 'uncategorized'"
            class="btn btn-subtle btn-sm"
            @click="editingTag = tagName"
          >
            Edit
          </button>
          <button
            v-if="tagName !== 'uncategorized'"
            class="btn btn-subtle btn-sm"
            @click="clearingTag = tagName"
          >
            Clear
          </button>
          <button
            v-if="tagName !== 'uncategorized'"
            class="btn btn-subtle btn-sm btn-danger-subtle"
            @click="tagStore.deleteTag(tagName); library.saveMetadata()"
          >
            Delete
          </button>
        </div>
      </div>

      <div class="new-tag-row">
        <input
          v-model="newTagName"
          placeholder="Tag name"
          class="text-input"
          @keydown.enter="addTag"
        />
        <input v-model="newTagColor" type="color" class="color-picker" />
        <button class="btn" @click="addTag" :disabled="!newTagName.trim()">Add Tag</button>
      </div>
    </section>

    <EditTagModal
      v-if="editingTag !== null"
      :tagName="editingTag"
      @close="editingTag = null"
    />
    <ClearTagModal
      v-if="clearingTag !== null"
      :tagName="clearingTag"
      @close="clearingTag = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useTagStore } from '@/stores/tagStore'
import EditTagModal from '@/components/EditTagModal.vue'
import ClearTagModal from '@/components/ClearTagModal.vue'

const library = useLibraryStore()
const tagStore = useTagStore()

const editingTag = ref<string | null>(null)
const clearingTag = ref<string | null>(null)
const newTagName = ref('')
const newTagColor = ref('#4da6ff')

const tagCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const file of library.files) {
    for (const tag of file.tags) {
      counts[tag] = (counts[tag] ?? 0) + 1
    }
  }
  return counts
})

function addTag() {
  const name = newTagName.value.trim().toLowerCase()
  if (!name) return
  tagStore.createTag(name, newTagColor.value)
  library.saveMetadata()
  newTagName.value = ''
}
</script>

<style scoped>
.settings-view {
  padding: 24px;
  overflow-y: auto;
  height: 100%;
}

h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 24px;
}

h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.settings-section {
  margin-bottom: 32px;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.setting-label {
  font-weight: 500;
  min-width: 120px;
}

.setting-value {
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.tag-name {
  flex: 1;
}

.tag-count {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  min-width: 60px;
  text-align: right;
}

.new-tag-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.text-input {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 5px 8px;
  color: var(--text-primary);
}

.color-picker {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: none;
  cursor: pointer;
  padding: 0;
}

.btn {
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  transition: background 0.15s;
}

.btn:hover { background: var(--bg-hover); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-subtle { border-color: transparent; color: var(--text-secondary); }
.btn-sm { padding: 3px 8px; font-size: 11px; }
.btn-danger-subtle { color: var(--danger, #ff4d4d); }
.btn-danger-subtle:hover { background: color-mix(in srgb, var(--danger, #ff4d4d) 10%, transparent); }
</style>
