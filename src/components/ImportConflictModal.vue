<template>
	<BaseModal title="Import Conflicts" maxWidth="500px" @close="$emit('cancelled')">
		<template #subtitle>
			<p class="modal-subtitle">{{ conflicts.length }} file{{ conflicts.length !== 1 ? "s" : "" }} already exist in the library</p>
		</template>

		<div class="modal-body">
			<p class="conflict-progress">File {{ currentIndex + 1 }} of {{ conflicts.length }}</p>
			<div class="conflict-filename">{{ conflicts[currentIndex].fileName }}</div>

			<label class="apply-all-row">
				<input type="checkbox" v-model="applyToAll" />
				Apply to all remaining
			</label>
		</div>

		<template #actions>
			<button class="btn" @click="$emit('cancelled')">Cancel Import</button>
			<button class="btn" @click="resolve('rename')">Keep Both</button>
			<button class="btn btn-accent" @click="resolve('overwrite')">Overwrite</button>
		</template>
	</BaseModal>
</template>

<script setup lang="ts">
import { ref } from "vue"
import BaseModal from "./BaseModal.vue"

interface ConflictItem {
	sourcePath: string
	destPath: string
	fileName: string
}

interface Props {
	conflicts: ConflictItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
	resolved: [Array<{ sourcePath: string; fileName: string; resolution: "overwrite" | "rename" }>]
	cancelled: []
}>()

const currentIndex = ref(0)
const applyToAll = ref(false)
const results: Array<{ sourcePath: string; fileName: string; resolution: "overwrite" | "rename" }> = []

function resolve(resolution: "overwrite" | "rename") {
	if (applyToAll.value) {
		// Apply same resolution to current and all remaining
		for (let i = currentIndex.value; i < props.conflicts.length; i++) {
			results.push({
				sourcePath: props.conflicts[i].sourcePath,
				fileName: props.conflicts[i].fileName,
				resolution,
			})
		}
		emit("resolved", results)
		return
	}

	results.push({
		sourcePath: props.conflicts[currentIndex.value].sourcePath,
		fileName: props.conflicts[currentIndex.value].fileName,
		resolution,
	})

	if (currentIndex.value + 1 >= props.conflicts.length) {
		emit("resolved", results)
	} else {
		currentIndex.value++
	}
}
</script>

<style scoped>
.conflict-progress {
	font-size: 12px;
	color: var(--text-muted);
	margin-bottom: 8px;
}

.conflict-filename {
	padding: 8px 12px;
	background: var(--bg-primary);
	border: 1px solid var(--border);
	border-radius: 4px;
	font-size: 13px;
	font-weight: 500;
	color: var(--accent);
	margin-bottom: 12px;
	word-break: break-all;
}

.apply-all-row {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
	color: var(--text-secondary);
	cursor: pointer;
	user-select: none;
}

.apply-all-row input[type="checkbox"] {
	width: 14px;
	height: 14px;
	accent-color: var(--accent);
	cursor: pointer;
}
</style>
