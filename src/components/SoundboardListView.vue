<template>
	<div class="sb-list-view">
		<div v-if="soundboard.items.length === 0" class="sb-empty">
			<p class="sb-empty-text">No items — click + to add</p>
		</div>
		<div v-for="item in soundboard.items" :key="item.id" class="sb-list-item">
			<button class="sb-play-btn" :title="isItemPlaying(item) ? 'Stop' : 'Play'" @click="playItem(item)">
				<svg
					v-if="!isItemPlaying(item)"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="currentColor"
					stroke="none"
				>
					<polygon points="5 3 19 12 5 21" />
				</svg>
				<svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
					<rect x="6" y="4" width="4" height="16" />
					<rect x="14" y="4" width="4" height="16" />
				</svg>
			</button>
			<span class="sb-item-name">{{ item.name }}</span>
			<span class="sb-item-duration">{{ formatDuration(item.duration) }}</span>
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
		<button class="sb-add-btn" title="Add item" @click="handleAddItem">+ Add Item</button>
	</div>
</template>

<script setup lang="ts">
import { useLibraryStore } from "../stores/libraryStore"
import type { Soundboard, SoundboardItem } from "../stores/soundboardStore"

interface Props {
	soundboard: Soundboard
}

const props = defineProps<Props>()
const library = useLibraryStore()

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

async function handleAddItem() {
	const filePath = await window.electronAPI.selectFile()
	if (!filePath) return
	const duration = (await window.electronAPI.getAudioDuration(filePath)) || 0
	const fileName = filePath.split("/").pop() || filePath
	const item: SoundboardItem = {
		id: `sbi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
		name: fileName,
		filePath,
		duration,
	}
	await library.addSoundboardItem(props.soundboard.id, item)
}

async function handleRemove(itemId: string) {
	await library.removeSoundboardItem(props.soundboard.id, itemId)
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
}

.sb-list-item:hover {
	background: var(--bg-hover);
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

.sb-item-name {
	flex: 1;
	font-size: 11px;
	color: var(--text-primary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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

.sb-add-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 6px;
	font-size: 11px;
	color: var(--text-muted);
	background: none;
	border: 1px dashed var(--border);
	border-radius: 4px;
	cursor: pointer;
	margin-top: 4px;
	transition:
		color 0.15s,
		border-color 0.15s;
}

.sb-add-btn:hover {
	color: var(--text-primary);
	border-color: var(--text-secondary);
}
</style>
