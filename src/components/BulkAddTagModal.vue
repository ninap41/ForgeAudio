<template>
	<BaseModal title="Add Tag to Selected" @close="$emit('close')">
		<template #subtitle>
			<p class="modal-subtitle">{{ filePaths.length }} file{{ filePaths.length !== 1 ? "s" : "" }} selected</p>
		</template>
		<input
			ref="inputEl"
			v-model="tagInput"
			placeholder="Tag name"
			list="bulk-tag-suggestions"
			class="modal-input"
			@keydown.enter="submit"
			@keydown.escape="$emit('close')"
		/>

		<p class="modal-subtitle">* cannot be '' or be "uncategorized"</p>

		<datalist id="bulk-tag-suggestions">
			<option v-for="(_, name) in tagStore.tagDefinitions" :key="name" :value="name" />
		</datalist>
		<template #actions>
			<button class="btn" @click="$emit('close')">Cancel</button>
			<button class="btn btn-accent" @click="submit" :disabled="isInvalid">Add</button>
		</template>
	</BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useLibraryStore } from "@/stores/libraryStore"
import { useTagStore } from "@/stores/tagStore"
import BaseModal from "./BaseModal.vue"

const props = defineProps<{ filePaths: string[] }>()
const emit = defineEmits<{ close: [] }>()

const library = useLibraryStore()
const tagStore = useTagStore()
const tagInput = ref("")
const inputEl = ref<HTMLInputElement>()
const isInvalid = computed(() => !tagInput.value.trim() || tagInput.value.trim().toLowerCase() === "uncategorized")

onMounted(() => inputEl.value?.focus())

function submit() {
	const tag = tagInput.value.trim().toLowerCase()
	if (!tag || tag === "uncategorized") return

	if (!tagStore.tagDefinitions[tag]) {
		tagStore.createTag(tag)
	}
	library.addTagToFiles(props.filePaths, tag)
	library.lastUsedTag = tag
	emit("close")
}
</script>
