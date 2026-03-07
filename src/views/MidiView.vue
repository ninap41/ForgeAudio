<template>
	<div class="midi-layout">
		<!-- Setup instructions -->
		<div class="setup-guide" :class="{ collapsed: setupCollapsed }">
			<button class="setup-toggle" @click="setupCollapsed = !setupCollapsed">
				<span class="setup-toggle-icon">{{ setupCollapsed ? "+" : "\u2212" }}</span>
				<span class="setup-toggle-label">Setup: Install Demucs for Stem Separation</span>
				<span v-if="demucsStatus === 'available'" class="setup-status status-ok">Installed</span>
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
							<code>pip3 install demucs soundfile</code><br />
							If permission errors: <code>pip3 install --user demucs soundfile</code><br />
							<em>soundfile</em> is required for torchaudio to save WAV output files.
						</div>
					</li>
					<li>
						<strong>Verify installation</strong>
						<div class="step-detail">
							<code>python3 -m demucs --help</code>
						</div>
					</li>
				</ol>
				<div class="setup-note">
					The first separation downloads the model (~80 MB) and may take a few minutes. Subsequent runs are faster.
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

		<!-- Stems list -->
		<div v-if="library.allStemFiles.length > 0" class="stems-list">
			<div class="stems-header">
				<span class="stems-title">Stems</span>
				<span class="stems-count">{{ library.allStemFiles.length }} stem{{ library.allStemFiles.length !== 1 ? "s" : "" }}</span>
			</div>

			<div class="stems-table-header">
				<span class="col-play"></span>
				<span class="col-name">Name</span>
				<span class="col-type">Type</span>
				<span class="col-source">Source</span>
				<span class="col-duration">Duration</span>
				<span class="col-actions">Actions</span>
			</div>

			<div class="stems-body">
				<div
					v-for="stem in library.allStemFiles"
					:key="stem.path"
					class="stem-row"
					:class="{ playing: isPlayingStem(stem) }"
				>
					<span class="col-play">
						<button class="play-btn" @click="library.playStem(stem)" :title="isPlayingStem(stem) ? 'Pause' : 'Play'">
							{{ isPlayingStem(stem) && library.isPlaying ? "⏸" : "▶" }}
						</button>
					</span>
					<span class="col-name" :title="stem.displayName">{{ stem.displayName }}</span>
					<span class="col-type">
						<span class="stem-badge" :class="'badge-' + stem.stemType">{{ stem.stemType }}</span>
					</span>
					<span class="col-source" :title="stem.sourceFileName">{{ stem.sourceFileName }}</span>
					<span class="col-duration">{{ formatDuration(stem.duration) }}</span>
					<span class="col-actions">
						<button class="action-btn" @click="revealStem(stem.path)" title="Reveal in Finder">📂</button>
					</span>
				</div>
			</div>
		</div>

		<!-- Empty state -->
		<div v-else-if="!library.separatingFile" class="midi-empty">
			<p class="midi-placeholder">No stems yet. Right-click an audio file in the Library and choose "Separate Stems" to get started.</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue"
import { useLibraryStore } from "@/stores/libraryStore"
import type { StemFile } from "@/stores/libraryStore"
import { formatSeconds } from "@/utils/formatSeconds"

const library = useLibraryStore()

const setupCollapsed = ref(true)
const demucsStatus = ref<"unknown" | "checking" | "available" | "unavailable">("unknown")
const stemError = ref<string | null>(null)

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

function revealStem(path: string) {
	window.electronAPI?.showInFinder(path)
}

onMounted(() => {
	if (window.electronAPI) {
		checkDemucs()
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
	}
})

onBeforeUnmount(() => {
	if (window.electronAPI) {
		window.electronAPI.removeStemsListeners()
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

.stems-table-header {
	display: flex;
	align-items: center;
	padding: 6px 16px;
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--text-muted);
	border-bottom: 1px solid var(--border);
	background: var(--bg-secondary);
}

.stems-body {
	flex: 1;
	overflow-y: auto;
}

.stem-row {
	display: flex;
	align-items: center;
	padding: 6px 16px;
	font-size: 12px;
	color: var(--text-primary);
	border-bottom: 1px solid color-mix(in srgb, var(--border) 30%, transparent);
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

.col-source {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-secondary);
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
