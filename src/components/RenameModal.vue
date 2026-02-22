<template>
  <div class="modal-overlay" @click.self="$emit('close')" role="dialog" aria-modal="true" aria-label="Rename File">
    <div class="modal">
      <h3>Rename File</h3>
      <p class="modal-subtitle">{{ currentName }}</p>
      <input
        ref="inputEl"
        v-model="newName"
        class="modal-input"
        @keydown.enter="submit"
        @keydown.escape="$emit('close')"
      />
      <p v-if="error" class="modal-error">{{ error }}</p>
      <div class="modal-actions">
        <button class="btn" @click="$emit('close')" :disabled="loading">Cancel</button>
        <button
          class="btn btn-accent"
          @click="submit"
          :disabled="loading || !newName.trim() || newName.trim() === currentName"
        >
          {{ loading ? 'Renaming…' : 'Rename' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'

const props = defineProps<{ filePath: string }>()
const emit = defineEmits<{ close: []; renamed: [newPath: string] }>()

const library = useLibraryStore()
const inputEl = ref<HTMLInputElement>()
const loading = ref(false)
const error = ref('')

const currentName = computed(() => props.filePath.split('/').pop() ?? props.filePath)
const newName = ref(currentName.value)

onMounted(() => {
  inputEl.value?.focus()
  // Pre-select the name without the extension so it's easy to change
  const dotIdx = newName.value.lastIndexOf('.')
  if (dotIdx > 0) inputEl.value?.setSelectionRange(0, dotIdx)
})

async function submit() {
  const name = newName.value.trim()
  if (!name || name === currentName.value) return
  loading.value = true
  error.value = ''
  const result = await library.renameFile(props.filePath, name)
  loading.value = false
  if (result.error) {
    error.value = result.error
  } else {
    emit('renamed', result.newPath!)
    emit('close')
  }
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
  box-sizing: border-box;
}

.modal-input:focus {
  border-color: var(--accent);
}

.modal-error {
  font-size: 12px;
  color: #ff4d4d;
  margin-bottom: 12px;
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
