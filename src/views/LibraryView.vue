<template>
  <div class="library-view">
    <div class="toolbar">
      <SearchBar />
      <div class="toolbar-actions">
        <select v-model="library.filterExtension" class="filter-select">
          <option :value="null">All formats</option>
          <option value=".wav">.wav</option>
          <option value=".mp3">.mp3</option>
          <option value=".aiff">.aiff</option>
          <option value=".flac">.flac</option>
          <option value=".ogg">.ogg</option>
          <option value=".m4a">.m4a</option>
        </select>
        <select v-model="library.filterTagged" class="filter-select">
          <option value="all">All files</option>
          <option value="tagged">Tagged</option>
          <option value="untagged">Untagged</option>
        </select>
        <button class="btn" @click="library.selectAndScanDirectory()">
          {{ library.rootDirectory ? 'Change Folder' : 'Open Folder' }}
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

    <div v-if="!library.rootDirectory" class="empty-state">
      <p>No folder selected.</p>
      <button class="btn btn-accent" @click="library.selectAndScanDirectory()">
        Choose Audio Folder
      </button>
    </div>

    <div v-else-if="library.isScanning" class="empty-state">
      <p>Scanning...</p>
    </div>

    <AudioList v-else />
  </div>
</template>

<script setup lang="ts">
import { useLibraryStore } from '@/stores/libraryStore'
import SearchBar from '@/components/SearchBar.vue'
import AudioList from '@/components/AudioList.vue'

const library = useLibraryStore()
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

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}
</style>
