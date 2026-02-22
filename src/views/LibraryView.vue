<template>
	<div class="library-view">
		<div class="toolbar">
			<SearchBar />
			<span v-if="library.rootDirectory && !library.isScanning" class="file-count">
				{{ library.filteredFiles.length }} file{{ library.filteredFiles.length !== 1 ? "s" : "" }}
			</span>
			<div class="toolbar-actions">
				<div class="format-filter" ref="formatDropdownRef">
					<button class="filter-select format-btn" @click="formatDropdownOpen = !formatDropdownOpen">
						{{ formatLabel }} ▾
					</button>
					<div v-if="formatDropdownOpen" class="format-dropdown">
						<label v-for="ext in EXTENSIONS" :key="ext" class="format-option">
							<input type="checkbox" :value="ext" v-model="library.filterExtension" />
							{{ ext }}
						</label>
					</div>
				</div>
				<select v-model="library.filterTagged" class="filter-select">
					<option value="all">All files</option>
					<option value="tagged">Tagged</option>
					<option value="untagged">Untagged</option>
				</select>
				<button class="btn" @click="library.selectAndScanDirectory()">
					{{ library.rootDirectory ? "Change Folder" : "Open Folder" }}
				</button>
				<button
					v-if="library.rootDirectory"
					class="btn btn-subtle"
					@click="library.rescan()"
					:disabled="library.isScanning"
				>
					Rescan
				</button>
			</div>
		</div>

		<div class="content-area">
			<AlertBanner
				v-if="scanAlert"
				type="success"
				:message="scanAlert.message"
				:details="scanAlert.details"
				:duration="5000"
				@dismiss="scanAlert = null"
			/>

			<div v-if="!library.rootDirectory" class="empty-state">
				<p>No folder selected.</p>
				<button class="btn btn-accent" @click="library.selectAndScanDirectory()">Choose Audio Folder</button>
			</div>

			<SpinnerOverlay v-else-if="library.isScanning" />

			<AudioList v-else ref="audioListRef" />
		</div>

		<AddTagModal v-if="addTagFilePath" :filePath="addTagFilePath" @close="addTagFilePath = null" />
		<EditDescriptionModal v-if="editDescFilePath" :filePath="editDescFilePath" @close="editDescFilePath = null" />
		<DeleteConfirmModal v-if="deleteFilePath" :filePath="deleteFilePath" @close="deleteFilePath = null" />
		<RenameModal v-if="renameFilePath" :filePath="renameFilePath" @close="renameFilePath = null" @renamed="onRenamed" />
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue"
import { useLibraryStore } from "@/stores/libraryStore"
import SearchBar from "@/components/SearchBar.vue"
import AudioList from "@/components/AudioList.vue"
import SpinnerOverlay from "@/components/SpinnerOverlay.vue"
import AddTagModal from "@/components/AddTagModal.vue"
import EditDescriptionModal from "@/components/EditDescriptionModal.vue"
import DeleteConfirmModal from "@/components/DeleteConfirmModal.vue"
import RenameModal from "@/components/RenameModal.vue"
import AlertBanner from "@/components/AlertBanner.vue"

const EXTENSIONS = [".wav", ".mp3", ".aiff", ".flac", ".ogg", ".m4a"]

const library = useLibraryStore()
const audioListRef = ref<InstanceType<typeof AudioList>>()
const addTagFilePath = ref<string | null>(null)
const editDescFilePath = ref<string | null>(null)
const deleteFilePath = ref<string | null>(null)
const renameFilePath = ref<string | null>(null)
const formatDropdownOpen = ref(false)
const formatDropdownRef = ref<HTMLElement | null>(null)
const scanStartTime = ref<number | null>(null)
const scanAlert = ref<{ message: string; details: string } | null>(null)

watch(
	() => library.isScanning,
	(scanning, wasPrev) => {
		if (scanning) {
			scanStartTime.value = Date.now()
			scanAlert.value = null
		} else if (wasPrev && scanStartTime.value !== null) {
			const elapsed = ((Date.now() - scanStartTime.value) / 1000).toFixed(1)
			const count = library.files.length.toLocaleString()
			scanAlert.value = {
				message: `Scan complete — ${count} file${library.files.length !== 1 ? "s" : ""} found`,
				details: `in ${elapsed}s`,
			}
			scanStartTime.value = null
		}
	},
)

const formatLabel = computed(() => {
	if (library.filterExtension.length === 0) {
		return "All formats"
	} else if (library.filterExtension.length === 1) {
		return library.filterExtension[0]
	} else {
		return `${library.filterExtension.length} formats`
	}
})

function onRenamed(newPath: string) {
	renameFilePath.value = null
	audioListRef.value?.scrollToPath(newPath)
}

function handleDocumentMouseDown(e: MouseEvent) {
	if (formatDropdownRef.value && !formatDropdownRef.value.contains(e.target as Node)) {
		formatDropdownOpen.value = false
	}
}

onMounted(() => {
	document.addEventListener("mousedown", handleDocumentMouseDown)
	if (window.electronAPI) {
		window.electronAPI.onContextMenuPlay((filePath: string) => {
			const file = library.files.find((f) => f.path === filePath)
			if (file) library.playFile(file)
		})
		window.electronAPI.onContextMenuAddTag((filePath: string) => {
			addTagFilePath.value = filePath
		})
		window.electronAPI.onContextMenuEditDescription((filePath: string) => {
			editDescFilePath.value = filePath
		})
		window.electronAPI.onContextMenuDelete((filePath: string) => {
			deleteFilePath.value = filePath
		})
		window.electronAPI.onContextMenuRename((filePath: string) => {
			renameFilePath.value = filePath
		})
	}
})

onBeforeUnmount(() => {
	document.removeEventListener("mousedown", handleDocumentMouseDown)
})
</script>

<style scoped>
.library-view {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.toolbar {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 16px;
	border-bottom: 1px solid var(--border);
	background: var(--bg-secondary);
}

.toolbar-actions {
	display: flex;
	gap: 6px;
	flex-shrink: 0;
}

.filter-select {
	background: var(--bg-primary);
	border: 1px solid var(--border);
	border-radius: 4px;
	padding: 5px 8px;
	color: var(--text-primary);
	font-size: 12px;
}

.btn {
	padding: 5px 12px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 500;
	background: var(--bg-primary);
	border: 1px solid var(--border);
	color: var(--text-primary);
	transition: background 0.15s;
	white-space: nowrap;
}

.btn:hover {
	background: var(--bg-hover);
}

.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-accent {
	background: var(--accent);
	border-color: var(--accent);
	color: #000;
}

.btn-accent:hover {
	background: var(--accent-hover);
}

.btn-subtle {
	border-color: transparent;
	color: var(--text-secondary);
}

.file-count {
	font-size: 11px;
	color: var(--text-muted);
	white-space: nowrap;
	flex-shrink: 0;
}

.content-area {
	position: relative;
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.empty-state {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16px;
	color: var(--text-secondary);
}

.format-filter {
	position: relative;
	display: flex;
	align-items: center;
	width: 100px; /* for when we change the damn text inside and the wrap of text does not break */
}

.format-btn {
	padding: 5px 8px;
	cursor: pointer;
}

.format-dropdown {
	position: absolute;
	top: calc(100% + 4px);
	left: 0;
	z-index: 100;
	background: var(--bg-primary);
	border: 1px solid var(--border);
	border-radius: 4px;
	padding: 8px;
	min-width: 140px;
	display: flex;
	flex-direction: column;
	gap: 6px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.format-option {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 8px;
	cursor: pointer;
	font-size: 12px;
	color: var(--text-primary);
	border-radius: 3px;
	transition: background 0.15s;
	white-space: nowrap;
	user-select: none;
}

.format-option:hover {
	background: var(--bg-hover);
}

.format-option input[type="checkbox"] {
	width: 16px;
	height: 16px;
	cursor: pointer;
	accent-color: var(--accent);
	flex-shrink: 0;
}
</style>
