<template>
	<BaseModal
		title="Export Stem Group"
		:close-on-overlay="false"
		:close-on-escape="true"
		show-close-button
		@close="$emit('close')"
	>
		<template #subtitle>
			<p class="modal-subtitle">{{ sourceFileName }}</p>
		</template>
		<div class="export-form">
			<label class="export-label">
				Folder name
				<input ref="nameInput" v-model="folderName" class="export-input" type="text" @keydown.enter="submit" />
			</label>
			<label class="export-label">
				Destination
				<div class="export-browse">
					<span class="export-path" :title="destDir || 'No folder selected'">{{ destDir || "No folder selected" }}</span>
					<button class="btn" @click="browse" :disabled="loading">Browse…</button>
				</div>
			</label>
			<p v-if="error" class="modal-error">{{ error }}</p>
		</div>
		<template #actions>
			<button class="btn" @click="$emit('close')" :disabled="loading">Cancel</button>
			<button class="btn btn-primary" @click="submit" :disabled="!canSubmit || loading">
				{{ loading ? "Exporting…" : "Export" }}
			</button>
		</template>
	</BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import BaseModal from "./BaseModal.vue"

interface Props {
	sourceFileName: string
	outputDir: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const baseName = props.sourceFileName.replace(/\.[^.]+$/, "")
const now = new Date()
const pad = (n: number) => String(n).padStart(2, "0")
const defaultName = `${baseName}_stems_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`

const folderName = ref(defaultName)
const destDir = ref("")
const loading = ref(false)
const error = ref("")
const nameInput = ref<HTMLInputElement | null>(null)

const canSubmit = computed(() => folderName.value.trim().length > 0 && destDir.value.length > 0)

async function browse() {
	const dir = await window.electronAPI.selectDirectory()
	if (dir) destDir.value = dir
}

async function submit() {
	if (!canSubmit.value) return
	loading.value = true
	error.value = ""
	try {
		const result = await window.electronAPI.exportStemGroup(props.outputDir, destDir.value, folderName.value.trim())
		if (!result.success) {
			error.value = result.error || "Export failed"
		} else {
			emit("close")
		}
	} catch (err) {
		error.value = (err as Error).message
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	nameInput.value?.select()
})
</script>

<style scoped>
.export-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-bottom: 1rem;
}

.export-label {
	font-size: 12px;
	color: var(--text-secondary);
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.export-input {
	padding: 6px 8px;
	border-radius: 4px;
	border: 1px solid var(--border);
	background: var(--bg-primary);
	color: var(--text-primary);
	font-size: 13px;
	outline: none;
}

.export-input:focus {
	border-color: var(--accent);
}

.export-browse {
	display: flex;
	align-items: center;
	gap: 8px;
}

.export-path {
	flex: 1;
	min-width: 0;
	padding: 6px 8px;
	border-radius: 4px;
	border: 1px solid var(--border);
	background: var(--bg-primary);
	color: var(--text-muted);
	font-size: 12px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

:deep(.modal-subtitle) {
	margin-bottom: 12px;
}
</style>
