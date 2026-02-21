<template>
  <div class="audio-list">
    <div class="list-header">
      <div class="col col-play"></div>
      <div class="col col-name">Filename</div>
      <div class="col col-tags">Tags</div>
      <div class="col col-duration">Duration</div>
      <div class="col col-type">Type</div>
    </div>
    <div class="list-body" ref="listBody">
      <div v-if="library.filteredFiles.length === 0" class="no-results">
        No audio files found.
      </div>
      <AudioRow
        v-for="file in library.filteredFiles"
        :key="file.path"
        :file="file"
      />
    </div>
    <div class="list-footer">
      {{ library.filteredFiles.length }} file{{ library.filteredFiles.length !== 1 ? 's' : '' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import AudioRow from './AudioRow.vue'

const library = useLibraryStore()
const listBody = ref<HTMLElement>()
</script>

<style scoped>
.audio-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.list-body {
  flex: 1;
  overflow-y: auto;
}

.list-footer {
  flex-shrink: 0;
  padding: 6px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
  font-size: 11px;
  color: var(--text-muted);
}

.col { flex-shrink: 0; }
.col-play { width: 36px; }
.col-name { flex: 2; min-width: 0; }
.col-tags { flex: 1.5; min-width: 0; }
.col-duration { width: 70px; text-align: right; }
.col-type { width: 60px; text-align: center; }

.no-results {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}
</style>
