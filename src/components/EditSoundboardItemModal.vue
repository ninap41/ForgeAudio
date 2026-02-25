<template>
	<BaseModal title="Edit Sound" max-width="80vw" @close="$emit('close')">
		<template #subtitle>
			<div class="modal-subtitle">{{ originalName }}</div>
		</template>

		<div :class="{ 'form-fields': partial }">
			<label class="field-label">Name</label>
			<input ref="nameRef" v-model="name" class="modal-input" type="text" @keydown.enter="handleSubmit" />

			<div class="partial-toggle">
				<label class="toggle-label">
					<input type="checkbox" v-model="partial" />
					Partial playback
				</label>
			</div>
		</div>

		<template v-if="partial">
			<div class="form-fields">
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
			</div>

			<WaveformTimeline
				:file-path="itemFilePath"
				:duration="fileDuration"
				:mode="partialMode"
				:offset="offset"
				:range-start="rangeStart"
				:range-end="rangeEnd"
				@update:offset="offset = $event"
				@update:range-start="rangeStart = $event"
				@update:range-end="rangeEnd = $event"
			/>

			<div class="form-fields">
				<template v-if="partialMode === 'offset'">
					<div class="input-with-preview">
						<div class="input-grow">
							<label class="field-label">Offset (seconds)</label>
							<input v-model.number="offset" class="modal-input" type="number" min="0" step="0.1" placeholder="0" />
						</div>
						<button class="btn-preview" title="Preview from offset" @click="previewPlayback">&#9654;</button>
					</div>
				</template>

				<template v-if="partialMode === 'range'">
					<div class="input-with-preview">
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
						<button class="btn-preview" title="Preview range" @click="previewPlayback">&#9654;</button>
					</div>
				</template>
			</div>
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
import WaveformTimeline from "./WaveformTimeline.vue"
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
const itemFilePath = ref("")
const fileDuration = ref(0)

onMounted(async () => {
	// Find the item and pre-fill
	const sb = soundboardStore.allSoundboards.find((s) => s.id === props.soundboardId)
	const item = sb?.items.find((i) => i.id === props.itemId)
	if (item) {
		name.value = item.name
		originalName.value = item.name
		itemFilePath.value = item.filePath
		fileDuration.value = item.duration ?? 0
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

function previewPlayback() {
	library.stopPlayback()
	library.restartPlayback()
	let file = null
	file = library.files.find((f) => f.path === itemFilePath.value)
	console.log("preview", file)

	if (!file) return

	if (partialMode.value === "offset") {
		library.playFile(file, { offset: offset.value ?? 0 })
	} else {
		library.playFile(file, { range: [rangeStart.value ?? 0, rangeEnd.value ?? fileDuration.value] })
	}
}

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
		updates.range =
			rangeStart.value !== undefined && rangeEnd.value !== undefined ? [rangeStart.value, rangeEnd.value] : undefined
	} else {
		updates.offset = undefined
		updates.range = undefined
	}

	await library.updateSoundboardItem(props.soundboardId, props.itemId, updates)
	emit("close")
}
</script>

<style scoped>
.form-fields {
	max-width: 400px;
}

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

.input-with-preview {
	display: flex;
	align-items: flex-end;
	gap: 8px;
}

.input-grow {
	flex: 1;
}

.btn-preview {
	flex-shrink: 0;
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--accent);
	color: var(--bg-primary);
	border: none;
	border-radius: 50%;
	font-size: 14px;
	cursor: pointer;
	margin-bottom: 1px;
	transition: opacity 0.15s;
}

.btn-preview:hover {
	opacity: 0.85;
}
</style>
