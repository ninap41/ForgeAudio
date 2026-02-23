<template>
  <BaseModal title="Add Tag" @close="$emit('close')">
    <template #subtitle>
      <p class="modal-subtitle">{{ fileName }}</p>
    </template>
    <input
      ref="inputEl"
      v-model="tagInput"
      placeholder="Tag name"
      list="tag-suggestions"
      class="modal-input"
      @keydown.enter="submit"
      @keydown.escape="$emit('close')"
    />
    <datalist id="tag-suggestions">
      <option v-for="(_, name) in tagStore.tagDefinitions" :key="name" :value="name" />
    </datalist>
    <template #actions>
      <button class="btn" @click="$emit('close')">Cancel</button>
      <button class="btn btn-accent" @click="submit" :disabled="!tagInput.trim()">Add</button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useTagStore } from '@/stores/tagStore'
import BaseModal from './BaseModal.vue'

const props = defineProps<{ filePath: string }>()
const emit = defineEmits<{ close: [] }>()

const library = useLibraryStore()
const tagStore = useTagStore()
const tagInput = ref('')
const inputEl = ref<HTMLInputElement>()

const fileName = computed(() => {
  const parts = props.filePath.split('/')
  return parts[parts.length - 1]
})

onMounted(() => inputEl.value?.focus())

function submit() {
  const tag = tagInput.value.trim().toLowerCase()
  if (!tag) return
  if (!tagStore.tagDefinitions[tag]) {
    tagStore.createTag(tag)
  }
  library.addTagToFile(props.filePath, tag)
  emit('close')
}
</script>
