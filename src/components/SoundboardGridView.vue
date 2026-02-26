<template>
	<div
		class="sb-grid-view"
		:class="{ 'sb-drop-active': isDragOver }"
		@dragover.prevent="onDragOver"
		@dragenter.prevent="onDragEnter"
		@dragleave="onDragLeave"
		@drop.prevent="onDrop"
	>
		<div v-if="soundboard.items.length === 0" class="sb-empty">
			<p class="sb-empty-text">Drag files here or use the right-click menu</p>
		</div>
		<div v-else class="sb-grid" :style="{ 'grid-template-columns': `repeat(${gridCols}, 1fr)` }">
			<div
				v-for="(item, index) in soundboard.items"
				:key="item.id"
				class="sb-pad"
				:class="{
					'sb-pad--active': isItemPlaying(item),
					'sb-pad--drop-target': reorderTarget === index,
				}"
				draggable="true"
				@dragstart="onReorderStart($event, index)"
				@dragover.prevent="onReorderOver($event, index)"
				@drop.prevent="onReorderDrop($event, index)"
				@dragend="onReorderEnd"
				@click="playItem(item)"
				@contextmenu.prevent="onItemContextMenu(item)"
			>
				<span class="sb-pad-name">{{ item.name }}</span>
				<span class="sb-pad-duration">{{ formatDuration(item.duration) }}</span>
				<span v-if="item.partial && item.offset != null && item.offset > 0" class="sb-pad-partial sb-partial-glow">@{{ item.offset }}s</span>
				<span v-else-if="item.partial && item.range" class="sb-pad-partial sb-partial-glow">{{ item.range[0] }}–{{ item.range[1] }}s</span>
				<button class="sb-pad-restart" title="Restart" @click.stop="restartItem(item)">
					<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="1 4 1 10 7 10" />
						<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
					</svg>
				</button>
				<button class="sb-pad-remove" title="Remove" @click.stop="handleRemove(item.id)">
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
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useLibraryStore } from "../stores/libraryStore"
import type { Soundboard, SoundboardItem } from "../stores/soundboardStore"

interface Props {
	soundboard: Soundboard
}

const props = defineProps<Props>()
const library = useLibraryStore()

const gridCols = computed(() => props.soundboard.gridColumns ?? 3)

const isDragOver = ref(false)
let dragCounter = 0

// Reorder state
const reorderSource = ref<number | null>(null)
const reorderTarget = ref<number | null>(null)

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
	const data = library.dragPayload
	if (!data) return
	const item: SoundboardItem = {
		id: `sbi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
		name: data.name,
		filePath: data.path,
		duration: data.duration ?? 0,
	}
	library.addSoundboardItem(props.soundboard.id, item)
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
}

function onReorderDrop(e: DragEvent, index: number) {
	const fromStr = e.dataTransfer?.getData("application/x-forgeaudio-reorder")
	if (fromStr == null) return
	const from = parseInt(fromStr, 10)
	let to = index
	if (from < to) to--
	if (from !== to) {
		library.reorderSoundboardItems(props.soundboard.id, from, to)
	}
	reorderSource.value = null
	reorderTarget.value = null
}

function onReorderEnd() {
	reorderSource.value = null
	reorderTarget.value = null
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
	if (isItemPlaying(item)) {
		library.stopPlayback()
		return
	}
	const options: { offset?: number; range?: [number, number] } = {}
	if (item.partial) {
		if (item.offset != null && item.offset > 0) options.offset = item.offset
		if (item.range) options.range = item.range
	}
	library.playFile({
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
	}, options)
}

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60)
	const s = Math.floor(seconds % 60)
	return `${m}:${s.toString().padStart(2, "0")}`
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
.sb-grid-view {
	display: flex;
	flex-direction: column;
	gap: 4px;
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

.sb-grid {
	display: grid;
	gap: 4px;
}

.sb-pad {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 2px;
	padding: 10px 4px;
	background: var(--bg-primary);
	border: 1px solid var(--border);
	border-radius: 6px;
	cursor: grab;
	user-select: none;
	transition:
		background 0.15s,
		border-color 0.15s,
		box-shadow 0.15s;
	min-height: 52px;
}

.sb-pad:active {
	cursor: grabbing;
}

.sb-pad:hover {
	background: var(--bg-hover);
	border-color: var(--text-muted);
}

.sb-pad--active {
	border-color: var(--accent);
	box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 30%, transparent);
}

.sb-pad--drop-target {
	border-color: var(--accent);
	background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.sb-pad-name {
	font-size: 10px;
	color: var(--text-primary);
	text-align: center;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
	padding: 0 2px;
}

.sb-pad-duration {
	font-size: 9px;
	color: var(--text-muted);
}

.sb-pad-partial {
	font-size: 8px;
	font-weight: 600;
	padding: 0 3px;
	border-radius: 2px;
	color: var(--accent);
	background: color-mix(in srgb, var(--accent) 15%, transparent);
}

.sb-partial-glow {
	text-shadow: 0 0 6px var(--accent);
	box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 40%, transparent);
}

.sb-pad-restart {
	position: absolute;
	top: 2px;
	left: 2px;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 14px;
	height: 14px;
	border-radius: 3px;
	color: var(--text-muted);
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
	opacity: 0;
	transition:
		color 0.15s,
		opacity 0.15s;
}

.sb-pad:hover .sb-pad-restart {
	opacity: 1;
}

.sb-pad-restart:hover {
	color: var(--accent);
}

.sb-pad-remove {
	position: absolute;
	top: 2px;
	right: 2px;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 14px;
	height: 14px;
	border-radius: 3px;
	color: var(--text-muted);
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
	opacity: 0;
	transition:
		color 0.15s,
		opacity 0.15s;
}

.sb-pad:hover .sb-pad-remove {
	opacity: 1;
}

.sb-pad-remove:hover {
	color: var(--danger);
}

.sb-drop-active {
	outline: 2px dashed var(--accent);
	outline-offset: -2px;
	background: color-mix(in srgb, var(--accent) 8%, transparent);
}
</style>
