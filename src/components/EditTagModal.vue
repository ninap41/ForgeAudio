<template>
  <div class="modal-overlay" @click.self="$emit('close')" role="dialog" aria-modal="true" aria-label="Edit Tag">
    <div class="modal">
      <h3>Edit Tag</h3>
      <p class="modal-subtitle">{{ tagName }}</p>

      <label class="field-label">Name</label>
      <input
        ref="inputEl"
        v-model="nameInput"
        class="modal-input"
        placeholder="Tag name"
        @keydown.enter="submit"
        @keydown.escape="$emit('close')"
      />

      <label class="field-label">Color</label>
      <div class="color-row">
        <input type="color" v-model="colorInput" class="color-picker" />
        <span class="color-hex">{{ colorInput }}</span>
      </div>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <button class="btn" @click="$emit('close')" :disabled="saving">Cancel</button>
        <button
          class="btn btn-accent"
          @click="submit"
          :disabled="saving || !nameInput.trim()"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useTagStore } from '@/stores/tagStore'

const props = defineProps<{ tagName: string }>()
const emit = defineEmits<{ close: [] }>()

const library = useLibraryStore()
const tagStore = useTagStore()

const inputEl = ref<HTMLInputElement>()
const nameInput = ref(props.tagName)
const colorInput = ref(tagStore.getColor(props.tagName))
const error = ref('')
const saving = ref(false)

onMounted(() => {
  inputEl.value?.focus()
  inputEl.value?.select()
})

async function submit() {
  const name = nameInput.value.trim()
  if (!name) return
  saving.value = true
  error.value = ''
  const result = await library.editTag(props.tagName, name, colorInput.value)
  saving.value = false
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
  margin-bottom: 16px;
}

.field-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 6px;
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
  margin-bottom: 14px;
  box-sizing: border-box;
}

.modal-input:focus {
  border-color: var(--accent);
}

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.color-picker {
  width: 36px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: none;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.color-hex {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
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
