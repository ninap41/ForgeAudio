<template>
	<div class="midi-layout">
		<!-- Setup instructions -->
		<div class="setup-guide" :class="{ collapsed: setupCollapsed }">
			<button class="setup-toggle" @click="setupCollapsed = !setupCollapsed">
				<span class="setup-toggle-icon">{{ setupCollapsed ? "+" : "\u2212" }}</span>
				<span class="setup-toggle-label">Setup: Install Demucs for Stem Separation</span>
				<span v-if="demucsStatus === 'available'" class="setup-status status-ok">Installed</span>
				<select v-if="demucsStatus === 'available'" class="model-select" v-model="library.selectedStemModel" @click.stop title="Select Demucs model">
					<option value="htdemucs">htdemucs (4 stems)</option>
					<option value="htdemucs_6s">htdemucs_6s (6 stems)</option>
					<option value="htdemucs_ft">htdemucs_ft (fine-tuned)</option>
				</select>
				<span v-else-if="demucsStatus === 'checking'" class="setup-status status-checking">Checking...</span>
				<span v-else-if="demucsStatus === 'unavailable'" class="setup-status status-missing">Not found</span>
			</button>
			<div v-if="!setupCollapsed" class="setup-body">
				<ol class="setup-steps">
					<li>
						<strong>Install Python 3.8+</strong>
						<div class="step-detail">
							macOS: <code>brew install python</code><br />
							Windows: Download from <span class="step-link">python.org</span> (check "Add to PATH")<br />
							Linux: <code>sudo apt install python3 python3-pip</code>
						</div>
					</li>
					<li>
						<strong>Install FFmpeg</strong>
						<div class="step-detail">
							macOS: <code>brew install ffmpeg</code><br />
							Windows: <code>choco install ffmpeg</code> or download from <span class="step-link">ffmpeg.org</span><br />
							Linux: <code>sudo apt install ffmpeg</code>
						</div>
					</li>
					<li>
						<strong>Install Demucs + SoundFile</strong>
						<div class="step-detail">
							macOS / Linux: <code>pip3 install demucs soundfile</code><br />
							Windows: <code>pip install demucs soundfile</code><br />
							If permission errors: add <code>--user</code> flag<br />
							<em>soundfile</em> is required for torchaudio to save WAV output files.
						</div>
					</li>
					<li>
						<strong>Verify installation</strong>
						<div class="step-detail">
							macOS / Linux: <code>python3 -m demucs --help</code><br />
							Windows: <code>python -m demucs --help</code>
						</div>
					</li>
				</ol>

				<div class="models-info">
					<div class="models-title">Available Models</div>
					<div class="model-card">
						<strong>htdemucs</strong> <span class="model-stems-badge">4 stems</span>
						<div class="model-desc">Drums, Vocals, Bass, Other &mdash; Default model. Best speed/quality balance.</div>
					</div>
					<div class="model-card">
						<strong>htdemucs_6s</strong> <span class="model-stems-badge">6 stems</span>
						<div class="model-desc">Drums, Vocals, Bass, Other, Guitar, Piano &mdash; Experimental. Piano quality is limited.</div>
					</div>
					<div class="model-card">
						<strong>htdemucs_ft</strong> <span class="model-stems-badge">4 stems</span>
						<div class="model-desc">Drums, Vocals, Bass, Other &mdash; Fine-tuned for ~1-3% better quality, but 4x slower.</div>
					</div>
				</div>

				<div class="setup-note">
					Each model downloads its weights (~80 MB) automatically on first use. Select a model from the dropdown above before running separation.
				</div>
				<button class="setup-check-btn" @click="checkDemucs" :disabled="demucsStatus === 'checking'">
					{{ demucsStatus === 'checking' ? 'Checking...' : 'Check Installation' }}
				</button>
			</div>
		</div>

		<!-- Error banner -->
		<div v-if="stemError" class="stem-error-banner">
			<span class="stem-error-message">{{ stemError }}</span>
			<button class="stem-error-dismiss" @click="stemError = null">&times;</button>
		</div>

		<!-- Progress banner when separation is running -->
		<div v-if="library.separatingFile" class="separation-banner">
			<div class="separation-info">
				<span class="separation-label">{{ library.separationMessage || "Separating stems..." }}</span>
				<button class="separation-cancel" @click="library.cancelStemSeparation()">Cancel</button>
			</div>
			<div class="separation-bar-track">
				<div class="separation-bar-fill" :style="{ width: library.separationProgress + '%' }"></div>
			</div>
		</div>

		<!-- Stem directory path -->
		<div v-if="stemsRootDir" class="stems-dir-bar">
			<span class="stems-dir-path" :title="stemsRootDir">{{ stemsRootDir }}</span>
			<button class="stems-dir-btn" @click="copyPath(stemsRootDir)" title="Copy path">&#x1F4CB;</button>
			<button class="stems-dir-btn" @click="revealStem(stemsRootDir)" title="Open in Finder">&#x1F4C2;</button>
		</div>

		<!-- Grouped stems list -->
		<div v-if="library.stemGroups.length > 0" class="stems-list">
			<div class="stems-header">
				<span class="stems-title">Stems</span>
				<span class="stems-count">{{ library.stemGroups.length }} source{{ library.stemGroups.length !== 1 ? "s" : "" }} &middot; {{ totalStemCount }} stem{{ totalStemCount !== 1 ? "s" : "" }}</span>
			</div>

			<div class="stems-body">
				<template v-for="group in library.stemGroups" :key="group.sourcePath">
					<!-- Group header row -->
					<div class="group-row" @click="toggleGroup(group.sourcePath)" @contextmenu.prevent="showGroupContextMenu(group)">
						<span class="group-chevron">{{ expandedGroups.has(group.sourcePath) ? "\u25BE" : "\u25B8" }}</span>
						<span class="group-name" :title="group.sourceFileName">
							{{ group.sourceFileName.replace(/\.[^.]+$/, '') }} <span class="group-date">&mdash; {{ formatGroupDate(group.createdAt) }}</span>
						</span>
						<span class="group-model-badge">{{ group.model }}</span>
						<span class="group-stem-count">{{ group.stemCount }} stem{{ group.stemCount !== 1 ? "s" : "" }}</span>
					</div>

					<!-- Child stem rows (when expanded) -->
					<template v-if="expandedGroups.has(group.sourcePath)">
						<div
							v-for="stem in group.stems"
							:key="stem.path"
							class="stem-row"
							:class="{ playing: isPlayingStem(stem) }"
							@contextmenu.prevent="showStemContextMenu(stem)"
						>
							<span class="col-play">
								<button class="play-btn" @click="toggleStemPlay(stem)" :title="isPlayingStem(stem) && library.isPlaying ? 'Pause' : 'Play'">
									{{ isPlayingStem(stem) && library.isPlaying ? "\u23F8" : "\u25B6" }}
								</button>
							</span>
							<span class="col-name" :title="stem.displayName">{{ stem.displayName }}</span>
							<span class="col-type">
								<span class="stem-badge" :class="'badge-' + stem.stemType">{{ stem.stemType }}</span>
							</span>
							<span class="col-duration">{{ formatDuration(stem.duration) }}</span>
							<span class="col-actions">
								<button class="action-btn" @click="revealStem(stem.path)" title="Reveal in Finder">&#x1F4C2;</button>
							</span>
						</div>
					</template>
				</template>
			</div>
		</div>

		<!-- Empty state -->
		<div v-else-if="!library.separatingFile" class="midi-empty">
			<p class="midi-placeholder">No stems yet. Right-click an audio file in the Library and choose "Separate Stems" to get started.</p>
		</div>

		<!-- Export modals -->
		<ExportStemGroupModal
			v-if="showExportGroupModal"
			:source-file-name="exportGroupFileName"
			:output-dir="exportGroupOutputDir"
			@close="showExportGroupModal = false"
		/>
		<ExportStemModal
			v-if="showExportStemModal"
			:stem-path="exportStemPath"
			:display-name="exportStemDisplayName"
			@close="showExportStemModal = false"
		/>
		<AddToSoundboardModal
			v-if="addToSoundboardFilePath"
			:filePath="addToSoundboardFilePath"
			@close="addToSoundboardFilePath = null"
		/>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import { useLibraryStore } from "@/stores/libraryStore"
import type { StemFile, StemGroup } from "@/stores/libraryStore"
import { formatSeconds } from "@/utils/formatSeconds"
import ExportStemGroupModal from "@/components/ExportStemGroupModal.vue"
import ExportStemModal from "@/components/ExportStemModal.vue"
import AddToSoundboardModal from "@/components/AddToSoundboardModal.vue"
import { useSoundboardStore } from "@/stores/soundboardStore"
import type { SoundboardItem } from "@/stores/soundboardStore"

const library = useLibraryStore()
const soundboardStore = useSoundboardStore()

const setupCollapsed = ref(true)
const demucsStatus = ref<"unknown" | "checking" | "available" | "unavailable">("unknown")
const stemError = ref<string | null>(null)
const expandedGroups = ref(new Set<string>())
// Model selector is bound to library.selectedStemModel

// Export modal state
const showExportGroupModal = ref(false)
const exportGroupFileName = ref("")
const exportGroupOutputDir = ref("")
const showExportStemModal = ref(false)
const exportStemPath = ref("")
const exportStemDisplayName = ref("")
const addToSoundboardFilePath = ref<string | null>(null)

const stemsRootDir = computed(() => {
	if (!library.rootDirectory) return null
	return `${library.rootDirectory}/.forgeaudio/stems`
})

const totalStemCount = computed(() => {
	return library.stemGroups.reduce((sum: number, g: { stemCount: number }) => sum + g.stemCount, 0)
})

function toggleGroup(sourcePath: string) {
	const next = new Set(expandedGroups.value)
	if (next.has(sourcePath)) {
		next.delete(sourcePath)
	} else {
		next.add(sourcePath)
	}
	expandedGroups.value = next
}

function formatGroupDate(isoString: string): string {
	const d = new Date(isoString)
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	const month = months[d.getMonth()]
	const day = d.getDate()
	const year = d.getFullYear()
	let hours = d.getHours()
	const minutes = d.getMinutes().toString().padStart(2, "0")
	const ampm = hours >= 12 ? "PM" : "AM"
	hours = hours % 12 || 12
	return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`
}

async function handleDeleteStems(sourcePath: string) {
	const result = await library.deleteStemGroup(sourcePath)
	if (result.error) {
		stemError.value = `Failed to delete stems: ${result.error}`
	} else {
		// Clean up expanded state for deleted group
		const next = new Set(expandedGroups.value)
		next.delete(sourcePath)
		expandedGroups.value = next
	}
}

async function handleDeleteIndividualStem(sourcePath: string, stemType: string) {
	const result = await library.deleteIndividualStem(sourcePath, stemType)
	if (result.error) {
		stemError.value = `Failed to delete stem: ${result.error}`
	}
}

function showGroupContextMenu(group: StemGroup) {
	window.electronAPI?.showStemGroupMenu({
		sourcePath: group.sourcePath,
		outputDir: group.outputDir,
		sourceFileName: group.sourceFileName,
	})
}

function showStemContextMenu(stem: StemFile) {
	const profileBoards = soundboardStore.getSoundboardsForProfile(library.activeProfileName)
	let recentSoundboardId: string | null = null
	let recentSoundboardName: string | null = null
	if (profileBoards.length > 0) {
		const sorted = [...profileBoards].sort((a, b) => {
			const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
			const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
			return tb - ta
		})
		recentSoundboardId = sorted[0].id
		recentSoundboardName = sorted[0].name
	}
	window.electronAPI?.showStemItemMenu({
		stemPath: stem.path,
		displayName: stem.displayName,
		sourcePath: stem.sourcePath,
		stemType: stem.stemType,
		soundboards: profileBoards.map((sb) => ({ id: sb.id, name: sb.name })),
		recentSoundboardId,
		recentSoundboardName,
	})
}

async function checkDemucs() {
	demucsStatus.value = "checking"
	try {
		const result = await window.electronAPI.checkStemsAvailable()
		demucsStatus.value = result.available ? "available" : "unavailable"
	} catch {
		demucsStatus.value = "unavailable"
	}
}

function formatDuration(d: number | null): string {
	return formatSeconds(d)
}

function isPlayingStem(stem: StemFile): boolean {
	return library.currentFile?.path === stem.path
}

function toggleStemPlay(stem: StemFile) {
	if (isPlayingStem(stem) && library.isPlaying) {
		library.stopPlayback()
	} else {
		library.playStem(stem)
	}
}

function revealStem(path: string) {
	window.electronAPI?.showInFinder(path)
}

function copyPath(path: string) {
	window.electronAPI?.copyPath(path)
}

onMounted(() => {
	if (window.electronAPI) {
		checkDemucs()

		// Ensure the stems directory exists
		if (library.rootDirectory) {
			window.electronAPI.ensureStemsDir(library.rootDirectory)
		}

		window.electronAPI.onStemsProgress((data) => {
			stemError.value = null
			library.handleStemsProgress(data)
		})
		window.electronAPI.onStemsComplete((data) => {
			stemError.value = null
			library.handleStemsComplete(data)
		})
		window.electronAPI.onStemsError((data) => {
			stemError.value = `Stem separation failed: ${data.error}`
			library.handleStemsError(data)
		})

		// Stem context menu listeners
		window.electronAPI.onStemGroupExport((data) => {
			exportGroupFileName.value = data.sourceFileName
			exportGroupOutputDir.value = data.outputDir
			showExportGroupModal.value = true
		})
		window.electronAPI.onStemGroupDelete((data) => {
			handleDeleteStems(data.sourcePath)
		})
		window.electronAPI.onStemItemPlay((data) => {
			const stem: StemFile = {
				sourceFileName: "",
				sourcePath: data.sourcePath,
				stemType: data.stemType,
				displayName: data.displayName,
				path: data.stemPath,
				duration: null,
			}
			library.playStem(stem)
		})
		window.electronAPI.onStemItemExport((data) => {
			exportStemPath.value = data.stemPath
			exportStemDisplayName.value = data.displayName
			showExportStemModal.value = true
		})
		window.electronAPI.onStemItemDelete((data) => {
			handleDeleteIndividualStem(data.sourcePath, data.stemType)
		})
		window.electronAPI.onStemItemAddToSoundboard((data) => {
			addToSoundboardFilePath.value = data.stemPath
		})
		window.electronAPI.onStemItemQuickAddToSoundboard(async (data) => {
			const duration = (await window.electronAPI.getAudioDuration(data.stemPath)) ?? 0
			const item: SoundboardItem = {
				id: `sbi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
				name: data.displayName,
				filePath: data.stemPath,
				duration,
			}
			library.addSoundboardItem(data.soundboardId, item)
		})
	}
})

onBeforeUnmount(() => {
	if (window.electronAPI) {
		window.electronAPI.removeStemsListeners()
		window.electronAPI.removeStemMenuListeners()
	}
})
</script>

<style scoped>
.midi-layout {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.setup-guide {
	border-bottom: 1px solid var(--border);
	background: var(--bg-secondary);
	flex-shrink: 0;
}

.setup-toggle {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	padding: 8px 16px;
	background: none;
	border: none;
	color: var(--text-primary);
	font-size: 12px;
	cursor: pointer;
	text-align: left;
}

.setup-toggle:hover {
	background: var(--bg-hover);
}

.setup-toggle-icon {
	width: 14px;
	font-size: 14px;
	font-weight: 600;
	color: var(--text-muted);
	flex-shrink: 0;
}

.setup-toggle-label {
	font-weight: 600;
	flex: 1;
}

.setup-status {
	font-size: 10px;
	font-weight: 600;
	padding: 1px 6px;
	border-radius: 3px;
	text-transform: uppercase;
}

.status-ok {
	background: color-mix(in srgb, var(--success) 20%, transparent);
	color: var(--success);
}

.status-checking {
	background: color-mix(in srgb, var(--accent) 20%, transparent);
	color: var(--accent);
}

.status-missing {
	background: color-mix(in srgb, var(--danger) 20%, transparent);
	color: var(--danger);
}

.model-select {
	margin-left: 8px;
	padding: 1px 4px;
	border-radius: 3px;
	border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
	background: color-mix(in srgb, var(--accent) 10%, transparent);
	color: var(--text-secondary, var(--accent));
	font-size: 0.7rem;
	font-family: inherit;
	cursor: pointer;
	outline: none;
}

.model-select:hover {
	border-color: var(--accent);
}

.model-select option {
	background: var(--bg-primary, #1a1a2e);
	color: var(--text-primary, #e0e0e0);
}

.setup-body {
	padding: 4px 16px 12px;
}

.setup-steps {
	margin: 0;
	padding-left: 20px;
	font-size: 12px;
	color: var(--text-primary);
	line-height: 1.6;
}

.setup-steps li {
	margin-bottom: 8px;
}

.setup-steps li strong {
	color: var(--text-primary);
}

.step-detail {
	margin-top: 2px;
	color: var(--text-secondary);
	font-size: 11px;
}

.step-detail code {
	background: var(--bg-primary);
	padding: 1px 5px;
	border-radius: 3px;
	font-size: 11px;
	color: var(--accent);
	border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
}

.step-link {
	color: var(--accent);
}

.models-info {
	margin-top: 10px;
	margin-bottom: 8px;
}

.models-title {
	font-size: 11px;
	font-weight: 600;
	color: var(--text-secondary);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin-bottom: 6px;
}

.model-card {
	padding: 6px 10px;
	margin-bottom: 4px;
	border-radius: 4px;
	background: color-mix(in srgb, var(--accent) 5%, transparent);
	border-left: 2px solid color-mix(in srgb, var(--accent) 30%, transparent);
	font-size: 12px;
}

.model-card strong {
	color: var(--text-primary);
}

.model-stems-badge {
	font-size: 10px;
	padding: 1px 5px;
	border-radius: 3px;
	background: color-mix(in srgb, var(--accent) 15%, transparent);
	color: var(--accent);
	margin-left: 4px;
}

.model-desc {
	font-size: 11px;
	color: var(--text-muted);
	margin-top: 2px;
}

.setup-note {
	font-size: 11px;
	color: var(--text-muted);
	margin-top: 4px;
	margin-bottom: 8px;
	font-style: italic;
}

.setup-check-btn {
	padding: 4px 12px;
	font-size: 11px;
	font-weight: 500;
	border-radius: 4px;
	background: var(--bg-primary);
	border: 1px solid var(--border);
	color: var(--text-primary);
	cursor: pointer;
}

.setup-check-btn:hover:not(:disabled) {
	background: var(--bg-hover);
}

.setup-check-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.stem-error-banner {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 10px 16px;
	background: rgba(220, 38, 38, 0.12);
	border-bottom: 1px solid rgba(220, 38, 38, 0.3);
	font-size: 12px;
	color: #ef4444;
	line-height: 1.5;
}

.stem-error-message {
	flex: 1;
	word-break: break-word;
}

.stem-error-dismiss {
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	border: none;
	background: none;
	color: #ef4444;
	font-size: 16px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 3px;
	opacity: 0.7;
}

.stem-error-dismiss:hover {
	opacity: 1;
	background: rgba(220, 38, 38, 0.15);
}

.separation-banner {
	padding: 10px 16px;
	background: color-mix(in srgb, var(--accent) 12%, var(--bg-secondary));
	border-bottom: 1px solid var(--border);
}

.separation-info {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 6px;
}

.separation-label {
	font-size: 12px;
	color: var(--text-primary);
}

.separation-cancel {
	padding: 3px 10px;
	font-size: 11px;
	border-radius: 3px;
	background: var(--bg-primary);
	border: 1px solid var(--border);
	color: var(--text-secondary);
	cursor: pointer;
}

.separation-cancel:hover {
	background: var(--bg-hover);
}

.separation-bar-track {
	height: 4px;
	background: var(--bg-primary);
	border-radius: 2px;
	overflow: hidden;
}

.separation-bar-fill {
	height: 100%;
	background: var(--accent);
	border-radius: 2px;
	transition: width 0.3s ease;
}

.stems-dir-bar {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 6px 16px;
	background: var(--bg-secondary);
	border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
	flex-shrink: 0;
}

.stems-dir-path {
	flex: 1;
	min-width: 0;
	font-size: 11px;
	font-family: monospace;
	color: var(--text-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.stems-dir-btn {
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	border: none;
	background: none;
	cursor: pointer;
	font-size: 13px;
	border-radius: 3px;
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0.6;
	transition: opacity 0.1s, background 0.1s;
}

.stems-dir-btn:hover {
	opacity: 1;
	background: var(--bg-hover);
}

.stems-list {
	display: flex;
	flex-direction: column;
	flex: 1;
	overflow: hidden;
}

.stems-header {
	display: flex;
	align-items: baseline;
	gap: 8px;
	padding: 10px 16px;
	border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
	background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
}

.stems-title {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-primary);
}

.stems-count {
	font-size: 11px;
	color: var(--text-muted);
}

.stems-body {
	flex: 1;
	overflow-y: auto;
}

/* Group row */
.group-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 7px 16px;
	font-size: 12px;
	color: var(--text-primary);
	border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	background: var(--bg-secondary);
	cursor: pointer;
	user-select: none;
}

.group-row:hover {
	background: var(--bg-hover);
}

.group-chevron {
	width: 14px;
	flex-shrink: 0;
	font-size: 12px;
	color: var(--text-muted);
}

.group-name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 600;
}

.group-date {
	font-weight: 400;
	color: var(--text-secondary);
}

.group-model-badge {
	flex-shrink: 0;
	font-size: 9px;
	color: var(--text-secondary);
	padding: 1px 5px;
	border-radius: 3px;
	background: color-mix(in srgb, var(--accent) 12%, transparent);
	font-style: italic;
}

.group-stem-count {
	flex-shrink: 0;
	font-size: 10px;
	color: var(--text-muted);
	padding: 1px 6px;
	border-radius: 3px;
	background: color-mix(in srgb, var(--border) 40%, transparent);
}

/* Stem child rows */
.stem-row {
	display: flex;
	align-items: center;
	padding: 5px 16px 5px 38px;
	font-size: 12px;
	color: var(--text-primary);
	border-bottom: 1px solid color-mix(in srgb, var(--border) 20%, transparent);
	transition: background 0.1s;
}

.stem-row:hover {
	background: var(--bg-hover);
}

.stem-row.playing {
	background: color-mix(in srgb, var(--accent) 10%, var(--bg-primary));
}

.col-play {
	width: 36px;
	flex-shrink: 0;
}

.col-name {
	flex: 2;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.col-type {
	width: 80px;
	flex-shrink: 0;
}

.col-duration {
	width: 60px;
	flex-shrink: 0;
	text-align: right;
	color: var(--text-secondary);
	font-variant-numeric: tabular-nums;
}

.col-actions {
	width: 40px;
	flex-shrink: 0;
	text-align: center;
}

.play-btn {
	width: 24px;
	height: 24px;
	border: none;
	background: none;
	color: var(--text-secondary);
	cursor: pointer;
	font-size: 12px;
	border-radius: 3px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.play-btn:hover {
	background: var(--bg-hover);
	color: var(--accent);
}

.stem-badge {
	display: inline-block;
	padding: 1px 6px;
	border-radius: 3px;
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
}

.badge-drums {
	background: color-mix(in srgb, #ff6b6b 20%, transparent);
	color: #ff6b6b;
}

.badge-vocals {
	background: color-mix(in srgb, #4ecdc4 20%, transparent);
	color: #4ecdc4;
}

.badge-bass {
	background: color-mix(in srgb, #ffe66d 20%, transparent);
	color: #ffe66d;
}

.badge-other {
	background: color-mix(in srgb, #a8a8a8 20%, transparent);
	color: #a8a8a8;
}

.badge-guitar {
	background: color-mix(in srgb, #ff9f43 20%, transparent);
	color: #ff9f43;
}

.badge-piano {
	background: color-mix(in srgb, #a29bfe 20%, transparent);
	color: #a29bfe;
}

.action-btn {
	border: none;
	background: none;
	cursor: pointer;
	font-size: 14px;
	padding: 2px;
	border-radius: 3px;
}

.action-btn:hover {
	background: var(--bg-hover);
}

.midi-empty {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;
}

.midi-placeholder {
	color: var(--text-secondary);
	font-size: 14px;
	text-align: center;
	max-width: 400px;
	line-height: 1.5;
}
</style>
