<template>
	<div class="audio-list">
		<div class="list-header">
			<div class="col col-play" :style="{ width: widths.play + 'px' }"></div>

			<div
				class="col col-name sortable"
				:class="{ 'sort-active': library.sortColumn === 'name' }"
				:style="{ width: widths.name + 'px' }"
				@click="library.setSort('name')"
			>
				Filename
				<span v-if="library.sortColumn === 'name'" class="sort-arrow">{{
					library.sortDirection === "asc" ? "↑" : "↓"
				}}</span>
				<div class="resize-handle" @mousedown.stop="startResize($event, 'name')" @click.stop />
			</div>

			<div
				class="col col-tags sortable"
				:class="{ 'sort-active': library.sortColumn === 'tags' }"
				:style="{ width: widths.tags + 'px' }"
				@click="library.setSort('tags')"
			>
				Tags
				<span v-if="library.sortColumn === 'tags'" class="sort-arrow">{{
					library.sortDirection === "asc" ? "↑" : "↓"
				}}</span>
				<div class="resize-handle" @mousedown.stop="startResize($event, 'tags')" @click.stop />
			</div>

			<div
				class="col col-duration sortable"
				:class="{ 'sort-active': library.sortColumn === 'duration' }"
				:style="{ width: widths.duration + 'px' }"
				@click="library.setSort('duration')"
			>
				Duration
				<span v-if="library.sortColumn === 'duration'" class="sort-arrow">{{
					library.sortDirection === "asc" ? "↑" : "↓"
				}}</span>
				<div class="resize-handle" @mousedown.stop="startResize($event, 'duration')" @click.stop />
			</div>

			<div
				class="col col-type sortable"
				:class="{ 'sort-active': library.sortColumn === 'type' }"
				:style="{ width: widths.type + 'px' }"
				@click="library.setSort('type')"
			>
				Type
				<span v-if="library.sortColumn === 'type'" class="sort-arrow">{{
					library.sortDirection === "asc" ? "↑" : "↓"
				}}</span>
				<div class="resize-handle" @mousedown.stop="startResize($event, 'type')" @click.stop />
			</div>

			<div
				class="col col-date sortable"
				:class="{ 'sort-active': library.sortColumn === 'createdAt' }"
				:style="{ width: widths.createdAt + 'px' }"
				@click="library.setSort('createdAt')"
			>
				Date Created
				<span v-if="library.sortColumn === 'createdAt'" class="sort-arrow">{{
					library.sortDirection === "asc" ? "↑" : "↓"
				}}</span>
				<div class="resize-handle" @mousedown.stop="startResize($event, 'createdAt')" @click.stop />
			</div>

			<div
				class="col col-date sortable"
				:class="{ 'sort-active': library.sortColumn === 'modifiedAt' }"
				:style="{ width: widths.modifiedAt + 'px' }"
				@click="library.setSort('modifiedAt')"
			>
				Date Modified
				<span v-if="library.sortColumn === 'modifiedAt'" class="sort-arrow">{{
					library.sortDirection === "asc" ? "↑" : "↓"
				}}</span>
				<div class="resize-handle" @mousedown.stop="startResize($event, 'modifiedAt')" @click.stop />
			</div>
		</div>

		<div
			class="list-body"
			ref="listBody"
			:class="{ 'drop-active': isDragOver }"
			@dragover.prevent="onDragOver"
			@dragenter.prevent="onDragEnter"
			@dragleave="onDragLeave"
			@drop.prevent="onDrop"
		>
			<div v-if="library.filteredFiles.length === 0" class="no-results">No audio files found.</div>

			<!-- Pass widths so rows can align perfectly with the header -->
			<AudioRow v-bind="{ widths, file }" v-for="file in library.filteredFiles" :key="file.path" />
		</div>

		<div class="list-footer">
			{{ library.filteredFiles.length }}
			<template v-if="library.filteredFiles.length !== library.files.length"> of {{ library.files.length }} </template>
			file{{ library.filteredFiles.length !== 1 ? "s" : "" }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onBeforeUnmount } from "vue"
import { useLibraryStore } from "@/stores/libraryStore"
import AudioRow from "./AudioRow.vue"

const emit = defineEmits<{ filesDropped: [paths: string[]] }>()

const library = useLibraryStore()
const listBody = ref<HTMLElement>()
const isDragOver = ref(false)
let dragCounter = 0

function onDragOver(e: DragEvent) {
	if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"
}

function onDragEnter() {
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
	if (!e.dataTransfer?.files.length) return
	const paths: string[] = []
	for (const file of Array.from(e.dataTransfer.files)) {
		if ((file as any).path) paths.push((file as any).path)
	}
	if (paths.length) emit("filesDropped", paths)
}

type ColKey = "play" | "name" | "tags" | "duration" | "type" | "createdAt" | "modifiedAt"

const widths = reactive<Record<ColKey, number>>({
	play: 36,
	name: 280,
	tags: 200,
	duration: 80,
	type: 70,
	createdAt: 130,
	modifiedAt: 130,
})

let resizingCol: ColKey | null = null
let startX = 0
let startWidth = 0

const MIN_WIDTH: Partial<Record<ColKey, number>> = {
	name: 140,
	tags: 120,
	duration: 70,
	type: 60,
	createdAt: 90,
	modifiedAt: 90,
}

const onMouseMove = (e: MouseEvent) => {
	if (!resizingCol) return

	const delta = e.clientX - startX
	const min = MIN_WIDTH[resizingCol] ?? 60
	widths[resizingCol] = Math.max(min, startWidth + delta)
}

const stopResize = () => {
	resizingCol = null
	document.body.classList.remove("is-resizing-columns")
	document.removeEventListener("mousemove", onMouseMove)
	document.removeEventListener("mouseup", stopResize)
}

const startResize = (e: MouseEvent, col: ColKey) => {
	e.preventDefault()
	e.stopPropagation()

	if (col === "play") return

	resizingCol = col
	startX = e.clientX
	startWidth = widths[col]

	document.body.classList.add("is-resizing-columns")
	document.addEventListener("mousemove", onMouseMove)
	document.addEventListener("mouseup", stopResize)
}

onBeforeUnmount(() => {
	stopResize()
})

function scrollToPath(path: string) {
	nextTick(() => {
		const el = listBody.value?.querySelector(`[data-path="${CSS.escape(path)}"]`) as HTMLElement
		el?.scrollIntoView({ block: "nearest" })
	})
}

defineExpose({ scrollToPath })
</script>

<style scoped>
.audio-list {
	position: relative;
	z-index: 0;
	display: flex;
	flex-direction: column;
	height: 100%;
}

.list-header {
	display: flex;
	align-items: center;
	padding: 6px 16px;
	border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
	background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
	font-size: 11px;
	font-weight: 600;
	color: var(--text-secondary);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	user-select: none;
}

.list-body {
	flex: 1;
	overflow-y: auto;
}

.list-body.drop-active {
	outline: 2px dashed var(--accent);
	outline-offset: -2px;
	background: color-mix(in srgb, var(--accent) 5%, transparent);
}

.list-footer {
	flex-shrink: 0;
	padding: 6px 16px;
	border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
	background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
	font-size: 11px;
	color: var(--text-muted);
}

.col {
	flex: none;
	flex-shrink: 0;
	position: relative;
	display: flex;
	align-items: center;
	min-width: 0;
	gap: 4px;
}

.sortable {
	cursor: pointer;
	transition: color 0.1s;
}

.sortable:hover {
	color: var(--text-primary);
}

.sort-active {
	color: var(--accent);
}

.sort-arrow {
	font-size: 10px;
	flex-shrink: 0;
}

.col-duration {
	justify-content: flex-end;
	text-align: right;
}

.col-type {
	justify-content: center;
	text-align: center;
}

.col-date {
	justify-content: flex-start;
}

.resize-handle {
	position: absolute;
	right: -3px;
	top: 0;
	width: 6px;
	height: 100%;
	cursor: col-resize;
}

.resize-handle:hover {
	background: rgba(255, 255, 255, 0.08);
}

.no-results {
	padding: 40px;
	text-align: center;
	color: var(--text-muted);
}
</style>

<style>
body.is-resizing-columns {
	cursor: col-resize !important;
	user-select: none !important;
}

.col-name {
	overflow: hidden;
}

.file-name,
.file-description {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	text-align: left;
}

.resize-handle {
	position: absolute;
	top: 0;
	right: -3px;
	width: 6px;
	height: 100%;
	cursor: col-resize;
	z-index: 2;
}

.resize-handle::after {
	content: "";
	position: absolute;
	top: 6px;
	bottom: 6px;
	left: 50%;
	width: 1px;
	background: transparent;
	transition: background 0.15s;
}

.resize-handle:hover::after {
	background: var(--accent);
}
</style>
