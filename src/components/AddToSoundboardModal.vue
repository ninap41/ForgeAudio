<template>
	<BaseModal title="Add to Soundboard" width="80%" :close-on-overlay="false" :close-on-escape="false" show-close-button @close="$emit('close')">
		<template #subtitle>
			<div class="modal-subtitle">{{ fileName }}</div>
		</template>

		<div v-if="profileSoundboards.length === 0" class="modal-body">
			No soundboards for this profile. Create one from the drawer first.
		</div>
		<template v-else>
			<div :class="{ 'form-fields': partial }">
				<label class="field-label">Soundboard *</label>
				<select ref="selectRef" v-model="selectedId" class="modal-input">
					<option value="" disabled>Select a soundboard…</option>
					<option v-for="sb in profileSoundboards" :key="sb.id" :value="sb.id">{{ sb.name }}</option>
				</select>

				<label class="field-label">Custom Name (optional)</label>
				<input v-model="customName" class="modal-input" type="text" :placeholder="fileName" />

				<div class="partial-toggle">
					<label class="toggle-label">
						<input type="checkbox" v-model="partial" />
						Partial playback
					</label>
				</div>
			</div>

			<template v-if="partial">
				<div :class="{ 'form-fields': true }">
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
					:file-path="filePath"
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
								<span v-if="offset != null && offset > 0" class="time-hint">{{ formatSeconds(offset) }}</span>
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
									<span v-if="rangeStart != null && rangeStart > 0" class="time-hint">{{ formatSeconds(rangeStart) }}</span>
								</div>
								<div class="range-field">
									<label class="field-label">Range End</label>
									<input v-model.number="rangeEnd" class="modal-input" type="number" min="0" step="0.1" placeholder="end" />
									<span v-if="rangeEnd != null && rangeEnd > 0" class="time-hint">{{ formatSeconds(rangeEnd) }}</span>
								</div>
							</div>
							<button class="btn-preview" title="Preview range" @click="previewPlayback">&#9654;</button>
						</div>
					</template>
				</div>
			</template>

			<div v-if="error" class="modal-error">{{ error }}</div>
		</template>

		<template #actions>
			<button class="btn" @click="$emit('close')">Cancel</button>
			<button class="btn btn-accent" :disabled="!selectedId" @click="handleSubmit">Add</button>
		</template>
	</BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue"
import BaseModal from "./BaseModal.vue"
import WaveformTimeline from "./WaveformTimeline.vue"
import { useLibraryStore } from "../stores/libraryStore"
import { useSoundboardStore } from "../stores/soundboardStore"
import { formatSeconds } from "../utils/formatSeconds"
import type { SoundboardItem } from "../stores/soundboardStore"

interface Props {
	filePath: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const library = useLibraryStore()
const soundboardStore = useSoundboardStore()
const selectRef = ref<HTMLSelectElement>()
const selectedId = ref("")
const customName = ref("")
const partial = ref(false)
const partialMode = ref<"offset" | "range">("offset")
const offset = ref<number | undefined>(undefined)
const rangeStart = ref<number | undefined>(undefined)
const rangeEnd = ref<number | undefined>(undefined)
const error = ref("")
const fileDuration = ref(0)

watch(partialMode, (mode) => {
	if (mode === "offset") {
		rangeStart.value = undefined
		rangeEnd.value = undefined
	} else {
		offset.value = undefined
	}
})

const fileName = computed(() => props.filePath.split("/").pop() || props.filePath)
const profileSoundboards = computed(() => soundboardStore.getSoundboardsForProfile(library.activeProfileName))

onMounted(async () => {
	nextTick(() => selectRef.value?.focus())

	// Resolve file duration
	const file = library.files.find((f) => f.path === props.filePath)
	fileDuration.value = file?.duration ?? (await window.electronAPI.getAudioDuration(props.filePath)) ?? 0
})

function previewPlayback() {
	library.stopPlayback()
	library.restartPlayback()

	const file = library.files.find((f) => f.path === props.filePath)
	if (!file) return

	if (partialMode.value === "offset") {
		library.playFile(file, { offset: offset.value ?? 0 })
	} else {
		library.playFile(file, { range: [rangeStart.value ?? 0, rangeEnd.value ?? fileDuration.value] })
	}
}

async function handleSubmit() {
	if (!selectedId.value) return
	error.value = ""

	const item: SoundboardItem = {
		id: `sbi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
		name: customName.value.trim() || fileName.value,
		filePath: props.filePath,
		duration: fileDuration.value,
	}

	if (partial.value) {
		item.partial = true
		if (partialMode.value === "offset" && offset.value !== undefined && offset.value > 0) {
			item.offset = offset.value
		}
		if (partialMode.value === "range" && rangeStart.value !== undefined && rangeEnd.value !== undefined) {
			item.range = [rangeStart.value, rangeEnd.value]
		}
	}

	await library.addSoundboardItem(selectedId.value, item)
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

.time-hint {
	display: block;
	font-size: 10px;
	color: var(--text-muted);
	margin-top: 2px;
}
</style>
