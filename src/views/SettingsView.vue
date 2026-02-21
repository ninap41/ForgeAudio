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
          v-for="(def, name) in tagStore.tagDefinitions"
          :key="name"
          class="tag-row"
        >
          <input
            type="color"
            :value="def.color"
            @input="(e) => tagStore.setTagColor(String(name), (e.target as HTMLInputElement).value)"
            class="color-picker"
          />
          <span class="tag-name">{{ name }}</span>
          <button
            v-if="name !== 'uncategorized'"
            class="btn btn-subtle btn-sm"
            @click="tagStore.deleteTag(String(name)); library.saveMetadata()"
          >
            Delete
          </button>
        </div>
      </div>

      <div class="new-tag-row">
        <input
          v-model="newTagName"
          placeholder="New tag name"
          class="text-input"
          @keydown.enter="addTag"
        />
        <input v-model="newTagColor" type="color" class="color-picker" />
        <button class="btn" @click="addTag" :disabled="!newTagName.trim()">Add Tag</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useTagStore } from '@/stores/tagStore'

const library = useLibraryStore()
const tagStore = useTagStore()

const newTagName = ref('')
const newTagColor = ref('#4da6ff')

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
  margin-bottom: 12px;
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

.new-tag-row {
  display: flex;
  gap: 8px;
  align-items: center;
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
</style>
