<template>
	<div class="sb-grid-view">
		<div v-if="soundboard.items.length === 0" class="sb-empty">
			<p class="sb-empty-text">No items — click + to add</p>
		</div>
		<div v-else class="sb-grid">
			<div
				v-for="item in soundboard.items"
				:key="item.id"
				class="sb-pad"
				:class="{ 'sb-pad--active': isItemPlaying(item) }"
				@click="playItem(item)"
			>
				<span class="sb-pad-name">{{ item.name }}</span>
				<span class="sb-pad-duration">{{ formatDuration(item.duration) }}</span>
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
	grid-template-columns: repeat(3, 1fr);
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
	cursor: pointer;
	user-select: none;
	transition:
		background 0.15s,
		border-color 0.15s,
		box-shadow 0.15s;
	min-height: 52px;
}

.sb-pad:hover {
	background: var(--bg-hover);
	border-color: var(--text-muted);
}

.sb-pad--active {
	border-color: var(--accent);
	box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 30%, transparent);
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
