<template>
  <div class="modal-overlay" @click.self="$emit('close')" role="dialog" aria-modal="true" aria-label="Clear Tag">
    <div class="modal">
      <h3>Clear Tag from All Sounds</h3>
      <p class="modal-subtitle">
        Remove <strong>{{ tagName }}</strong> from
        {{ count === 1 ? '1 sound' : `${count} sounds ` }}?
      </p>
      <p class="modal-body">This will remove the tag from every file in your library. The tag itself will not be deleted.</p>

      <div class="modal-actions">
        <button class="btn" @click="$emit('close')">Cancel</button>
        <button class="btn btn-danger" @click="confirm">Clear All</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'

const props = defineProps<{ tagName: string }>()
const emit = defineEmits<{ close: [] }>()

const library = useLibraryStore()

const count = computed(() =>
  library.files.filter(f => f.tags.includes(props.tagName)).length
)

async function confirm() {
  await library.clearTagFromAllFiles(props.tagName)
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
  margin-bottom: 8px;
}

.modal-subtitle {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.modal-body {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 20px;
  line-height: 1.5;
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

.btn-danger {
  background: var(--danger, #ff4d4d);
  border-color: var(--danger, #ff4d4d);
  color: #fff;
}

.btn-danger:hover {
  opacity: 0.9;
}
</style>
