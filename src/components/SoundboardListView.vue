<template>
	<div
		class="sb-list-view"
		:class="{ 'sb-drop-active': isDragOver }"
		@dragover.prevent="onDragOver"
		@dragenter.prevent="onDragEnter"
		@dragleave="onDragLeave"
		@drop.prevent="onDrop"
	>
		<div v-if="soundboard.items.length === 0" class="sb-empty">
			<p class="sb-empty-text">Drag files here or use the right-click menu</p>
		</div>
		<template v-else>
			<div
				v-for="(item, index) in soundboard.items"
				:key="item.id"
				class="sb-list-item"
				:class="{
					'sb-drop-before': reorderTarget === index && reorderPosition === 'before',
					'sb-drop-after': reorderTarget === index && reorderPosition === 'after',
				}"
				draggable="true"
				@dragstart="onReorderStart($event, index)"
				@dragover.prevent="onReorderOver($event, index)"
				@drop.prevent="onReorderDrop($event, index)"
				@dragend="onReorderEnd"
				@contextmenu.prevent="onItemContextMenu(item)"
			>
				<button class="sb-play-btn" :title="isItemPlaying(item) ? 'Stop' : 'Play'" @click="playItem(item)">
					<svg v-if="!isItemPlaying(item)" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
						<polygon points="5 3 19 12 5 21" />
					</svg>
					<svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
						<rect x="6" y="4" width="4" height="16" />
						<rect x="14" y="4" width="4" height="16" />
					</svg>
				</button>
				<button class="sb-restart-btn" title="Restart" @click.stop="restartItem(item)">
					<svg
						width="11"
						height="11"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="1 4 1 10 7 10" />
						<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
					</svg>
				</button>
				<span class="sb-item-name">{{ item.name }}</span>
				<span v-if="item.partial && item.offset != null && item.offset > 0" class="sb-partial-badge sb-partial-glow"
					>@{{ formatSeconds(item.offset) }}</span
				>
				<span v-else-if="item.partial && item.range" class="sb-partial-badge sb-partial-glow"
					>{{ formatSeconds(item.range[0]) }}–{{ formatSeconds(item.range[1]) }}</span
				>
				<span class="sb-item-duration">{{ formatSeconds(item.duration) }}</span>
				<button class="sb-remove-btn" title="Remove" @click="handleRemove(item.id)">
					<svg
						width="10"
						height="10"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<div
				class="sb-drop-end"
				:class="{ 'sb-drop-end--active': dropEndActive }"
				@dragover.prevent="onDropEndOver"
				@dragenter.prevent="onDropEndEnter"
				@dragleave="onDropEndLeave"
				@drop.prevent="onDropEndDrop"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useLibraryStore } from "../stores/libraryStore"
import { formatSeconds } from "../utils/formatSeconds"
import type { Soundboard, SoundboardItem } from "../stores/soundboardStore"

interface Props {
	soundboard: Soundboard
}

const props = defineProps<Props>()
const library = useLibraryStore()

const isDragOver = ref(false)
let dragCounter = 0

// Reorder state
const reorderSource = ref<number | null>(null)
const reorderTarget = ref<number | null>(null)
const reorderPosition = ref<"before" | "after">("before")
const dropEndActive = ref(false)

function onDragOver(e: DragEvent) {
	if (e.dataTransfer?.types.includes("application/x-forgeaudio-reorder")) {
		e.dataTransfer.dropEffect = "move"
		return
	}
	if (!library.dragPayload) return
	if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"
}

function onDragEnter(e: DragEvent) {
	if (e.dataTransfer?.types.includes("application/x-forgeaudio-reorder")) return
	if (!library.dragPayload) return
	dragCounter++
	isDragOver.value = true
}

function onDragLeave() {
	dragCounter--
	if (dragCounter <= 0) {
		dragCounter = 0
		isDragOver.value = false
	}
}

function onDrop(e: DragEvent) {
	dragCounter = 0
	isDragOver.value = false
	if (e.dataTransfer?.types.includes("application/x-forgeaudio-reorder")) return
	const dataList = library.dragPayload
	if (!dataList || dataList.length === 0) return
	for (const data of dataList) {
		const item: SoundboardItem = {
			id: `sbi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			name: data.name,
			filePath: data.path,
			duration: data.duration ?? 0,
		}
		library.addSoundboardItem(props.soundboard.id, item)
	}
	library.dragPayload = null
}

// ─── Reorder drag-and-drop ──────────────────────────────────────────────────

function onReorderStart(e: DragEvent, index: number) {
	reorderSource.value = index
	e.dataTransfer!.effectAllowed = "move"
	e.dataTransfer!.setData("application/x-forgeaudio-reorder", String(index))
}

function onReorderOver(e: DragEvent, index: number) {
	if (!e.dataTransfer?.types.includes("application/x-forgeaudio-reorder")) return
	e.dataTransfer.dropEffect = "move"
	reorderTarget.value = index
	const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
	reorderPosition.value = e.clientY < rect.top + rect.height / 2 ? "before" : "after"
}

function onReorderDrop(e: DragEvent, index: number) {
	const fromStr = e.dataTransfer?.getData("application/x-forgeaudio-reorder")
	if (fromStr == null) return
	const from = parseInt(fromStr, 10)
	const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
	const pos = e.clientY < rect.top + rect.height / 2 ? "before" : "after"
	let to = pos === "before" ? index : index + 1
	if (from < to) to--
	library.reorderSoundboardItems(props.soundboard.id, from, to)
	reorderSource.value = null
	reorderTarget.value = null
}

function onReorderEnd() {
	reorderSource.value = null
	reorderTarget.value = null
	dropEndActive.value = false
}

// ─── Drop-end zone (reorder to last position) ──────────────────────────────

function onDropEndOver(e: DragEvent) {
	if (e.dataTransfer?.types.includes("application/x-forgeaudio-reorder")) {
		e.dataTransfer.dropEffect = "move"
	} else if (library.dragPayload && e.dataTransfer) {
		e.dataTransfer.dropEffect = "copy"
	}
}

function onDropEndEnter(e: DragEvent) {
	if (e.dataTransfer?.types.includes("application/x-forgeaudio-reorder")) {
		dropEndActive.value = true
	}
}

function onDropEndLeave() {
	dropEndActive.value = false
}

function onDropEndDrop(e: DragEvent) {
	dropEndActive.value = false
	if (e.dataTransfer?.types.includes("application/x-forgeaudio-reorder")) {
		const fromStr = e.dataTransfer.getData("application/x-forgeaudio-reorder")
		if (fromStr == null) return
		const from = parseInt(fromStr, 10)
		const to = props.soundboard.items.length - 1
		if (from !== to) {
			library.reorderSoundboardItems(props.soundboard.id, from, to)
		}
		return
	}
	const dataList = library.dragPayload
	if (!dataList || dataList.length === 0) return
	for (const data of dataList) {
		const item: SoundboardItem = {
			id: `sbi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			name: data.name,
			filePath: data.path,
			duration: data.duration ?? 0,
		}
		library.addSoundboardItem(props.soundboard.id, item)
	}
	library.dragPayload = null
}

function restartItem(item: SoundboardItem) {
	if (library.currentFile?.path !== item.filePath) {
		playItem(item)
	} else {
		const options: { offset?: number; range?: [number, number] } = {}
		if (item.partial) {
			if (item.offset != null && item.offset > 0) options.offset = item.offset
			if (item.range) options.range = item.range
		}
		library.playbackOffset = options.offset ?? null
		library.playbackRange = options.range ?? null
		library.restartPlayback()
	}
}

function isItemPlaying(item: SoundboardItem): boolean {
	return library.isPlaying && library.currentFile?.path === item.filePath
}

function playItem(item: SoundboardItem) {
	library.stopPlayback()
	const options: { offset?: number; range?: [number, number] } = {}
	if (item.partial) {
		if (item.offset != null && item.offset > 0) options.offset = item.offset
		if (item.range) options.range = item.range
	}
	library.playFile(
		{
			path: item.filePath,
			name: item.name,
			extension: item.filePath.split(".").pop() || "",
			size: 0,
			duration: item.duration,
			tags: [],
			description: "",
			lastPlayed: null,
			createdAt: null,
			modifiedAt: null,
		},
		options,
	)
}

async function handleRemove(itemId: string) {
	await library.removeSoundboardItem(props.soundboard.id, itemId)
}

function onItemContextMenu(item: SoundboardItem) {
	window.electronAPI.showSoundboardItemMenu({
		soundboardId: props.soundboard.id,
		itemId: item.id,
		itemName: item.name,
	})
}
</script>

<style scoped>
.sb-list-view {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.sb-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px 8px;
}

.sb-empty-text {
	font-size: 11px;
	color: var(--text-muted);
	margin: 0;
}

.sb-list-item {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 6px;
	border-radius: 4px;
	transition: background 0.15s;
	cursor: grab;
}

.sb-list-item:active {
	cursor: grabbing;
}

.sb-list-item:hover {
	background: var(--bg-hover);
}

.sb-drop-before {
	border-top: 2px solid var(--accent);
}

.sb-drop-after {
	border-bottom: 2px solid var(--accent);
}

.sb-play-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 3px;
	color: var(--text-secondary);
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
	flex-shrink: 0;
	transition:
		color 0.15s,
		background 0.15s;
}

.sb-play-btn:hover {
	color: var(--accent);
	background: var(--bg-primary);
}

.sb-restart-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	border-radius: 3px;
	color: var(--text-muted);
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
	flex-shrink: 0;
	opacity: 0;
	transition:
		color 0.15s,
		opacity 0.15s;
}

.sb-list-item:hover .sb-restart-btn {
	opacity: 1;
}

.sb-restart-btn:hover {
	color: var(--accent);
}

.sb-item-name {
	flex: 1;
	font-size: 11px;
	color: var(--text-primary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sb-partial-badge {
	font-size: 9px;
	font-weight: 600;
	padding: 1px 4px;
	border-radius: 3px;
	flex-shrink: 0;
	white-space: nowrap;
	color: var(--accent);
	background: color-mix(in srgb, var(--accent) 15%, transparent);
}

.sb-partial-glow {
	text-shadow: 0 0 6px var(--accent);
	box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 40%, transparent);
}

.sb-item-duration {
	font-size: 10px;
	color: var(--text-muted);
	flex-shrink: 0;
}

.sb-remove-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	border-radius: 3px;
	color: var(--text-muted);
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
	opacity: 0;
	flex-shrink: 0;
	transition:
		color 0.15s,
		opacity 0.15s;
}

.sb-list-item:hover .sb-remove-btn {
	opacity: 1;
}

.sb-remove-btn:hover {
	color: var(--danger);
}

.sb-drop-active {
	outline: 2px dashed var(--accent);
	outline-offset: -2px;
	background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.sb-drop-end {
	min-height: 24px;
	border: 1px dashed var(--border);
	border-radius: 4px;
	margin-top: 2px;
	transition:
		background 0.15s,
		border-color 0.15s,
		min-height 0.15s;
}

.sb-drop-end--active {
	min-height: 36px;
	border-color: var(--accent);
	background: color-mix(in srgb, var(--accent) 10%, transparent);
}
</style>
