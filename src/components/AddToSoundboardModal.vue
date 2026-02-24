<template>
	<BaseModal title="Add to Soundboard" @close="$emit('close')">
		<template #subtitle>
			<div class="modal-subtitle">{{ fileName }}</div>
		</template>

		<div v-if="profileSoundboards.length === 0" class="modal-body">
			No soundboards for this profile. Create one from the drawer first.
		</div>
		<template v-else>
			<label class="field-label">Soundboard *</label>
			<select ref="selectRef" v-model="selectedId" class="modal-input">
				<option value="" disabled>Select a soundboard…</option>
				<option v-for="sb in profileSoundboards" :key="sb.id" :value="sb.id">{{ sb.name }}</option>
			</select>

			<label class="field-label">Custom Name (optional)</label>
			<input v-model="customName" class="modal-input" type="text" :placeholder="fileName" />

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

			<div v-if="error" class="modal-error">{{ error }}</div>
		</template>

		<template #actions>
			<button class="btn" @click="$emit('close')">Cancel</button>
			<button class="btn btn-accent" :disabled="!selectedId" @click="handleSubmit">Add</button>
		</template>
	</BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue"
import BaseModal from "./BaseModal.vue"
import { useLibraryStore } from "../stores/libraryStore"
import { useSoundboardStore } from "../stores/soundboardStore"
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
const offset = ref<number | undefined>(undefined)
const rangeStart = ref<number | undefined>(undefined)
const rangeEnd = ref<number | undefined>(undefined)
const error = ref("")

const fileName = computed(() => props.filePath.split("/").pop() || props.filePath)
const profileSoundboards = computed(() => soundboardStore.getSoundboardsForProfile(library.activeProfileName))

onMounted(() => {
	nextTick(() => selectRef.value?.focus())
})

async function handleSubmit() {
	if (!selectedId.value) return
	error.value = ""

	const file = library.files.find((f) => f.path === props.filePath)
	const duration = file?.duration ?? (await window.electronAPI.getAudioDuration(props.filePath)) ?? 0

	const item: SoundboardItem = {
		id: `sbi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
		name: customName.value.trim() || fileName.value,
		filePath: props.filePath,
		duration,
	}

	if (offset.value !== undefined && offset.value > 0) {
		item.offset = offset.value
	}
	if (rangeStart.value !== undefined && rangeEnd.value !== undefined) {
		item.range = [rangeStart.value, rangeEnd.value]
	}

	await library.addSoundboardItem(selectedId.value, item)
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
