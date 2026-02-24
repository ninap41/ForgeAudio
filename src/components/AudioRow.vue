<template>
	<div
		class="audio-row"
		:class="{ active: isActive, playing: isActive && library.isPlaying }"
		:data-path="file.path"
		draggable="true"
		@click="library.playFile(file)"
		@contextmenu.prevent="onContextMenu"
		@dragstart="onDragStart"
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
			<span class="file-name">{{ file.name }}</span>
			<span v-if="file.description" class="file-description">{{ file.description }}</span>
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

		<div class="col col-date" :style="{ width: widths.createdAt + 'px' }">
			{{ formatDate(file.createdAt) }}
		</div>

		<div class="col col-date" :style="{ width: widths.modifiedAt + 'px' }">
			{{ formatDate(file.modifiedAt) }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useLibraryStore, type AudioFile } from "@/stores/libraryStore"
import { useSoundboardStore } from "@/stores/soundboardStore"
import TagChip from "./TagChip.vue"

type ColKey = "play" | "name" | "tags" | "duration" | "type" | "createdAt" | "modifiedAt"

const props = defineProps<{
	file: AudioFile
	widths: Record<ColKey, number> // reactive object passed from parent
}>()

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
	})
}

function onDragStart(e: DragEvent) {
	if (!e.dataTransfer) return
	e.dataTransfer.effectAllowed = "copy"
	e.dataTransfer.setData(
		"application/x-forgeaudio-file",
		JSON.stringify({
			path: props.file.path,
			name: props.file.name,
			extension: props.file.extension,
			duration: props.file.duration ?? 0,
		}),
	)
}

function formatDuration(seconds: number | null): string {
	if (seconds === null) return "--:--"
	const m = Math.floor(seconds / 60)
	const s = Math.floor(seconds % 60)
	return `${m}:${s.toString().padStart(2, "0")}`
}

function formatDate(iso: string | null): string {
	if (!iso) return "—"
	return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
</script>

<style scoped>
.audio-row {
	display: flex;
	align-items: center;
	padding: 4px 16px;
	cursor: pointer;
	transition: background 0.1s;
	border-bottom: 1px solid transparent;
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
	border-radius: 50%;
	color: var(--text-secondary);
	transition:
		color 0.15s,
		background 0.15s;
}

.play-btn:hover {
	color: var(--text-primary);
	background: var(--bg-hover);
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
	flex-direction: column;
	justify-content: flex-start; /* ✅ top */
	align-items: flex-start; /* ✅ left */
	gap: 1px;
	font-size: 13px;

	min-width: 0; /* ✅ keep for truncation */
	overflow: hidden; /* ✅ keep for truncation */
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
</style>
