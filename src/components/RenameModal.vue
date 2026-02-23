<template>
  <BaseModal title="Rename File" @close="$emit('close')">
    <template #subtitle>
      <p class="modal-subtitle">{{ currentName }}</p>
    </template>
    <input
      ref="inputEl"
      v-model="newName"
      class="modal-input"
      @keydown.enter="submit"
      @keydown.escape="$emit('close')"
    />
    <p v-if="error" class="modal-error">{{ error }}</p>
    <template #actions>
      <button class="btn" @click="$emit('close')" :disabled="loading">Cancel</button>
      <button
        class="btn btn-accent"
        @click="submit"
        :disabled="loading || !newName.trim() || newName.trim() === currentName"
      >
        {{ loading ? 'Renaming…' : 'Rename' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import BaseModal from './BaseModal.vue'

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
