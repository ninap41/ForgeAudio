<template>
	<div v-if="library.currentFile" class="player">
		<audio
			ref="audioEl"
			:src="'atom://localfile' + encodeURI(library.currentFile.path)"
			@ended="onEnded"
			@timeupdate="onTimeUpdate"
			@loadedmetadata="onLoaded"
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
			<span class="time">{{ formatTime(currentTime) }}</span>
			<input
				ref="scrubberEl"
				type="range"
				class="scrubber"
				min="0"
				:max="duration || 1"
				:value="currentTime"
				step="0.1"
				:style="{ '--scrubber-pct': scrubberPercent + '%' }"
				@pointerdown="onScrubStart"
				@input="onScrubInput"
				@pointerup="onScrubEnd"
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
import { useLibraryStore } from "@/stores/libraryStore"

const library = useLibraryStore()

const audioEl = ref<HTMLAudioElement>()
const scrubberEl = ref<HTMLInputElement>()

const currentTime = ref(0)
const duration = ref(0)
const loop = ref(false)

const isScrubbing = ref(false)
const wasPlayingBeforeScrub = ref(false)

const scrubberPercent = computed(() => {
	if (!duration.value) return 0
	return (currentTime.value / duration.value) * 100
})

watch(
	() => library.currentFile,
	() => {
		if (!audioEl.value || !library.currentFile) return
		// Pause first to cancel any in-flight play() promise, then reload
		audioEl.value.pause()
		audioEl.value.load()

		// Reset timeline state for new file
		currentTime.value = 0
		duration.value = 0
		isScrubbing.value = false
	},
)

watch(
	() => library.isPlaying,
	async (playing) => {
		if (!audioEl.value) return
		if (playing) {
			try {
				await audioEl.value.play()
			} catch {
				// AbortError when load() interrupts play() during track switching — @canplay handles it
			}
		} else {
			audioEl.value.pause()
		}
	},
)

function togglePlay() {
	if (library.isPlaying) {
		library.stopPlayback()
	} else if (library.currentFile) {
		library.isPlaying = true
	}
}

function onTimeUpdate() {
	// While scrubbing, do not let timeupdate snap the UI back
	if (!isScrubbing.value && audioEl.value) {
		currentTime.value = audioEl.value.currentTime
	}
}

function onLoaded() {
	if (audioEl.value) {
		const d = audioEl.value.duration
		duration.value = Number.isFinite(d) ? d : 0
	}
}

function onEnded() {
	if (loop.value && audioEl.value) {
		audioEl.value.currentTime = 0
		audioEl.value.play().catch(() => {})
	} else {
		library.stopPlayback()
	}
}

function onCanPlay() {
	if (library.isPlaying && audioEl.value) {
		audioEl.value.play().catch(() => {})
	}
}

/**
 * Scrubbing behavior:
 * - pointerdown: enter scrubbing mode, optionally pause
 * - input: update the UI thumb live
 * - pointerup: seek and optionally resume
 * - change: keyboard-driven seeking (arrows) should still work
 */
function onScrubStart() {
	if (!audioEl.value) return
	isScrubbing.value = true
	wasPlayingBeforeScrub.value = library.isPlaying

	// Optional: pause during drag so audio doesn't "fight" the scrub.
	// If you want audio to keep playing while you drag, remove this pause.
	audioEl.value.pause()
}

function onScrubInput(e: Event) {
	currentTime.value = (e.target as HTMLInputElement).valueAsNumber
}

function onScrubEnd() {
	const val = scrubberEl.value ? scrubberEl.value.valueAsNumber : currentTime.value
	seekTo(val)

	// Optional: resume if it was playing before scrubbing
	if (wasPlayingBeforeScrub.value) {
		audioEl.value?.play().catch(() => {})
	}
}

function onScrubChange(e: Event) {
	// Keyboard scrubbing triggers change but not pointer events reliably
	const val = (e.target as HTMLInputElement).valueAsNumber
	seekTo(val)
}

function seekTo(val: number) {
	if (!audioEl.value) {
		isScrubbing.value = false
		return
	}

	const d = duration.value || 0
	const clamped = d > 0 ? Math.max(0, Math.min(val, d)) : Math.max(0, val)

	currentTime.value = clamped
	audioEl.value.currentTime = clamped

	// ✅ Correct event is "seeked" (NOT "seekTo")
	audioEl.value.addEventListener(
		"seeked",
		() => {
			isScrubbing.value = false
		},
		{ once: true },
	)
}

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
	const m = Math.floor(seconds / 60)
	const s = Math.floor(seconds % 60)
	return `${m}:${s.toString().padStart(2, "0")}`
}

// Spacebar global shortcut
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
	background: linear-gradient(to right, var(--accent) var(--scrubber-pct, 0%), var(--border) var(--scrubber-pct, 0%));
	border-radius: 2px;
	outline: none;
	cursor: pointer;
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
