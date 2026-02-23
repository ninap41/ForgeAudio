<template>
  <BaseModal title="Create New Folder" @close="$emit('close')">
    <template #subtitle>
      <p class="modal-subtitle">Create a new audio folder to use as your library root.</p>
    </template>

    <label class="field-label">Folder Name</label>
    <input
      ref="inputEl"
      v-model="folderName"
      placeholder="My Audio Library"
      class="modal-input"
      @keydown.enter="submit"
      @keydown.escape="$emit('close')"
    />

    <label class="field-label">Parent Directory</label>
    <div class="path-row">
      <input
        :value="parentPath"
        readonly
        class="modal-input path-input"
        placeholder="Choose a location..."
      />
      <button class="btn" @click="browse">Browse</button>
    </div>

    <p v-if="error" class="modal-error">{{ error }}</p>

    <template #actions>
      <button class="btn" @click="$emit('close')" :disabled="loading">Cancel</button>
      <button
        class="btn btn-accent"
        @click="submit"
        :disabled="loading || !folderName.trim() || !parentPath"
      >
        {{ loading ? 'Creating...' : 'Create' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import BaseModal from './BaseModal.vue'

const emit = defineEmits<{ close: [] }>()

const library = useLibraryStore()
const inputEl = ref<HTMLInputElement>()
const folderName = ref('')
const parentPath = ref('')
const error = ref('')
const loading = ref(false)

onMounted(() => inputEl.value?.focus())

async function browse() {
  const dir = await window.electronAPI.selectDirectory()
  if (dir) {
    parentPath.value = dir
    error.value = ''
  }
}

async function submit() {
  const name = folderName.value.trim()
  if (!name || !parentPath.value) return

  loading.value = true
  error.value = ''

  const result = await window.electronAPI.createDirectory(parentPath.value, name)

  if (result.error) {
    error.value = result.error
    loading.value = false
    return
  }

  await library.createAndSetDirectory(result.path!)
  loading.value = false
  emit('close')
}
</script>

<style scoped>
.path-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.path-input {
  margin-bottom: 0;
  flex: 1;
  text-overflow: ellipsis;
}
</style>
