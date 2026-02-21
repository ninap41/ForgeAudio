<template>
  <div
    class="audio-row"
    :class="{ active: isActive, playing: isActive && library.isPlaying }"
    @click="library.playFile(file)"
    @contextmenu.prevent="onContextMenu"
  >
    <div class="col col-play">
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
    <div class="col col-name" :title="file.path">
      {{ file.name }}
    </div>
    <div class="col col-tags">
      <TagChip
        v-for="tag in file.tags"
        :key="tag"
        :tag="tag"
        :removable="true"
        @remove="library.removeTagFromFile(file.path, tag)"
        @click.stop
      />
    </div>
    <div class="col col-duration">
      {{ formatDuration(file.duration) }}
    </div>
    <div class="col col-type">
      {{ file.extension }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLibraryStore, type AudioFile } from '@/stores/libraryStore'
import TagChip from './TagChip.vue'

const props = defineProps<{ file: AudioFile }>()
const library = useLibraryStore()

const isActive = computed(() => library.currentFile?.path === props.file.path)

function togglePlay() {
  if (isActive.value && library.isPlaying) {
    library.stopPlayback()
  } else {
    library.playFile(props.file)
  }
}

function onContextMenu() {
  window.electronAPI.showContextMenu({ filePath: props.file.path })
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
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
  transition: color 0.15s, background 0.15s;
}

.play-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.col { flex-shrink: 0; }
.col-play { width: 36px; }
.col-name {
  flex: 2;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}
.col-tags {
  flex: 1.5;
  min-width: 0;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.col-duration {
  width: 70px;
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
.col-type {
  width: 60px;
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
}
</style>
