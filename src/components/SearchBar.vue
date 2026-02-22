<template>
  <div class="search-bar" ref="containerRef">
    <div class="search-input-row">
      <svg
        class="search-icon"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref="inputRef"
        v-model="library.searchQuery"
        type="text"
        placeholder="Search and press Enter to filter description or search tags with # and press Enter"
        class="search-input"
        @keydown.enter.prevent="onEnter"
        @keydown.escape="onEscape"
        @keydown.arrow-down.prevent="onArrowDown"
        @keydown.arrow-up.prevent="onArrowUp"
        @focus="showDropdown = true"
        @blur="onBlur"
      />
      <button v-if="library.searchQuery" class="action-btn" @click="clearInput" title="Clear input">
        &times;
      </button>
      <button v-if="hasFilters" class="clear-all-btn" @click="onClearAll">Clear all</button>
    </div>

    <!-- Tag autocomplete dropdown — shown when input starts with # -->
    <div v-if="showDropdown && isTagMode && tagSuggestions.length > 0" class="tag-dropdown">
      <button
        v-for="(tag, i) in tagSuggestions"
        :key="tag"
        class="tag-option"
        :class="{ highlighted: i === highlightedIndex }"
        :style="{ color: tagStore.getColor(tag) }"
        @mousedown.prevent="selectTag(tag)"
      >
        <span
          class="tag-swatch"
          :style="{ background: tagStore.getColor(tag) }"
        />
        {{ tag }}
      </button>
    </div>

    <div v-if="hasFilters" class="filter-chips">
      <span v-for="tag in library.selectedTags" :key="'tag:' + tag" class="filter-chip chip-tag">
        #{{ tag }}
        <button class="chip-remove" @click="library.removeTagFilter(tag)">&times;</button>
      </span>
      <span v-for="desc in library.descriptionFilters" :key="'desc:' + desc" class="filter-chip chip-desc">
        {{ desc }}
        <button class="chip-remove" @click="library.removeDescriptionFilter(desc)">&times;</button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useTagStore } from '@/stores/tagStore'

const library = useLibraryStore()
const tagStore = useTagStore()

const inputRef = ref<HTMLInputElement>()
const containerRef = ref<HTMLElement>()
const showDropdown = ref(false)
const highlightedIndex = ref(-1)

const hasFilters = computed(() =>
  library.selectedTags.length > 0 || library.descriptionFilters.length > 0
)

// True when the user has typed # at the start of the query
const isTagMode = computed(() => library.searchQuery.trimStart().startsWith('#'))

// Tags that match the text after the # character
const tagSuggestions = computed(() => {
  if (!isTagMode.value) return []
  const query = library.searchQuery.trimStart().slice(1).toLowerCase()
  const allTags = Object.keys(tagStore.tagDefinitions)
  if (!query) return allTags
  return allTags.filter(t => t.toLowerCase().includes(query))
})

// Reset highlight when suggestions list changes
watch(tagSuggestions, () => { highlightedIndex.value = -1 })

function selectTag(tag: string) {
  library.addTagFilter(tag)
  library.searchQuery = ''
  showDropdown.value = false
  highlightedIndex.value = -1
  inputRef.value?.focus()
}

function onEnter() {
  // If a dropdown item is highlighted, select it
  if (isTagMode.value && highlightedIndex.value >= 0 && tagSuggestions.value[highlightedIndex.value]) {
    selectTag(tagSuggestions.value[highlightedIndex.value])
    return
  }

  const text = library.searchQuery.trim()
  if (!text) return

  if (isTagMode.value) {
    // #tag mode: try exact match first, then first partial match
    const tagQuery = text.slice(1).toLowerCase()
    const match =
      tagSuggestions.value.find(t => t.toLowerCase() === tagQuery) ??
      tagSuggestions.value[0]
    if (match) selectTag(match)
  } else {
    // Plain text mode: create a description filter chip
    library.addDescriptionFilter(text)
    library.searchQuery = ''
    showDropdown.value = false
  }
}

function onArrowDown() {
  if (!isTagMode.value || tagSuggestions.value.length === 0) return
  showDropdown.value = true
  highlightedIndex.value = Math.min(highlightedIndex.value + 1, tagSuggestions.value.length - 1)
}

function onArrowUp() {
  if (!isTagMode.value) return
  highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
}

function onEscape() {
  if (showDropdown.value && isTagMode.value) {
    showDropdown.value = false
  } else {
    library.searchQuery = ''
    library.clearAllFilters()
  }
}

function onBlur() {
  // Delay so a @mousedown.prevent on a dropdown item registers before blur hides the list
  setTimeout(() => { showDropdown.value = false }, 150)
}

function clearInput() {
  library.searchQuery = ''
  highlightedIndex.value = -1
  inputRef.value?.focus()
}

function onClearAll() {
  library.clearAllFilters()
}
</script>

<style scoped>
.search-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  position: relative;
}

.search-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
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
  font-size: 13px;
  min-width: 0;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.action-btn {
  color: var(--text-muted);
  font-size: 16px;
  line-height: 1;
  padding: 2px;
  flex-shrink: 0;
}

.action-btn:hover {
  color: var(--text-primary);
}

.clear-all-btn {
  font-size: 11px;
  color: var(--text-muted);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
}

.clear-all-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

/* Tag autocomplete dropdown */
.tag-dropdown {
  position: absolute;
  top: calc(100% - 6px); /* sit right below the input row, above the chips gap */
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
}

.tag-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.1s;
}

.tag-option:hover,
.tag-option.highlighted {
  background: var(--bg-hover);
}

.tag-swatch {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Active filter chips */
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 0 2px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid;
  white-space: nowrap;
}

.chip-tag {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
}

.chip-desc {
  background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
  color: var(--text-secondary);
  border-color: color-mix(in srgb, var(--text-secondary) 25%, transparent);
}

.chip-remove {
  font-size: 13px;
  line-height: 1;
  color: inherit;
  opacity: 0.6;
  margin-left: 1px;
  padding: 0 1px;
}

.chip-remove:hover {
  opacity: 1;
}
</style>
