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
				placeholder="Search… Enter = filter, ! = exclude, # = tag, !# = exclude tag"
				class="search-input"
				@keydown.enter.prevent="onEnter"
				@keydown.escape="onEscape"
				@keydown.arrow-down.prevent="onArrowDown"
				@keydown.arrow-up.prevent="onArrowUp"
				@focus="showDropdown = true"
				@blur="onBlur"
			/>
			<button v-if="library.searchQuery" class="action-btn" @click="clearInput" title="Clear input">&times;</button>
			<button v-if="hasFilters" class="clear-all-btn" @click="onClearAll">Clear all</button>
			<button class="help-btn" @click="showHelpModal = true" title="Filter help">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
					<line x1="12" y1="17" x2="12.01" y2="17" />
				</svg>
			</button>
		</div>

		<!-- Tag autocomplete dropdown — shown when input starts with # or !# -->
		<div
			v-if="showDropdown && (isTagMode || isExcludeTagMode) && tagSuggestions.length > 0"
			class="tag-dropdown"
			:class="{ 'exclude-mode': isExcludeTagMode }"
		>
			<button
				v-for="(tag, i) in tagSuggestions"
				:key="tag"
				class="tag-option"
				:class="{ highlighted: i === highlightedIndex }"
				:style="{ color: tagStore.getColor(tag) }"
				@mousedown.prevent="isExcludeTagMode ? selectExcludeTag(tag) : selectTag(tag)"
			>
				<span class="tag-swatch" :style="{ background: tagStore.getColor(tag) }" />
				{{ tag }}
			</button>
		</div>

		<div v-if="hasFilters" class="filter-chips">
			<span>
				<span v-for="tag in library.selectedTags" :key="'tag:' + tag" class="filter-chip chip-tag">
					#{{ tag }}
					<button class="chip-remove" @click="library.removeTagFilter(tag)">&times;</button>
				</span>
			</span>
			<span v-for="tag in library.excludedTags" :key="'extag:' + tag" class="filter-chip chip-exclude-tag">
				!#{{ tag }}
				<button class="chip-remove" @click="library.removeExcludeTagFilter(tag)">&times;</button>
			</span>
			<span v-for="desc in library.descriptionFilters" :key="'desc:' + desc" class="filter-chip chip-desc">
				{{ desc }}
				<button class="chip-remove" @click="library.removeDescriptionFilter(desc)">&times;</button>
			</span>
			<span
				v-for="desc in library.excludedDescriptionFilters"
				:key="'exdesc:' + desc"
				class="filter-chip chip-exclude-desc"
			>
				!{{ desc }}
				<button class="chip-remove" @click="library.removeExcludeDescriptionFilter(desc)">&times;</button>
			</span>
		</div>

		<FilterHelpModal v-if="showHelpModal" @close="showHelpModal = false" />
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useLibraryStore } from "@/stores/libraryStore"
import { useTagStore } from "@/stores/tagStore"
import FilterHelpModal from "@/components/FilterHelpModal.vue"

const library = useLibraryStore()
const tagStore = useTagStore()

const inputRef = ref<HTMLInputElement>()
const containerRef = ref<HTMLElement>()
const showDropdown = ref(false)
const highlightedIndex = ref(-1)
const showHelpModal = ref(false)

const hasFilters = computed(
	() =>
		library.selectedTags.length > 0 ||
		library.excludedTags.length > 0 ||
		library.descriptionFilters.length > 0 ||
		library.excludedDescriptionFilters.length > 0,
)

// True when the user has typed # at the start of the query
const isTagMode = computed(() => library.searchQuery.trimStart().startsWith("#"))

// True when the user has typed !# at the start of the query
const isExcludeTagMode = computed(() => library.searchQuery.trimStart().startsWith("!#"))

// True when the user has typed ! (but not !#) at the start — exclude description mode
const isExcludeDescMode = computed(() => {
	const q = library.searchQuery.trimStart()
	return q.startsWith("!") && !q.startsWith("!#")
})

// Tags that match the text after the # or !# prefix
const tagSuggestions = computed(() => {
	if (!isTagMode.value && !isExcludeTagMode.value) return []
	const raw = library.searchQuery.trimStart()
	const query = isExcludeTagMode.value
		? raw.slice(2).toLowerCase() // strip "!#"
		: raw.slice(1).toLowerCase() // strip "#"
	const allTags = Object.keys(tagStore.tagDefinitions)
	if (!query) return allTags
	return allTags.filter((t) => t.toLowerCase().includes(query))
})

// Reset highlight when suggestions list changes
watch(tagSuggestions, () => {
	highlightedIndex.value = -1
})

function selectTag(tag: string) {
	library.addTagFilter(tag)
	library.searchQuery = ""
	showDropdown.value = false
	highlightedIndex.value = -1
	inputRef.value?.focus()
}

function selectExcludeTag(tag: string) {
	library.addExcludeTagFilter(tag)
	library.searchQuery = ""
	showDropdown.value = false
	highlightedIndex.value = -1
	inputRef.value?.focus()
}

function onEnter() {
	// If a dropdown item is highlighted in exclude mode, select it
	if (isExcludeTagMode.value && highlightedIndex.value >= 0 && tagSuggestions.value[highlightedIndex.value]) {
		selectExcludeTag(tagSuggestions.value[highlightedIndex.value])
		return
	}

	// If a dropdown item is highlighted in include mode, select it
	if (isTagMode.value && highlightedIndex.value >= 0 && tagSuggestions.value[highlightedIndex.value]) {
		selectTag(tagSuggestions.value[highlightedIndex.value])
		return
	}

	const text = library.searchQuery.trim()
	if (!text) return

	if (isExcludeTagMode.value) {
		// !#tag mode: try exact match first, then first partial match
		const tagQuery = text.slice(text.indexOf("#") + 1).toLowerCase()
		const match = tagSuggestions.value.find((t) => t.toLowerCase() === tagQuery) ?? tagSuggestions.value[0]
		if (match) selectExcludeTag(match)
	} else if (isTagMode.value) {
		// #tag mode: try exact match first, then first partial match
		const tagQuery = text.slice(1).toLowerCase()
		const match = tagSuggestions.value.find((t) => t.toLowerCase() === tagQuery) ?? tagSuggestions.value[0]
		if (match) selectTag(match)
	} else if (isExcludeDescMode.value) {
		// !text mode: create an exclude description filter chip
		const desc = text.slice(text.indexOf("!") + 1).trim()
		if (desc) {
			library.addExcludeDescriptionFilter(desc)
			library.searchQuery = ""
			showDropdown.value = false
		}
	} else {
		// Plain text mode: create a description filter chip
		library.addDescriptionFilter(text)
		library.searchQuery = ""
		showDropdown.value = false
	}
}

function onArrowDown() {
	if ((!isTagMode.value && !isExcludeTagMode.value) || tagSuggestions.value.length === 0) return
	showDropdown.value = true
	highlightedIndex.value = Math.min(highlightedIndex.value + 1, tagSuggestions.value.length - 1)
}

function onArrowUp() {
	if (!isTagMode.value && !isExcludeTagMode.value) return
	highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
}

function onEscape() {
	if (showDropdown.value && (isTagMode.value || isExcludeTagMode.value)) {
		showDropdown.value = false
	} else {
		library.searchQuery = ""
		library.clearAllFilters()
	}
}

function onBlur() {
	// Delay so a @mousedown.prevent on a dropdown item registers before blur hides the list
	setTimeout(() => {
		showDropdown.value = false
	}, 150)
}

function clearInput() {
	library.searchQuery = ""
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
	transition:
		color 0.15s,
		background 0.15s;
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

.tag-dropdown.exclude-mode {
	border-color: color-mix(in srgb, var(--danger) 40%, transparent);
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

.chip-exclude-tag {
	background: color-mix(in srgb, red 15%, transparent);
	color: red;
	border-color: color-mix(in srgb, red 35%, transparent);
}

.chip-exclude-desc {
	background: color-mix(in srgb, red 10%, transparent);
	color: red;
	border-color: color-mix(in srgb, red 25%, transparent);
}

.chip-desc {
	background: color-mix(in srgb, var(--accent) 10%, transparent);
	color: var(--text-secondary);
	border-color: color-mix(in srgb, var(--accent) 25%, transparent);
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

.help-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-muted);
	flex-shrink: 0;
	padding: 2px;
	border-radius: 4px;
	transition: color 0.15s;
}

.help-btn:hover {
	color: var(--text-primary);
}
</style>
