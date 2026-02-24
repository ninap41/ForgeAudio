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
				v-for="item in soundboard.items"
				:key="item.id"
				class="sb-table-row"
				@click="playItem(item)"
				@contextmenu.prevent="onItemContextMenu(item)"
			>
				<span class="sb-td sb-td-name" :class="{ 'sb-td--active': isItemPlaying(item) }">{{ item.name }}</span>
				<span v-if="isColumnVisible('duration')" class="sb-td sb-td-duration">{{ formatDuration(item.duration) }}</span>
				<span v-if="isColumnVisible('offset')" class="sb-td sb-td-offset">{{ item.offset != null ? item.offset + 's' : '—' }}</span>
				<span v-if="isColumnVisible('range')" class="sb-td sb-td-range">{{ item.range ? item.range[0] + '–' + item.range[1] + 's' : '—' }}</span>
			</div>
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
	if (!e.dataTransfer?.types.includes("application/x-forgeaudio-file")) return
	e.dataTransfer.dropEffect = "copy"
}

function onDragEnter(e: DragEvent) {
	if (!e.dataTransfer?.types.includes("application/x-forgeaudio-file")) return
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
	const json = e.dataTransfer?.getData("application/x-forgeaudio-file")
	if (!json) return
	const data = JSON.parse(json)
	const item: SoundboardItem = {
		id: `sbi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
		name: data.name,
		filePath: data.path,
		duration: data.duration ?? 0,
	}
	library.addSoundboardItem(props.soundboard.id, item)
}

function isItemPlaying(item: SoundboardItem): boolean {
	return library.isPlaying && library.currentFile?.path === item.filePath
}

function playItem(item: SoundboardItem) {
	if (isItemPlaying(item)) {
		library.stopPlayback()
		return
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
	})
}

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60)
	const s = Math.floor(seconds % 60)
	return `${m}:${s.toString().padStart(2, "0")}`
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
	cursor: pointer;
	transition: background 0.15s;
}

.sb-table-row:hover {
	background: var(--bg-hover);
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
</style>
