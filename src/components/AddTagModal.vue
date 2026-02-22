<template>
  <div class="modal-overlay" @click.self="$emit('close')" role="dialog" aria-modal="true" aria-label="Add Tag">
    <div class="modal">
      <h3>Add Tag</h3>
      <p class="modal-subtitle">{{ fileName }}</p>
      <input
        ref="inputEl"
        v-model="tagInput"
        placeholder="Tag name"
        list="tag-suggestions"
        class="modal-input"
        @keydown.enter="submit"
        @keydown.escape="$emit('close')"
      />
      <datalist id="tag-suggestions">
        <option v-for="(_, name) in tagStore.tagDefinitions" :key="name" :value="name" />
      </datalist>
      <div class="modal-actions">
        <button class="btn" @click="$emit('close')">Cancel</button>
        <button class="btn btn-accent" @click="submit" :disabled="!tagInput.trim()">Add</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useTagStore } from '@/stores/tagStore'

const props = defineProps<{ filePath: string }>()
const emit = defineEmits<{ close: [] }>()

const library = useLibraryStore()
const tagStore = useTagStore()
const tagInput = ref('')
const inputEl = ref<HTMLInputElement>()

const fileName = computed(() => {
  const parts = props.filePath.split('/')
  return parts[parts.length - 1]
})

onMounted(() => inputEl.value?.focus())

function submit() {
  const tag = tagInput.value.trim().toLowerCase()
  if (!tag) return
  if (!tagStore.tagDefinitions[tag]) {
    tagStore.createTag(tag)
  }
  library.addTagToFile(props.filePath, tag)
  emit('close')
}
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
  max-width: 400px;
}

.modal h3 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.modal-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-input {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 10px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  margin-bottom: 16px;
}

.modal-input:focus {
  border-color: var(--accent);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 6px 14px;
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

.btn-accent {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
}

.btn-accent:hover { background: var(--accent-hover); }
</style>
