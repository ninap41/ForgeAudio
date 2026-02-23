<template>
  <BaseModal title="Edit Description" maxWidth="440px" @close="$emit('close')">
    <template #subtitle>
      <p class="modal-subtitle">{{ fileName }}</p>
    </template>
    <textarea
      ref="textareaEl"
      v-model="description"
      placeholder="Describe this sound..."
      class="modal-textarea"
      rows="3"
      @keydown.escape="$emit('close')"
    />
    <template #actions>
      <button class="btn" @click="$emit('close')">Cancel</button>
      <button class="btn btn-accent" @click="submit">Save</button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import BaseModal from './BaseModal.vue'

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
