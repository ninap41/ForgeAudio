<template>
	<div class="audio-row-wrapper" :data-path="file.path">
		<div
			class="audio-row"
			:class="{ active: isActive, playing: isActive && library.isPlaying }"
			draggable="true"
			@click="library.playFile(file)"
			@contextmenu.prevent="onContextMenu"
			@dragstart="onDragStart"
			@dragend="onDragEnd"
		>
			<div class="col col-play" :style="{ width: widths.play + 'px' }">
				<button class="play-btn" @click.stop="togglePlay">
					<svg v-if="isActive && library.isPlaying" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
						<rect x="6" y="4" width="4" height="16" />
						<rect x="14" y="4" width="4" height="16" />
					</svg>
					<svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
						<polygon points="5,3 19,12 5,21" />
					</svg>
				</button>
			</div>

			<div class="col col-name" :style="{ width: widths.name + 'px' }" :title="file.path">
				<button class="expand-btn" :title="expanded ? 'Collapse' : 'Expand'" @click.stop="emit('toggle-expand', file.path)">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
						<polygon v-if="expanded" points="6,9 12,15 18,9" />

						<polygon v-else points="9,6 15,12 9,18" />
					</svg>
				</button>
				<div class="name-content">
					<span class="file-name">{{ file.name }}</span>
					<span v-if="file.description" class="file-description">{{ file.description }}</span>
				</div>
			</div>

			<div class="col col-tags" :style="{ width: widths.tags + 'px' }">
				<TagChip
					v-for="tag in file.tags"
					:key="tag"
					:tag="tag"
					:removable="true"
					@remove="library.removeTagFromFile(file.path, tag)"
					@click.stop="library.addTagFilter(tag)"
				/>
				<span v-if="file.tags.length === 0" class="tag-chip" style="margin-left: 1rem"> --- </span>
			</div>

			<div class="col col-duration" :style="{ width: widths.duration + 'px' }">
				{{ formatDuration(file.duration) }}
			</div>

			<div class="col col-type" :style="{ width: widths.type + 'px' }">
				{{ file.extension }}
			</div>

			<div class="col col-date clickable-date" :style="{ width: widths.createdAt + 'px' }" @contextmenu.prevent.stop="onDateContextMenu('createdAt', file.createdAt)">
				{{ formatDate(file.createdAt) }}
			</div>

			<div class="col col-date clickable-date" :style="{ width: widths.modifiedAt + 'px' }" @contextmenu.prevent.stop="onDateContextMenu('modifiedAt', file.modifiedAt)">
				{{ formatDate(file.modifiedAt) }}
			</div>
			<div class="col col-date clickable-date" :style="{ width: widths.lastPlayed + 'px' }" @contextmenu.prevent.stop="onDateContextMenu('lastPlayed', file.lastPlayed)">
				{{ formatDate(file.lastPlayed) }}
			</div>
		</div>

		<div v-if="expanded" class="row-detail">
			<dl class="detail-list">
				<div class="detail-row">
					<dt>Path</dt>
					<dd class="detail-path">{{ file.path }}</dd>
				</div>
				<div class="detail-row">
					<dt>Size</dt>
					<dd>{{ formatBytes(file.size) }}</dd>
				</div>
				<div class="detail-row">
					<dt>Duration</dt>
					<dd>{{ formatDuration(file.duration) }}</dd>
				</div>
				<div class="detail-row">
					<dt>Format</dt>
					<dd>{{ file.extension }}</dd>
				</div>
				<div class="detail-row">
					<dt>Tags</dt>
					<dd>
						<span v-if="file.tags.length > 0" class="detail-tags">
							<TagChip v-for="tag in file.tags" :key="tag" :tag="tag" :removable="false" />
						</span>
						<span v-else>—</span>
					</dd>
				</div>
				<div class="detail-row">
					<dt>Description</dt>
					<dd>{{ file.description || "—" }}</dd>
				</div>
				<div class="detail-row">
					<dt>Created</dt>
					<dd class="clickable-date" @contextmenu.prevent.stop="onDateContextMenu('createdAt', file.createdAt)">
						{{ formatDate(file.createdAt) }}
					</dd>
				</div>
				<div class="detail-row">
					<dt>Modified</dt>
					<dd class="clickable-date" @contextmenu.prevent.stop="onDateContextMenu('modifiedAt', file.modifiedAt)">
						{{ formatDate(file.modifiedAt) }}
					</dd>
				</div>
				<div class="detail-row">
					<dt>Last Played</dt>
					<dd class="clickable-date" @contextmenu.prevent.stop="onDateContextMenu('lastPlayed', file.lastPlayed)">
						{{ file.lastPlayed ? formatDate(file.lastPlayed) : "—" }}
					</dd>
				</div>
			</dl>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useLibraryStore, type AudioFile } from "@/stores/libraryStore"
import { useSoundboardStore } from "@/stores/soundboardStore"
import { formatSeconds } from "@/utils/formatSeconds"
import { formatBytes } from "@/utils/formatBytes"
import TagChip from "./TagChip.vue"

type ColKey = "play" | "name" | "tags" | "duration" | "type" | "createdAt" | "modifiedAt" | "lastPlayed"

const props = defineProps<{
	file: AudioFile
	widths: Record<ColKey, number> // reactive object passed from parent
	expanded?: boolean
}>()

const emit = defineEmits<{ "toggle-expand": [path: string] }>()

const library = useLibraryStore()
const soundboardStore = useSoundboardStore()

const isActive = computed(() => library.currentFile?.path === props.file.path)

function togglePlay() {
	if (isActive.value && library.isPlaying) {
		library.stopPlayback()
	} else {
		library.playFile(props.file)
	}
}

function onContextMenu() {
	const profileSoundboards = soundboardStore.getSoundboardsForProfile(library.activeProfileName)
	const soundboards = profileSoundboards.map((sb) => ({ id: sb.id, name: sb.name }))

	// Find the most recently updated soundboard
	let recentSoundboardId: string | null = null
	let recentSoundboardName: string | null = null
	if (profileSoundboards.length > 0) {
		const sorted = [...profileSoundboards]
			.filter((sb) => sb.updatedAt)
			.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
		if (sorted.length > 0) {
			recentSoundboardId = sorted[0].id
			recentSoundboardName = sorted[0].name
		}
	}

	window.electronAPI.showContextMenu({
		filePath: props.file.path,
		soundboards,
		recentSoundboardId,
		recentSoundboardName,
		lastUsedTag: library.lastUsedTag,
	})
}

function onDateContextMenu(field: "createdAt" | "modifiedAt" | "lastPlayed", date: string | null) {
	if (!date) return
	window.electronAPI.showDateContextMenu({ field, date })
}

function onDragStart(e: DragEvent) {
	// Prevent HTML5 drag — native Electron startDrag handles the OS-level drag session.
	// Internal soundboard drops use library.dragPayload instead of dataTransfer MIME types.
	e.preventDefault()
	library.dragPayload = {
		path: props.file.path,
		name: props.file.name,
		extension: props.file.extension,
		duration: props.file.duration ?? 0,
	}
	window.electronAPI.startDrag(props.file.path)
}

function onDragEnd() {
	library.dragPayload = null
}

function formatDuration(seconds: number | null): string {
	if (seconds === null) return "--:--"
	return formatSeconds(seconds)
}

function formatDate(iso: string | null): string {
	if (!iso) return "—"
	return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
</script>

<style scoped>
.audio-row-wrapper {
	border-bottom: 1px solid transparent;
}

.audio-row {
	display: flex;
	align-items: center;
	padding: 4px 16px;
	cursor: pointer;
	transition: background 0.1s;
}

.audio-row:hover {
	background: var(--bg-hover);
}

.audio-row.active {
	background: var(--bg-selected);
}

.audio-row.playing {
	border-left: 2px solid var(--accent);
	padding-left: 14px;
}

.play-btn {
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	color: var(--text-accent);
	background: var(--bg-secondary);
	transition:
		color 0.15s,
		background 0.15s;
}

.play-btn:hover {
	color: var(--bg);
	background: var(--accent);
}

/* IMPORTANT: widths are driven by inline styles now */
.col {
	flex: none;
	flex-shrink: 0;
	min-width: 0;
	display: flex;
	align-items: center;
}

/* name column layout */
.col-name {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 4px;
	font-size: 13px;
	min-width: 0;
	overflow: hidden;
}

.name-content {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	gap: 1px;
}

.file-name,
.file-description {
	display: block;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* tags column layout */
.col-tags {
	display: flex;
	gap: 4px;
	flex-wrap: wrap;
	min-width: 0;
}

/* duration/type/date styling (width comes from inline style) */
.col-duration {
	justify-content: flex-end;
	text-align: right;
	font-size: 12px;
	color: var(--text-secondary);
	font-variant-numeric: tabular-nums;
}

.col-type {
	justify-content: center;
	text-align: center;
	font-size: 11px;
	color: var(--text-muted);
}

.col-date {
	font-size: 11px;
	color: var(--text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.expand-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 3px;
	color: var(--text-accent);
	background: none;
	border: none;
	font-size: 20px;
	cursor: pointer;
	padding: 0;
	flex-shrink: 0;
	margin-left: auto;
	transition:
		color 0.15s,
		opacity 0.15s;
}

.audio-row:hover .expand-btn {
	opacity: 1;
}

.expand-btn:hover {
	color: var(--accent);
}

.row-detail {
	padding: 6px 16px 10px 52px;
	background: var(--bg-secondary);
	border-left: 2px solid var(--accent);
}

.detail-list {
	margin: 0;
}

.detail-row {
	display: flex;
	align-items: baseline;
	padding: 2px 0;
	font-size: 11px;
	gap: 8px;
}

.detail-row dt {
	flex: 0 0 80px;
	color: var(--text-muted);
	font-weight: 500;
}

.detail-row dd {
	flex: 1;
	margin: 0;
	color: var(--text-primary);
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.detail-path {
	font-family: monospace;
	font-size: 10px;
}

.detail-tags {
	display: inline-flex;
	gap: 4px;
	flex-wrap: wrap;
}

.clickable-date {
	cursor: context-menu;
	border-radius: 3px;
	padding: 0 2px;
	transition: background 0.15s;
}

.clickable-date:hover {
	background: var(--bg-hover);
}
</style>
