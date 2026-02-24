<template>
	<BaseModal title="Edit Sound" @close="$emit('close')">
		<template #subtitle>
			<div class="modal-subtitle">{{ originalName }}</div>
		</template>

		<label class="field-label">Name</label>
		<input ref="nameRef" v-model="name" class="modal-input" type="text" @keydown.enter="handleSubmit" />

		<label class="field-label">Offset (seconds, optional)</label>
		<input v-model.number="offset" class="modal-input" type="number" min="0" step="0.1" placeholder="0" />

		<div class="range-row">
			<div class="range-field">
				<label class="field-label">Range Start (optional)</label>
				<input v-model.number="rangeStart" class="modal-input" type="number" min="0" step="0.1" placeholder="0" />
			</div>
			<div class="range-field">
				<label class="field-label">Range End (optional)</label>
				<input v-model.number="rangeEnd" class="modal-input" type="number" min="0" step="0.1" placeholder="end" />
			</div>
		</div>

		<template #actions>
			<button class="btn" @click="$emit('close')">Cancel</button>
			<button class="btn btn-accent" :disabled="!name.trim()" @click="handleSubmit">Save</button>
		</template>
	</BaseModal>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue"
import BaseModal from "./BaseModal.vue"
import { useLibraryStore } from "../stores/libraryStore"
import { useSoundboardStore } from "../stores/soundboardStore"

interface Props {
	soundboardId: string
	itemId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const library = useLibraryStore()
const soundboardStore = useSoundboardStore()

const nameRef = ref<HTMLInputElement>()
const name = ref("")
const offset = ref<number | undefined>(undefined)
const rangeStart = ref<number | undefined>(undefined)
const rangeEnd = ref<number | undefined>(undefined)
const originalName = ref("")

onMounted(() => {
	// Find the item and pre-fill
	const sb = soundboardStore.allSoundboards.find((s) => s.id === props.soundboardId)
	const item = sb?.items.find((i) => i.id === props.itemId)
	if (item) {
		name.value = item.name
		originalName.value = item.name
		offset.value = item.offset
		if (item.range) {
			rangeStart.value = item.range[0]
			rangeEnd.value = item.range[1]
		}
	}
	nextTick(() => nameRef.value?.focus())
})

async function handleSubmit() {
	const trimmed = name.value.trim()
	if (!trimmed) return

	const updates: { name?: string; offset?: number; range?: [number, number] } = {}
	updates.name = trimmed
	if (offset.value !== undefined && offset.value > 0) {
		updates.offset = offset.value
	}
	if (rangeStart.value !== undefined && rangeEnd.value !== undefined) {
		updates.range = [rangeStart.value, rangeEnd.value]
	}

	await library.updateSoundboardItem(props.soundboardId, props.itemId, updates)
	emit("close")
}
</script>

<style scoped>
.range-row {
	display: flex;
	gap: 8px;
}

.range-field {
	flex: 1;
}
</style>
