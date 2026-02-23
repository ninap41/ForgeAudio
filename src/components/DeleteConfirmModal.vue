<template>
  <BaseModal title="Delete File" @close="$emit('close')">
    <template #subtitle>
      <p class="modal-subtitle">{{ fileName }}</p>
    </template>
    <p class="modal-body">This will permanently delete the file from disk. This cannot be undone.</p>
    <p v-if="error" class="modal-error">{{ error }}</p>
    <template #actions>
      <button class="btn" @click="$emit('close')" :disabled="loading">Cancel</button>
      <button class="btn btn-danger" @click="confirm" :disabled="loading">
        {{ loading ? 'Deleting…' : 'Delete' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import BaseModal from './BaseModal.vue'

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
:deep(.modal-subtitle) {
  margin-bottom: 12px;
}
</style>
