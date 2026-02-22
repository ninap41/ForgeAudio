<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h3>Delete File</h3>
      <p class="modal-subtitle">{{ fileName }}</p>
      <p class="modal-body">This will permanently delete the file from disk. This cannot be undone.</p>
      <p v-if="error" class="modal-error">{{ error }}</p>
      <div class="modal-actions">
        <button class="btn" @click="$emit('close')" :disabled="loading">Cancel</button>
        <button class="btn btn-danger" @click="confirm" :disabled="loading">
          {{ loading ? 'Deleting…' : 'Delete' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'

const props = defineProps<{ filePath: string }>()
const emit = defineEmits<{ close: [] }>()

const library = useLibraryStore()
const loading = ref(false)
const error = ref('')

const fileName = computed(() => props.filePath.split('/').pop() ?? props.filePath)

async function confirm() {
  loading.value = true
  error.value = ''
  const result = await library.deleteFile(props.filePath)
  loading.value = false
  if (result.error) {
    error.value = result.error
  } else {
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
  margin-bottom: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-body {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
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

.btn-danger {
  background: #7f1d1d;
  border-color: #991b1b;
  color: #fca5a5;
}

.btn-danger:hover { background: #991b1b; }
</style>
