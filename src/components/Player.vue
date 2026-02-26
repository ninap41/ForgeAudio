<template>
	<div v-if="library.currentFile" class="player">
		<audio
			ref="audioEl"
			:src="audioSrc"
			@canplay="onCanPlay"
		/>

		<div class="player-info">
			<button class="play-pause-btn" @click="togglePlay">
				<svg v-if="library.isPlaying" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
					<rect x="6" y="4" width="4" height="16" />
					<rect x="14" y="4" width="4" height="16" />
				</svg>
				<svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
					<polygon points="5,3 19,12 5,21" />
				</svg>
			</button>
			<span class="player-filename">{{ library.currentFile.name }}</span>
		</div>

		<div class="player-timeline">
			<span class="time">{{ formatTime(displayCurrentTime) }}</span>
			<input
				ref="scrubberEl"
				type="range"
				class="scrubber"
				min="0"
				:max="duration || 1"
				:value="displayCurrentTime"
				step="0.1"
				:style="{ '--scrubber-pct': scrubberPercent + '%', '--buffered-pct': bufferedPercent + '%' }"
				@pointerdown="onScrubStart"
				@input="onScrubInput"
				@pointerup="onScrubEnd"
				@pointercancel="onScrubEnd"
				@pointerleave="onScrubEnd"
				@change="onScrubChange"
			/>
			<span class="time">{{ formatTime(duration) }}</span>
		</div>

		<div class="player-controls">
			<button class="loop-btn" :class="{ active: loop }" @click="loop = !loop" title="Loop">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="17 1 21 5 17 9" />
					<path d="M3 11V9a4 4 0 0 1 4-4h14" />
					<polyline points="7 23 3 19 7 15" />
					<path d="M21 13v2a4 4 0 0 1-4 4H3" />
				</svg>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { useMediaControls } from "@vueuse/core"
import { useLibraryStore } from "@/stores/libraryStore"
import { formatSeconds } from "@/utils/formatSeconds"

const library = useLibraryStore()

const audioEl = ref<HTMLAudioElement>()
const scrubberEl = ref<HTMLInputElement>()

const audioSrc = computed(() => {
	if (!library.currentFile) return ""
	return "atom://localfile" + library.currentFile.path
		.split("/")
		.map(s => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase()))
		.join("/")
})

// useMediaControls provides reactive, writable refs for playing/currentTime/duration
// and read-only refs for buffered/ended. We omit `src` from options so the composable
// doesn't inject <source> children — the :src binding on <audio> handles our atom:// protocol.
const { playing, currentTime, duration, buffered, ended, onPlaybackError } = useMediaControls(audioEl)

// Suppress AbortError during rapid track switching
onPlaybackError(() => {})

const loop = ref(false)
const isScrubbing = ref(false)
const wasPlayingBeforeScrub = ref(false)
const scrubDisplayTime = ref(0)

// Display isolation: show scrub position during drag, live position otherwise.
// Prevents timeupdate-driven currentTime updates from snapping the scrubber back mid-drag.
const displayCurrentTime = computed(() =>
	isScrubbing.value ? scrubDisplayTime.value : currentTime.value
)

const scrubberPercent = computed(() => {
	if (!duration.value) return 0
	return Math.min(100, Math.round((displayCurrentTime.value / duration.value) * 100))
})

const bufferedPercent = computed(() => {
	if (!duration.value || !buffered.value.length) return 0
	const maxEnd = Math.max(...buffered.value.map(r => r[1]))
	return Math.min(100, Math.round((maxEnd / duration.value) * 100))
})

// ─── Track switching ────────────────────────────────────────────────────────

let awaitingPlayback = false

watch(audioSrc, () => {
	isScrubbing.value = false
	scrubDisplayTime.value = 0
	awaitingPlayback = library.isPlaying
	// Stop current playback while the browser loads the new source.
	// awaitingPlayback guard prevents this from propagating to library.isPlaying.
	playing.value = false
})

// canplay event fires when the browser can actually start playing the media.
// This is more reliable than watch(duration) which fires at loadedmetadata —
// before the media is ready, causing .play() to fail on rapid track switches.
function onCanPlay() {
	if (!awaitingPlayback) return
	awaitingPlayback = false
	if (library.playbackRange) {
		currentTime.value = library.playbackRange[0]
	} else if (library.playbackOffset != null && library.playbackOffset > 0) {
		currentTime.value = library.playbackOffset
	}
	playing.value = true
}

// ─── Bidirectional playing sync ─────────────────────────────────────────────

// Store → composable
watch(() => library.isPlaying, (wantPlay) => {
	if (wantPlay) {
		if (awaitingPlayback) return
		if (duration.value > 0) {
			playing.value = true
		} else {
			awaitingPlayback = true
		}
	} else {
		awaitingPlayback = false
		playing.value = false
	}
})

// Composable → store (organic changes: ended, browser-initiated pause, etc.)
watch(playing, (val) => {
	if (awaitingPlayback) return
	if (!val && ended.value && loop.value) return
	if (library.isPlaying !== val) {
		library.isPlaying = val
	}
})

// ─── Partial playback range enforcement ─────────────────────────────────────

watch(currentTime, (t) => {
	if (!library.playbackRange) return
	if (awaitingPlayback || isScrubbing.value) return
	const rangeEnd = library.playbackRange[1]
	if (t >= rangeEnd) {
		if (loop.value) {
			currentTime.value = library.playbackRange[0]
		} else {
			playing.value = false
			currentTime.value = rangeEnd
			library.stopPlayback()
		}
	}
})

// ─── Loop / ended ───────────────────────────────────────────────────────────

watch(ended, (isEnded) => {
	if (!isEnded) return
	if (loop.value) {
		// Seek to appropriate start position for loop
		if (library.playbackRange) {
			currentTime.value = library.playbackRange[0]
		} else if (library.playbackOffset != null && library.playbackOffset > 0) {
			currentTime.value = library.playbackOffset
		} else {
			currentTime.value = 0
		}
		playing.value = true
	} else {
		library.stopPlayback()
	}
})

// ─── Restart playback (from soundboard restart button) ──────────────────────

watch(() => library.playbackRestartCounter, () => {
	if (library.playbackRange) {
		currentTime.value = library.playbackRange[0]
	} else if (library.playbackOffset != null && library.playbackOffset > 0) {
		currentTime.value = library.playbackOffset
	} else {
		currentTime.value = 0
	}
	if (!playing.value) {
		playing.value = true
	}
})

// ─── Scrubbing ──────────────────────────────────────────────────────────────

function onScrubStart() {
	isScrubbing.value = true
	wasPlayingBeforeScrub.value = library.isPlaying
	scrubDisplayTime.value = currentTime.value
	playing.value = false
}

function onScrubInput(e: Event) {
	const val = (e.target as HTMLInputElement).valueAsNumber
	if (isScrubbing.value) {
		scrubDisplayTime.value = val
	} else {
		// Click-to-seek: input fired without pointerdown (touch tap, accessibility)
		const d = duration.value || 0
		const clamped = d > 0 ? Math.max(0, Math.min(val, d)) : Math.max(0, val)
		currentTime.value = clamped
	}
}

function onScrubEnd() {
	if (!isScrubbing.value) return

	const d = duration.value || 0
	const clamped = d > 0 ? Math.max(0, Math.min(scrubDisplayTime.value, d)) : Math.max(0, scrubDisplayTime.value)

	currentTime.value = clamped
	isScrubbing.value = false

	if (wasPlayingBeforeScrub.value) {
		playing.value = true
	}
}

function onScrubChange(e: Event) {
	if (isScrubbing.value) return
	const val = (e.target as HTMLInputElement).valueAsNumber
	const d = duration.value || 0
	const clamped = d > 0 ? Math.max(0, Math.min(val, d)) : Math.max(0, val)
	currentTime.value = clamped
}

// ─── Toggle / format ────────────────────────────────────────────────────────

function togglePlay() {
	if (library.isPlaying) {
		library.stopPlayback()
	} else if (library.currentFile) {
		library.isPlaying = true
	}
}

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
	const h = Math.floor(seconds / 3600)
	if (h > 0) {
		const m = Math.floor((seconds % 3600) / 60)
		const s = Math.floor(seconds % 60)
		return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
	}
	return formatSeconds(seconds)
}

// ─── Spacebar global shortcut ───────────────────────────────────────────────

function onKeydown(e: KeyboardEvent) {
	if (e.code === "Space" && e.target === document.body) {
		e.preventDefault()
		togglePlay()
	}
}

onMounted(() => {
	document.addEventListener("keydown", onKeydown)
})

onUnmounted(() => {
	document.removeEventListener("keydown", onKeydown)
})
</script>

<style scoped>
.player {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 16px;
	border-top: 1px solid var(--border);
	background: var(--bg-secondary);
	height: 52px;
}

.player-info {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
	flex-shrink: 0;
	max-width: 250px;
}

.play-pause-btn {
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: var(--accent);
	color: #000;
	flex-shrink: 0;
	transition: background 0.15s;
}

.play-pause-btn:hover {
	background: var(--accent-hover);
}

.player-filename {
	font-size: 12px;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.player-timeline {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 8px;
	height: 2rem;
}

.time {
	font-size: 11px;
	color: var(--text-muted);
	font-variant-numeric: tabular-nums;
	width: 36px;
	text-align: center;
}

.scrubber {
	flex: 1;
	height: 4px;
	-webkit-appearance: none;
	appearance: none;
	border-radius: 2px;
	outline: none;
	cursor: pointer;

	background: linear-gradient(
		to right,
		/* played */ var(--accent) 0%,
		var(--accent) var(--scrubber-pct, 0%),
		/* buffered but not yet played */ color-mix(in srgb, var(--accent) 80%, var(--border)) var(--scrubber-pct, 0%),
		color-mix(in srgb, var(--accent) 30%, var(--border)) var(--buffered-pct, 0%),
		/* unbuffered */ var(--border) var(--buffered-pct, 0%),
		var(--border) 100%
	);
}
.scrubber::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: var(--accent);
	cursor: pointer;
}

.player-controls {
	flex-shrink: 0;
}

.loop-btn {
	color: var(--text-muted);
	padding: 4px;
	border-radius: 4px;
	transition: color 0.15s;
}

.loop-btn:hover {
	color: var(--text-primary);
}

.loop-btn.active {
	color: var(--accent);
}
</style>
