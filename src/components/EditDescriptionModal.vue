<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h3>Edit Description</h3>
      <p class="modal-subtitle">{{ fileName }}</p>
      <textarea
        ref="textareaEl"
        v-model="description"
        placeholder="Describe this sound..."
        class="modal-textarea"
        rows="3"
        @keydown.escape="$emit('close')"
      />
      <div class="modal-actions">
        <button class="btn" @click="$emit('close')">Cancel</button>
        <button class="btn btn-accent" @click="submit">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'

const props = defineProps<{ filePath: string }>()
const emit = defineEmits<{ close: [] }>()

const library = useLibraryStore()
const textareaEl = ref<HTMLTextAreaElement>()

const fileName = computed(() => {
  const parts = props.filePath.split('/')
  return parts[parts.length - 1]
})

const currentFile = computed(() => library.files.find(f => f.path === props.filePath))
const description = ref(currentFile.value?.description ?? '')

onMounted(() => textareaEl.value?.focus())

function submit() {
  library.setDescription(props.filePath, description.value.trim())
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
  min-width: 360px;
  max-width: 440px;
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

.modal-textarea {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 10px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  resize: vertical;
  margin-bottom: 16px;
  font-family: inherit;
}

.modal-textarea:focus {
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

.btn-accent {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
}

.btn-accent:hover { background: var(--accent-hover); }
</style>
