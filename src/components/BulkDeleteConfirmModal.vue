<template>
	<BaseModal title="Delete Files" @close="$emit('close')">
		<template #subtitle>
			<p class="modal-subtitle">{{ filePaths.length }} file{{ filePaths.length !== 1 ? "s" : "" }} selected</p>
		</template>
		<p class="modal-body">This will permanently delete the following files from disk. This cannot be undone.</p>
		<div class="file-list-scroll">
			<div v-for="fp in filePaths" :key="fp" class="file-list-item">{{ fileName(fp) }}</div>
		</div>
		<p v-if="error" class="modal-error">{{ error }}</p>
		<template #actions>
			<button class="btn" @click="$emit('close')" :disabled="loading">Cancel</button>
			<button class="btn btn-danger" @click="confirm" :disabled="loading">
				{{ loading ? "Deleting…" : "Yes, Delete" }}
			</button>
		</template>
	</BaseModal>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useLibraryStore } from "@/stores/libraryStore"
import BaseModal from "./BaseModal.vue"

const props = defineProps<{ filePaths: string[] }>()
const emit = defineEmits<{ close: [] }>()

const library = useLibraryStore()
const loading = ref(false)
const error = ref("")

function fileName(fp: string): string {
	return fp.split("/").pop() ?? fp
}

async function confirm() {
	loading.value = true
	error.value = ""
	const result = await library.deleteFiles(props.filePaths)
	loading.value = false
	if (result.errors.length > 0) {
		error.value = result.errors.join("; ")
	} else {
		library.clearSelection()
		emit("close")
	}
}
</script>

<style scoped>
.file-list-scroll {
	max-height: 200px;
	overflow-y: auto;
	border: 1px solid var(--border);
	border-radius: 4px;
	padding: 6px 8px;
	margin-top: 8px;
	background: var(--bg-secondary);
}

.file-list-item {
	font-size: 11px;
	color: var(--text-primary);
	padding: 2px 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
