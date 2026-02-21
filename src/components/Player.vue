<template>
  <div v-if="library.currentFile" class="player">
    <audio
      ref="audioEl"
      :src="'file://' + library.currentFile.path"
      @ended="onEnded"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoaded"
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
        type="range"
        class="scrubber"
        min="0"
        :max="duration"
        :value="currentTime"
        step="0.1"
        @input="onScrub"
      />
      <span class="time">{{ formatTime(duration) }}</span>
    </div>

    <div class="player-controls">
      <button
        class="loop-btn"
        :class="{ active: loop }"
        @click="loop = !loop"
        title="Loop"
      >
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
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'

const library = useLibraryStore()
const audioEl = ref<HTMLAudioElement>()
const currentTime = ref(0)
const duration = ref(0)
const loop = ref(false)

watch(() => library.currentFile, () => {
  if (audioEl.value && library.currentFile) {
    audioEl.value.load()
    audioEl.value.play()
  }
})

watch(() => library.isPlaying, (playing) => {
  if (!audioEl.value) return
  if (playing) {
    audioEl.value.play()
  } else {
    audioEl.value.pause()
  }
})

function togglePlay() {
  if (library.isPlaying) {
    library.stopPlayback()
  } else if (library.currentFile) {
    library.isPlaying = true
  }
}

function onTimeUpdate() {
  if (audioEl.value) {
    currentTime.value = audioEl.value.currentTime
  }
}

function onLoaded() {
  if (audioEl.value) {
    duration.value = audioEl.value.duration
  }
}

function onEnded() {
  if (loop.value && audioEl.value) {
    audioEl.value.currentTime = 0
    audioEl.value.play()
  } else {
    library.stopPlayback()
  }
}

function onScrub(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  if (audioEl.value) {
    audioEl.value.currentTime = val
    currentTime.value = val
  }
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Spacebar global shortcut
function onKeydown(e: KeyboardEvent) {
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault()
    togglePlay()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
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
  background: var(--border);
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
