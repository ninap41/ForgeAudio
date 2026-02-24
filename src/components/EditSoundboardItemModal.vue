<template>
	<BaseModal title="Edit Sound" @close="$emit('close')">
		<template #subtitle>
			<div class="modal-subtitle">{{ originalName }}</div>
		</template>

		<label class="field-label">Name</label>
		<input ref="nameRef" v-model="name" class="modal-input" type="text" @keydown.enter="handleSubmit" />

		<div class="partial-toggle">
			<label class="toggle-label">
				<input type="checkbox" v-model="partial" />
				Partial playback
			</label>
		</div>

		<template v-if="partial">
			<div class="partial-mode">
				<label class="radio-label">
					<input type="radio" v-model="partialMode" value="offset" />
					Offset
				</label>
				<label class="radio-label">
					<input type="radio" v-model="partialMode" value="range" />
					Range
				</label>
			</div>

			<template v-if="partialMode === 'offset'">
				<label class="field-label">Offset (seconds)</label>
				<input v-model.number="offset" class="modal-input" type="number" min="0" step="0.1" placeholder="0" />
			</template>

			<template v-if="partialMode === 'range'">
				<div class="range-row">
					<div class="range-field">
						<label class="field-label">Range Start</label>
						<input v-model.number="rangeStart" class="modal-input" type="number" min="0" step="0.1" placeholder="0" />
					</div>
					<div class="range-field">
						<label class="field-label">Range End</label>
						<input v-model.number="rangeEnd" class="modal-input" type="number" min="0" step="0.1" placeholder="end" />
					</div>
				</div>
			</template>
		</template>

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
const partial = ref(false)
const partialMode = ref<"offset" | "range">("offset")
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
		partial.value = !!item.partial
		if (item.range) {
			partialMode.value = "range"
			rangeStart.value = item.range[0]
			rangeEnd.value = item.range[1]
		} else if (item.offset != null) {
			partialMode.value = "offset"
			offset.value = item.offset
		}
	}
	nextTick(() => nameRef.value?.focus())
})

async function handleSubmit() {
	const trimmed = name.value.trim()
	if (!trimmed) return

	const updates: { name?: string; partial?: boolean; offset?: number; range?: [number, number] } = {}
	updates.name = trimmed
	updates.partial = partial.value

	if (partial.value && partialMode.value === "offset") {
		updates.offset = offset.value !== undefined && offset.value > 0 ? offset.value : undefined
		updates.range = undefined
	} else if (partial.value && partialMode.value === "range") {
		updates.offset = undefined
		updates.range = rangeStart.value !== undefined && rangeEnd.value !== undefined
			? [rangeStart.value, rangeEnd.value]
			: undefined
	} else {
		updates.offset = undefined
		updates.range = undefined
	}

	await library.updateSoundboardItem(props.soundboardId, props.itemId, updates)
	emit("close")
}
</script>

<style scoped>
.partial-toggle {
	margin: 8px 0 4px;
}

.toggle-label {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	color: var(--text-primary);
	cursor: pointer;
}

.toggle-label input[type="checkbox"] {
	accent-color: var(--accent);
}

.partial-mode {
	display: flex;
	gap: 12px;
	margin: 4px 0 8px;
}

.radio-label {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	color: var(--text-secondary);
	cursor: pointer;
}

.radio-label input[type="radio"] {
	accent-color: var(--accent);
}

.range-row {
	display: flex;
	gap: 8px;
}

.range-field {
	flex: 1;
}
</style>
