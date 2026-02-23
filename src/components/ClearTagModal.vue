<template>
  <BaseModal title="Clear Tag from All Sounds" @close="$emit('close')">
    <template #subtitle>
      <p class="modal-subtitle clear-subtitle">
        Remove <strong>{{ tagName }}</strong> from
        {{ count === 1 ? '1 sound' : `${count} sounds ` }}?
      </p>
    </template>
    <p class="modal-body clear-body">This will remove the tag from every file in your library. The tag itself will not be deleted.</p>
    <template #actions>
      <button class="btn" @click="$emit('close')">Cancel</button>
      <button class="btn btn-danger clear-danger" @click="confirm">Clear All</button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import BaseModal from './BaseModal.vue'

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
.clear-subtitle {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.clear-body {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 20px;
  line-height: 1.5;
}

.clear-danger {
  background: var(--danger, #ff4d4d);
  border-color: var(--danger, #ff4d4d);
  color: #fff;
}

.clear-danger:hover {
  opacity: 0.9;
  background: var(--danger, #ff4d4d);
}
</style>
