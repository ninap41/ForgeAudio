<template>
  <div class="search-bar">
    <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      v-model="library.searchQuery"
      type="text"
      placeholder="Search files, #tags, descriptions..."
      class="search-input"
      @keydown.escape="library.searchQuery = ''"
    />
    <button
      v-if="library.searchQuery"
      class="clear-btn"
      @click="library.searchQuery = ''"
    >
      &times;
    </button>
  </div>
</template>

<script setup lang="ts">
import { useLibraryStore } from '@/stores/libraryStore'
const library = useLibraryStore()
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0 10px;
}

.search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  padding: 6px 0;
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.clear-btn {
  color: var(--text-muted);
  font-size: 16px;
  line-height: 1;
  padding: 2px;
}

.clear-btn:hover {
  color: var(--text-primary);
}
</style>
