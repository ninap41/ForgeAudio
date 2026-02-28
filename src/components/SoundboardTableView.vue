<template>
	<div
		class="sb-table-view"
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
			<div class="sb-table-header" @contextmenu.prevent="showColumnMenu">
				<span class="sb-th sb-th-name">Name</span>
				<span v-if="isColumnVisible('duration')" class="sb-th sb-th-duration">Duration</span>
				<span v-if="isColumnVisible('offset')" class="sb-th sb-th-offset">Offset</span>
				<span v-if="isColumnVisible('range')" class="sb-th sb-th-range">Range</span>
			</div>
			<div
				v-for="(item, index) in soundboard.items"
				:key="item.id"
				class="sb-table-row"
				:class="{
					'sb-drop-before': reorderTarget === index && reorderPosition === 'before',
					'sb-drop-after': reorderTarget === index && reorderPosition === 'after',
				}"
				draggable="true"
				@dragstart="onReorderStart($event, index)"
				@dragover.prevent="onReorderOver($event, index)"
				@drop.prevent="onReorderDrop($event, index)"
				@dragend="onReorderEnd"
				@click="playItem(item)"
				@contextmenu.prevent="onItemContextMenu(item)"
			>
				<button class="sb-restart-btn" title="Restart" @click.stop="restartItem(item)">
					<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="1 4 1 10 7 10" />
						<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
					</svg>
				</button>
				<span class="sb-td sb-td-name" :class="{ 'sb-td--active': isItemPlaying(item) }">{{ item.name }}</span>
				<span v-if="isColumnVisible('duration')" class="sb-td sb-td-duration">{{ formatSeconds(item.duration) }}</span>
				<span v-if="isColumnVisible('offset')" class="sb-td sb-td-offset" :class="{ 'sb-td--partial-glow': item.partial && item.offset != null && item.offset > 0 }">{{ item.offset != null && item.offset > 0 ? formatSeconds(item.offset) : '—' }}</span>
				<span v-if="isColumnVisible('range')" class="sb-td sb-td-range" :class="{ 'sb-td--partial-glow': item.partial && item.range }">{{ item.range ? formatSeconds(item.range[0]) + '–' + formatSeconds(item.range[1]) : '—' }}</span>
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

		<!-- Column visibility popover -->
		<div v-if="columnMenuOpen" class="column-menu" :style="columnMenuStyle" @click.stop>
			<label v-for="col in HIDEABLE_COLUMNS" :key="col" class="column-option">
				<input type="checkbox" :checked="isColumnVisible(col)" @change="toggleColumn(col)" />
				{{ col.charAt(0).toUpperCase() + col.slice(1) }}
			</label>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import { useLibraryStore } from "../stores/libraryStore"
import { formatSeconds } from "../utils/formatSeconds"
import type { Soundboard, SoundboardItem } from "../stores/soundboardStore"

interface Props {
	soundboard: Soundboard
}

const props = defineProps<Props>()
const library = useLibraryStore()

const HIDEABLE_COLUMNS = ["duration", "offset", "range"] as const
const DEFAULT_COLUMNS = ["duration", "offset", "range"]

const isDragOver = ref(false)
let dragCounter = 0

// Reorder state
const reorderSource = ref<number | null>(null)
const reorderTarget = ref<number | null>(null)
const reorderPosition = ref<"before" | "after">("before")
const dropEndActive = ref(false)

const columnMenuOpen = ref(false)
const columnMenuStyle = ref<{ top: string; left: string }>({ top: "0px", left: "0px" })

const visibleColumns = computed(() => props.soundboard.visibleColumns ?? DEFAULT_COLUMNS)

function isColumnVisible(col: string): boolean {
	return visibleColumns.value.includes(col)
}

function toggleColumn(col: string) {
	const current = [...visibleColumns.value]
	const idx = current.indexOf(col)
	if (idx >= 0) {
		current.splice(idx, 1)
	} else {
		current.push(col)
	}
	library.updateSoundboard(props.soundboard.id, { visibleColumns: current })
}

function showColumnMenu(e: MouseEvent) {
	columnMenuStyle.value = {
		top: `${e.offsetY + 4}px`,
		left: `${e.offsetX}px`,
	}
	columnMenuOpen.value = true
}

function closeColumnMenu(e: MouseEvent) {
	const el = (e.target as HTMLElement)
	if (!el.closest?.(".column-menu")) {
		columnMenuOpen.value = false
	}
}

onMounted(() => {
	document.addEventListener("mousedown", closeColumnMenu)
})

onBeforeUnmount(() => {
	document.removeEventListener("mousedown", closeColumnMenu)
})

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

function onItemContextMenu(item: SoundboardItem) {
	window.electronAPI.showSoundboardItemMenu({
		soundboardId: props.soundboard.id,
		itemId: item.id,
		itemName: item.name,
	})
}
</script>

<style scoped>
.sb-table-view {
	display: flex;
	flex-direction: column;
	position: relative;
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

.sb-table-header {
	display: flex;
	gap: 4px;
	padding: 4px 6px;
	border-bottom: 1px solid var(--border);
	user-select: none;
}

.sb-th {
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.3px;
	color: var(--text-muted);
}

.sb-th-name { flex: 1; min-width: 0; }
.sb-th-duration { width: 50px; text-align: right; flex-shrink: 0; }
.sb-th-offset { width: 50px; text-align: right; flex-shrink: 0; }
.sb-th-range { width: 70px; text-align: right; flex-shrink: 0; }

.sb-table-row {
	display: flex;
	gap: 4px;
	padding: 3px 6px;
	border-radius: 3px;
	cursor: grab;
	transition: background 0.15s;
}

.sb-table-row:active {
	cursor: grabbing;
}

.sb-table-row:hover {
	background: var(--bg-hover);
}

.sb-drop-before {
	border-top: 2px solid var(--accent);
}

.sb-drop-after {
	border-bottom: 2px solid var(--accent);
}

.sb-restart-btn {
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
	flex-shrink: 0;
	opacity: 0;
	transition:
		color 0.15s,
		opacity 0.15s;
}

.sb-table-row:hover .sb-restart-btn {
	opacity: 1;
}

.sb-restart-btn:hover {
	color: var(--accent);
}

.sb-td {
	font-size: 11px;
	color: var(--text-secondary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sb-td-name {
	flex: 1;
	min-width: 0;
	color: var(--text-primary);
}

.sb-td--active {
	color: var(--accent);
}

.sb-td--partial-glow {
	color: var(--accent);
	text-shadow: 0 0 6px var(--accent);
}

.sb-td-duration { width: 50px; text-align: right; flex-shrink: 0; }
.sb-td-offset { width: 50px; text-align: right; flex-shrink: 0; }
.sb-td-range { width: 70px; text-align: right; flex-shrink: 0; }

.column-menu {
	position: absolute;
	z-index: 10;
	background: var(--bg-primary);
	border: 1px solid var(--border);
	border-radius: 4px;
	padding: 6px;
	display: flex;
	flex-direction: column;
	gap: 4px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.column-option {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 11px;
	color: var(--text-primary);
	cursor: pointer;
	padding: 2px 4px;
	border-radius: 3px;
	user-select: none;
}

.column-option:hover {
	background: var(--bg-hover);
}

.column-option input[type="checkbox"] {
	width: 14px;
	height: 14px;
	cursor: pointer;
	accent-color: var(--accent);
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
