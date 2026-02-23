<template>
  <BaseModal title="Edit Tag" @close="$emit('close')">
    <template #subtitle>
      <p class="modal-subtitle">{{ tagName }}</p>
    </template>

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

    <template #actions>
      <button class="btn" @click="$emit('close')" :disabled="saving">Cancel</button>
      <button
        class="btn btn-accent"
        @click="submit"
        :disabled="saving || !nameInput.trim()"
      >
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useTagStore } from '@/stores/tagStore'
import BaseModal from './BaseModal.vue'

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
</style>
