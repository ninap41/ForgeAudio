<template>
	<div v-if="soundboardStore.enabledSoundboards.length > 0" class="docked-container">
		<DockPanel
			v-for="sb in soundboardStore.enabledSoundboards"
			:key="sb.id"
			:panel-id="sb.id"
			:title="sb.name"
			:description="sb.description"
			:collapsed="sb.state === 'minimized'"
			:width="sb.width ?? 280"
			:height="sb.height ?? 350"
			@toggle-collapse="library.toggleSoundboardState(sb.id)"
			@close="library.toggleSoundboardEnabled(sb.id)"
			@resize="(w: number, h: number) => handleResize(sb.id, w, h)"
		>
			<template #header-actions>
				<button
					class="view-toggle-btn"
					:class="{ 'view-toggle-btn--active': sb.layoutType === 'LIST' }"
					title="List"
					@click.stop="setLayout(sb.id, 'LIST')"
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					>
						<line x1="4" y1="6" x2="20" y2="6" />
						<line x1="4" y1="12" x2="20" y2="12" />
						<line x1="4" y1="18" x2="20" y2="18" />
					</svg>
				</button>
				<button
					class="view-toggle-btn"
					:class="{ 'view-toggle-btn--active': sb.layoutType === 'GRID' }"
					title="Grid"
					@click.stop="setLayout(sb.id, 'GRID')"
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					>
						<rect x="3" y="3" width="7" height="7" />
						<rect x="14" y="3" width="7" height="7" />
						<rect x="3" y="14" width="7" height="7" />
						<rect x="14" y="14" width="7" height="7" />
					</svg>
				</button>
				<button
					class="view-toggle-btn"
					:class="{ 'view-toggle-btn--active': sb.layoutType === 'TABLE' }"
					title="Table"
					@click.stop="setLayout(sb.id, 'TABLE')"
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					>
						<rect x="3" y="3" width="18" height="18" rx="2" />
						<line x1="3" y1="9" x2="21" y2="9" />
						<line x1="3" y1="15" x2="21" y2="15" />
						<line x1="9" y1="3" x2="9" y2="21" />
					</svg>
				</button>
				<template v-if="sb.layoutType === 'GRID'">
					<span class="grid-cols-separator" />
					<button class="grid-cols-btn" title="Fewer columns" @click.stop="changeGridCols(sb.id, -1)">−</button>
					<span class="grid-cols-label">{{ sb.gridColumns ?? 3 }}</span>
					<button class="grid-cols-btn" title="More columns" @click.stop="changeGridCols(sb.id, 1)">+</button>
				</template>
			</template>

			<template v-if="getAggregatedTags(sb).length > 0" #subtitle>
				<div class="aggregated-tags">
					<span
						v-for="tag in getAggregatedTags(sb)"
						:key="tag"
						class="agg-tag"
						:style="{ background: getTagColor(tag), color: '#000' }"
						@click.stop="library.addTagFilter(tag)"
						>{{ tag }}</span
					>
				</div>
			</template>

			<SoundboardListView v-if="sb.layoutType === 'LIST'" :soundboard="sb" />
			<SoundboardGridView v-else-if="sb.layoutType === 'GRID'" :soundboard="sb" />
			<SoundboardTableView v-else :soundboard="sb" />
		</DockPanel>
	</div>

	<EditSoundboardItemModal
		v-if="editingSbId && editingItemId"
		:soundboard-id="editingSbId"
		:item-id="editingItemId"
		@close="
			() => {
				editingSbId = null
				editingItemId = null
			}
		"
	/>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import DockPanel from "./DockPanel.vue"
import SoundboardListView from "./SoundboardListView.vue"
import SoundboardGridView from "./SoundboardGridView.vue"
import SoundboardTableView from "./SoundboardTableView.vue"
import EditSoundboardItemModal from "./EditSoundboardItemModal.vue"
import { useLibraryStore } from "../stores/libraryStore"
import { useSoundboardStore } from "../stores/soundboardStore"
import { useTagStore } from "../stores/tagStore"
import type { Soundboard } from "../stores/soundboardStore"

const library = useLibraryStore()
const soundboardStore = useSoundboardStore()
const tagStore = useTagStore()

const editingSbId = ref<string | null>(null)
const editingItemId = ref<string | null>(null)

let saveTimer: ReturnType<typeof setTimeout> | null = null

function handleResize(id: string, width: number, height: number) {
	soundboardStore.updateSoundboard(id, { width, height })
	if (saveTimer) clearTimeout(saveTimer)
	saveTimer = setTimeout(() => {
		library.saveMetadata()
	}, 300)
}

function setLayout(id: string, layoutType: "LIST" | "GRID" | "TABLE") {
	library.updateSoundboard(id, { layoutType })
}

function changeGridCols(id: string, delta: number) {
	const sb = soundboardStore.allSoundboards.find((s) => s.id === id)
	if (!sb) return
	const current = sb.gridColumns ?? 3
	const next = Math.max(1, Math.min(8, current + delta))
	if (next !== current) {
		library.updateSoundboard(id, { gridColumns: next })
	}
}

function getAggregatedTags(sb: Soundboard): string[] {
	const tagSet = new Set<string>()
	for (const item of sb.items) {
		const file = library.files.find((f) => f.path === item.filePath || f.name === item.name)
		if (file) {
			for (const tag of file.tags) {
				tagSet.add(tag)
			}
		}
	}
	return [...tagSet]
}

function getTagColor(tag: string): string {
	return tagStore.getColor(tag) || "var(--accent)"
}

onMounted(() => {
	if (window.electronAPI) {
		window.electronAPI.onSbItemPlay((data) => {
			const sb = soundboardStore.allSoundboards.find((s) => s.id === data.soundboardId)
			const item = sb?.items.find((i) => i.id === data.itemId)
			if (item) {
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
		})
		window.electronAPI.onSbItemEdit((data) => {
			editingSbId.value = data.soundboardId
			editingItemId.value = data.itemId
		})
		window.electronAPI.onSbItemRemove((data) => {
			library.removeSoundboardItem(data.soundboardId, data.itemId)
		})
	}
})
</script>

<style scoped>
.docked-container {
	position: fixed;
	bottom: 50px;
	right: 0px;
	z-index: 50;
	display: flex;
	flex-direction: row-reverse;
	align-items: flex-end;
	pointer-events: none;
}

.view-toggle-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 3px;
	color: var(--text-muted);
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
	transition:
		color 0.15s,
		background 0.15s;
}

.view-toggle-btn:hover {
	color: var(--text-primary);
	background: var(--bg-hover);
}

.view-toggle-btn--active {
	color: var(--accent);
}

.grid-cols-separator {
	width: 1px;
	height: 14px;
	background: var(--border);
	margin: 0 2px;
	align-self: center;
}

.grid-cols-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	border-radius: 3px;
	font-size: 12px;
	font-weight: 700;
	line-height: 1;
	color: var(--text-muted);
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
	transition:
		color 0.15s,
		background 0.15s;
}

.grid-cols-btn:hover {
	color: var(--text-primary);
	background: var(--bg-hover);
}

.grid-cols-label {
	font-size: 10px;
	font-weight: 600;
	color: var(--text-secondary);
	min-width: 10px;
	text-align: center;
}

.aggregated-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 3px;
}

.agg-tag {
	font-size: 9px;
	font-weight: 600;
	padding: 1px 5px;
	border-radius: 3px;
	cursor: pointer;
	user-select: none;
	transition: opacity 0.15s;
}

.agg-tag:hover {
	opacity: 0.8;
}
</style>
