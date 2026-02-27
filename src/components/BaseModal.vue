<template>
  <div
    class="modal-overlay"
    @click.self="handleOverlayClick"
    @keydown.escape="handleEscape"
    role="dialog"
    aria-modal="true"
    :aria-label="ariaLabel || title"
  >
    <div class="modal" :style="modalStyle">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button v-if="showCloseButton" class="modal-close-btn" aria-label="Close" @click="$emit('close')">&#10005;</button>
      </div>
      <slot name="subtitle" />
      <slot />
      <div class="modal-actions">
        <slot name="actions">
          <button class="btn" @click="$emit('close')">Close</button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  ariaLabel?: string
  maxWidth?: string
  width?: string
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: '400px',
  closeOnOverlay: true,
  closeOnEscape: true,
  showCloseButton: false,
})

const emit = defineEmits<{ close: [] }>()

const modalStyle = computed(() => {
  if (props.width) return { width: props.width }
  return { maxWidth: props.maxWidth }
})

function handleOverlayClick() {
  if (props.closeOnOverlay) emit('close')
}

function handleEscape() {
  if (props.closeOnEscape) emit('close')
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
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.modal h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}

.modal-close-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: var(--bg-hover, rgba(255, 255, 255, 0.1));
  color: var(--danger, #ff4d4d);
}

:deep(.modal-subtitle) {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.modal-body) {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

:deep(.modal-error) {
  font-size: 12px;
  color: #ff4d4d;
  margin-bottom: 12px;
}

:deep(.modal-input) {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 10px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  margin-bottom: 14px;
  box-sizing: border-box;
}

:deep(.modal-input:focus) {
  border-color: var(--accent);
}

:deep(.modal-textarea) {
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
  box-sizing: border-box;
}

:deep(.modal-textarea:focus) {
  border-color: var(--accent);
}

:deep(.field-label) {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 6px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.btn) {
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  transition: background 0.15s;
  cursor: pointer;
}

:deep(.btn:hover) { background: var(--bg-hover); }
:deep(.btn:disabled) { opacity: 0.5; cursor: not-allowed; }

:deep(.btn-accent) {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
}

:deep(.btn-accent:hover) { background: var(--accent-hover); }

:deep(.btn-danger) {
  background: #7f1d1d;
  border-color: #991b1b;
  color: #fca5a5;
}

:deep(.btn-danger:hover) { background: #991b1b; }
</style>
