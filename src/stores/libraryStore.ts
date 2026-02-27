import { ref, computed, reactive } from "vue"
import { useTagStore } from "./tagStore"
import { useThemeStore } from "./themeStore"
import { useSettingsStore } from "./settingsStore"
import { useSoundboardStore } from "./soundboardStore"
import type { Soundboard, SoundboardItem } from "./soundboardStore"

export type SortColumn = "name" | "tags" | "duration" | "type" | "createdAt" | "modifiedAt" | "lastPlayed"

export interface DateFilter {
	id: string
	field: "createdAt" | "modifiedAt" | "lastPlayed"
	operator: "on" | "before" | "after"
	date: string // ISO 8601
}

export interface AudioFile {
	path: string
	name: string
	extension: string
	size: number
	duration: number | null
	tags: string[]
	description: string
	lastPlayed: string | null
	createdAt: string | null
	modifiedAt: string | null
}

export interface LibraryMetadata {
	version: number
	files: Record<
		string,
		{
			tags: string[]
			description: string
			lastPlayed: string | null
		}
	>
	tags: Record<string, { color: string }>
	theme?: Record<string, string>
	settings?: {
		scannerBatchSize?: number
		durationConcurrency?: number
		autoLoadDurations?: boolean
		autoBackup?: boolean
		showBootSplash?: boolean
	}
	lastUsedTag?: string | null
	activeProfile?: string
	profiles?: Record<string, ProfileEntry>
	soundboards?: Record<string, Soundboard>
	sortColumn?: SortColumn
	sortDirection?: "asc" | "desc"
	filters?: {
		selectedTags: string[]
		excludedTags: string[]
		descriptionFilters: string[]
		excludedDescriptionFilters: string[]
		dateFilters: DateFilter[]
		filterExtension: string[]
		filterTagged: "all" | "tagged" | "untagged"
	}
}

export interface ProfileSnapshot {
	files: Record<string, { tags: string[]; description: string; lastPlayed: string | null }>
	tags: Record<string, { color: string }>
	theme?: Record<string, string>
	settings?: {
		scannerBatchSize?: number
		durationConcurrency?: number
		autoLoadDurations?: boolean
		autoBackup?: boolean
		showBootSplash?: boolean
	}
	rootDirectory?: string | null
	soundboards?: Record<string, Soundboard>
	filters?: {
		selectedTags: string[]
		excludedTags: string[]
		descriptionFilters: string[]
		excludedDescriptionFilters: string[]
		dateFilters: DateFilter[]
		filterExtension: string[]
		filterTagged: "all" | "tagged" | "untagged"
	}
	sortColumn?: SortColumn
	sortDirection?: "asc" | "desc"
}

export interface ProfileEntry {
	name: string
	createdAt: string
	snapshot: ProfileSnapshot
}

// Module-scope state (singleton)
const files = ref<AudioFile[]>([])
const rootDirectory = ref<string | null>(null)
const searchQuery = ref("")
const filterExtension = ref<string[]>([])
const filterTagged = ref<"all" | "tagged" | "untagged">("all")
const isScanning = ref(false)
const sortColumn = ref<SortColumn>("name")
const sortDirection = ref<"asc" | "desc">("asc")

// Chip-based active filters
const selectedTags = ref<string[]>([])
const excludedTags = ref<string[]>([])
const descriptionFilters = ref<string[]>([])
const excludedDescriptionFilters = ref<string[]>([])
const dateFilters = ref<DateFilter[]>([])

// Last metadata read from disk — used as a base when saving to avoid erasing
// tags for files that haven't arrived in the scan yet (partial-scan data loss).
let lastReadMeta: LibraryMetadata | null = null

// Profile state
const activeProfileName = ref<string>("Default")
const profiles = ref<Record<string, ProfileEntry>>({})

// Last used tag for quick-tag context menu
const lastUsedTag = ref<string | null>(null)

// Current playback
const currentFile = ref<AudioFile | null>(null)
const isPlaying = ref(false)

// Partial playback constraints (set by soundboard items with partial === true)
const playbackOffset = ref<number | null>(null)
const playbackRange = ref<[number, number] | null>(null)
const playbackRestartCounter = ref(0)

// Drag payload for native file drag (shared between AudioRow and drop targets)
const dragPayload = ref<{ path: string; name: string; extension: string; duration: number } | null>(null)

const filteredFiles = computed(() => {
	let result = files.value

	// Extension filter
	if (filterExtension.value.length > 0) {
		result = result.filter((f) => filterExtension.value.includes(f.extension))
	}

	// Tag chip filters — file must have ALL selected tags
	// "uncategorized" is a special virtual tag meaning "file has 0 tags"
	if (selectedTags.value.length > 0) {
		result = result.filter((f) =>
			selectedTags.value.every((tag) => {
				if (tag === "uncategorized") return f.tags.length === 0
				return f.tags.includes(tag)
			}),
		)
	}

	// Excluded tag filters — file must NOT have ANY excluded tag
	if (excludedTags.value.length > 0) {
		result = result.filter((f) =>
			!excludedTags.value.some((tag) => {
				if (tag === "uncategorized") return f.tags.length === 0
				return f.tags.includes(tag)
			}),
		)
	}

	// Description chip filters — each chip must match name or description (AND across chips)
	if (descriptionFilters.value.length > 0) {
		result = result.filter((f) =>
			descriptionFilters.value.every((q) => {
				const lq = q.toLowerCase()
				return f.name.toLowerCase().includes(lq) || f.description.toLowerCase().includes(lq)
			}),
		)
	}

	// Excluded description filters — file must NOT match ANY excluded description
	if (excludedDescriptionFilters.value.length > 0) {
		result = result.filter(
			(f) =>
				!excludedDescriptionFilters.value.some((q) => {
					const lq = q.toLowerCase()
					return f.name.toLowerCase().includes(lq) || f.description.toLowerCase().includes(lq)
				}),
		)
	}

	// Date filters — file must satisfy ALL date filters (AND)
	// Normalize to UTC calendar day to avoid timezone-dependent comparisons
	if (dateFilters.value.length > 0) {
		result = result.filter((f) =>
			dateFilters.value.every((df) => {
				const raw = f[df.field]
				if (!raw) return false
				const fd = new Date(raw)
				const ft = Date.UTC(fd.getUTCFullYear(), fd.getUTCMonth(), fd.getUTCDate())
				const dd = new Date(df.date)
				const dt = Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth(), dd.getUTCDate())
				switch (df.operator) {
					case "on":
						return ft === dt
					case "before":
						return ft < dt
					case "after":
						return ft > dt
					default:
						return true
				}
			}),
		)
	}

	// Sort — nulls always land at the end regardless of direction
	const dir = sortDirection.value === "asc" ? 1 : -1
	return [...result].sort((a, b) => {
		switch (sortColumn.value) {
			case "name":
				return dir * a.name.localeCompare(b.name)
			case "tags":
				return dir * (a.tags.length - b.tags.length)
			case "duration": {
				if (a.duration === null && b.duration === null) return 0
				if (a.duration === null) return 1
				if (b.duration === null) return -1
				return dir * (a.duration - b.duration)
			}
			case "type":
				return dir * a.extension.localeCompare(b.extension)
			case "createdAt": {
				if (!a.createdAt && !b.createdAt) return 0
				if (!a.createdAt) return 1
				if (!b.createdAt) return -1
				return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
			}
			case "modifiedAt": {
				if (!a.modifiedAt && !b.modifiedAt) return 0
				if (!a.modifiedAt) return 1
				if (!b.modifiedAt) return -1
				return dir * (new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime())
			}
			case "lastPlayed": {
				if (!a.lastPlayed && !b.lastPlayed) return 0
				if (!a.lastPlayed) return 1
				if (!b.lastPlayed) return -1
				return dir * (new Date(a.lastPlayed).getTime() - new Date(b.lastPlayed).getTime())
			}
			default:
				return 0
		}
	})
})

export function useLibraryStore() {
	const tagStore = useTagStore()
	const themeStore = useThemeStore()
	const settingsStore = useSettingsStore()
	const soundboardStore = useSoundboardStore()

	async function loadMetadata() {
		try {
			const metaRaw = await window.electronAPI.readMetadata()
			const meta: LibraryMetadata = JSON.parse(metaRaw)
			lastReadMeta = meta

			tagStore.loadTags(meta.tags)
			themeStore.loadTheme(meta.theme)
			settingsStore.loadSettings(meta.settings)
			soundboardStore.loadSoundboards(meta.soundboards || {})

			if (meta.lastUsedTag) {
				lastUsedTag.value = meta.lastUsedTag
			}
			if (meta.activeProfile) {
				activeProfileName.value = meta.activeProfile
			}
			if (meta.profiles) {
				profiles.value = meta.profiles
			}

			// Restore sort state
			if (meta.sortColumn) {
				sortColumn.value = meta.sortColumn
			}
			if (meta.sortDirection) {
				sortDirection.value = meta.sortDirection
			}

			// Restore filter state
			if (meta.filters) {
				selectedTags.value = meta.filters.selectedTags || []
				excludedTags.value = meta.filters.excludedTags || []
				descriptionFilters.value = meta.filters.descriptionFilters || []
				excludedDescriptionFilters.value = meta.filters.excludedDescriptionFilters || []
				dateFilters.value = (meta.filters.dateFilters || []).map((df) => ({ ...df }))
				filterExtension.value = meta.filters.filterExtension || []
				filterTagged.value = meta.filters.filterTagged || "all"
			}
		} catch {
			// library.json missing or corrupt — keep defaults
		}
	}

	async function initFromPersistedDirectory() {
		await loadMetadata()
		const dir = await window.electronAPI.getRootDirectory()
		if (dir) {
			rootDirectory.value = dir
			await rescan()
		}
	}

	async function selectAndScanDirectory() {
		const dir = await window.electronAPI.selectDirectory()
		if (!dir) return

		rootDirectory.value = dir
		await window.electronAPI.setRootDirectory(dir)
		await rescan()
	}

	async function createAndSetDirectory(fullPath: string) {
		rootDirectory.value = fullPath
		await window.electronAPI.setRootDirectory(fullPath)
		await rescan()
	}

	async function rescan() {
		if (!rootDirectory.value) return

		isScanning.value = true
		files.value = []

		try {
			// Read metadata first (fast local file read) so it's ready when batches arrive
			const metaRaw = await window.electronAPI.readMetadata()
			const meta: LibraryMetadata = JSON.parse(metaRaw)
			lastReadMeta = meta

			tagStore.loadTags(meta.tags)
			themeStore.loadTheme(meta.theme)
			settingsStore.loadSettings(meta.settings)

			// Load profile state
			if (meta.activeProfile) {
				activeProfileName.value = meta.activeProfile || "Default"
			}
			if (meta.profiles) {
				profiles.value = meta.profiles
			}

			// Clean up any leftover listeners from a previous scan
			window.electronAPI.removeScanListeners()

			// Stream scan results, merging each batch with metadata as it arrives
			await new Promise<void>((resolve) => {
				window.electronAPI.onScanProgress((batch) => {
					files.value.push(
						...batch.map((sf) => {
							const fileMeta = meta.files[sf.name]
							return {
								...sf,
								duration: null,
								tags: fileMeta?.tags ?? [],
								description: fileMeta?.description ?? "",
								lastPlayed: fileMeta?.lastPlayed ?? null,
							} as AudioFile
						}),
					)
				})

				window.electronAPI.onScanDone(() => {
					resolve()
				})

				window.electronAPI.startScan(rootDirectory.value!, settingsStore.scannerBatchSize)
			})

			// Kick off parallel duration loading
			if (settingsStore.autoLoadDurations) {
				loadDurations()
			}
		} finally {
			isScanning.value = false
		}
	}

	async function loadDurations() {
		const CONCURRENCY = settingsStore.durationConcurrency
		const snapshot = [...files.value]
		let index = 0

		async function worker() {
			while (index < snapshot.length) {
				const file = snapshot[index++]
				if (file.duration === null) {
					file.duration = await window.electronAPI.getAudioDuration(file.path)
				}
			}
		}

		await Promise.all(Array.from({ length: CONCURRENCY }, worker))
	}

	async function saveMetadata() {
		const meta: LibraryMetadata = {
			version: 1,
			files: {},
			tags: tagStore.tagDefinitions,
			theme: Object.keys(themeStore.currentTheme).length > 0 ? themeStore.currentTheme : undefined,
			settings: settingsStore.getSettingsSnapshot(),
		}

		// Seed with the last read state so files not yet in files.value (e.g. during
		// a partial scan) keep their saved tags instead of being silently erased.
		if (lastReadMeta) {
			Object.assign(meta.files, lastReadMeta.files)
		}

		// Overlay with the current in-memory state for every file we do have loaded.
		// Files with no data are explicitly removed so stale entries don't accumulate.
		for (const file of files.value) {
			if (file.tags.length > 0 || file.description || file.lastPlayed) {
				meta.files[file.name] = {
					tags: file.tags,
					description: file.description,
					lastPlayed: file.lastPlayed,
				}
			} else {
				delete meta.files[file.name]
			}
		}

		// Persist rootDirectory from the live ref (single source of truth)
		if (rootDirectory.value) {
			;(meta as any).rootDirectory = rootDirectory.value
		}

		// Persist soundboards
		const sbs = soundboardStore.getSoundboardSnapshot()
		if (Object.keys(sbs).length > 0) {
			meta.soundboards = sbs
		}

		// Persist last used tag
		if (lastUsedTag.value) {
			;(meta as any).lastUsedTag = lastUsedTag.value
		}

		// Persist profile state
		meta.activeProfile = activeProfileName.value
		if (Object.keys(profiles.value).length > 0) {
			meta.profiles = profiles.value
		}

		// Persist sort state
		meta.sortColumn = sortColumn.value
		meta.sortDirection = sortDirection.value

		// Persist filter state
		meta.filters = {
			selectedTags: [...selectedTags.value],
			excludedTags: [...excludedTags.value],
			descriptionFilters: [...descriptionFilters.value],
			excludedDescriptionFilters: [...excludedDescriptionFilters.value],
			dateFilters: dateFilters.value.map((df) => ({ ...df })),
			filterExtension: [...filterExtension.value],
			filterTagged: filterTagged.value,
		}

		await window.electronAPI.writeMetadata(JSON.stringify(meta, null, 2))

		// Fire-and-forget auto-backup
		if (settingsStore.autoBackup) {
			window.electronAPI
				.backupCreate(JSON.stringify(meta, null, 2))
				.then(() => settingsStore.purgeOldBackups())
				.catch(() => {}) // non-fatal
		}
	}

	function addTagToFile(filePath: string, tag: string) {
		const file = files.value.find((f) => f.path === filePath)
		if (file && !file.tags.includes(tag)) {
			file.tags.push(tag)
			lastUsedTag.value = tag
			saveMetadata()
		}
	}

	function removeTagFromFile(filePath: string, tag: string) {
		const file = files.value.find((f) => f.path === filePath)
		if (file) {
			file.tags = file.tags.filter((t) => t !== tag)
			saveMetadata()
		}
	}

	function setDescription(filePath: string, description: string) {
		const file = files.value.find((f) => f.path === filePath)
		if (file) {
			file.description = description
			saveMetadata()
		}
	}

	async function deleteFile(filePath: string): Promise<{ error?: string }> {
		const result = await window.electronAPI.deleteFile(filePath)
		if (!result.success) return { error: result.error }

		files.value = files.value.filter((f) => f.path !== filePath)
		if (currentFile.value?.path === filePath) {
			currentFile.value = null
			isPlaying.value = false
		}
		await saveMetadata()
		return {}
	}

	async function renameFile(oldPath: string, newName: string): Promise<{ error?: string; newPath?: string }> {
		const result = await window.electronAPI.renameFile(oldPath, newName)
		if (!result.success) return { error: result.error }

		const file = files.value.find((f) => f.path === oldPath)
		if (file) {
			file.path = result.newPath!
			file.name = newName
		}
		if (currentFile.value?.path === oldPath && file) {
			currentFile.value = file
		}

		// Propagate rename to soundboard items referencing this file
		for (const sb of soundboardStore.allSoundboards) {
			for (const item of sb.items) {
				if (item.filePath === oldPath) {
					item.filePath = result.newPath!
					item.name = newName
				}
			}
		}

		await saveMetadata()
		return { newPath: result.newPath }
	}

	function addTagFilter(tag: string) {
		if (!selectedTags.value.includes(tag)) {
			selectedTags.value = [...selectedTags.value, tag]
		}
		// Remove from exclude list if present
		excludedTags.value = excludedTags.value.filter((t) => t !== tag)
		saveMetadata()
	}

	function removeTagFilter(tag: string) {
		selectedTags.value = selectedTags.value.filter((t) => t !== tag)
		saveMetadata()
	}

	function addExcludeTagFilter(tag: string) {
		if (!excludedTags.value.includes(tag)) {
			excludedTags.value = [...excludedTags.value, tag]
		}
		// Remove from include list if present (can't both include and exclude)
		selectedTags.value = selectedTags.value.filter((t) => t !== tag)
		saveMetadata()
	}

	function removeExcludeTagFilter(tag: string) {
		excludedTags.value = excludedTags.value.filter((t) => t !== tag)
		saveMetadata()
	}

	function addDescriptionFilter(text: string) {
		const trimmed = text.trim()
		if (trimmed && !descriptionFilters.value.includes(trimmed)) {
			descriptionFilters.value = [...descriptionFilters.value, trimmed]
		}
		saveMetadata()
	}

	function removeDescriptionFilter(text: string) {
		descriptionFilters.value = descriptionFilters.value.filter((t) => t !== text)
		saveMetadata()
	}

	function addExcludeDescriptionFilter(text: string) {
		const trimmed = text.trim()
		if (trimmed && !excludedDescriptionFilters.value.includes(trimmed)) {
			excludedDescriptionFilters.value = [...excludedDescriptionFilters.value, trimmed]
		}
		// Remove from include list if present
		descriptionFilters.value = descriptionFilters.value.filter((t) => t !== trimmed)
		saveMetadata()
	}

	function removeExcludeDescriptionFilter(text: string) {
		excludedDescriptionFilters.value = excludedDescriptionFilters.value.filter((t) => t !== text)
		saveMetadata()
	}

	function addDateFilter(filter: DateFilter) {
		// Deduplicate on field+operator+date
		const exists = dateFilters.value.some(
			(df) => df.field === filter.field && df.operator === filter.operator && df.date === filter.date,
		)
		if (!exists) {
			dateFilters.value = [...dateFilters.value, filter]
		}
		saveMetadata()
	}

	function removeDateFilter(id: string) {
		dateFilters.value = dateFilters.value.filter((df) => df.id !== id)
		saveMetadata()
	}

	function clearAllFilters() {
		selectedTags.value = []
		excludedTags.value = []
		descriptionFilters.value = []
		excludedDescriptionFilters.value = []
		dateFilters.value = []
		saveMetadata()
	}

	async function editTag(oldName: string, newName: string, newColor: string): Promise<{ error?: string }> {
		const trimmed = newName.trim().toLowerCase()
		if (!trimmed) return { error: "Tag name cannot be empty" }
		if (trimmed !== oldName && tagStore.tagDefinitions[trimmed]) {
			return { error: `Tag "${trimmed}" already exists` }
		}
		if (trimmed !== oldName) {
			tagStore.renameTag(oldName, trimmed)
			for (const file of files.value) {
				const idx = file.tags.indexOf(oldName)
				if (idx !== -1) file.tags[idx] = trimmed
			}
		}
		tagStore.setTagColor(trimmed, newColor)
		await saveMetadata()
		return {}
	}

	async function mergeTag(source: string, target: string): Promise<{ error?: string }> {
		// Guard: source cannot be uncategorized
		if (source === "uncategorized") {
			return { error: "Cannot merge from uncategorized tag" }
		}
		// Guard: source and target must be different
		if (source === target) {
			return { error: "Source and target tags must be different" }
		}
		// Guard: both must exist in tagStore
		if (!tagStore.tagDefinitions[source]) {
			return { error: `Source tag "${source}" does not exist` }
		}
		if (!tagStore.tagDefinitions[target]) {
			return { error: `Target tag "${target}" does not exist` }
		}

		// For each file with source tag: add target (if absent), remove source
		for (const file of files.value) {
			if (file.tags.includes(source)) {
				if (!file.tags.includes(target)) {
					file.tags.push(target)
				}
				file.tags = file.tags.filter((t) => t !== source)
			}
		}

		// Delete source tag
		tagStore.deleteTag(source)

		await saveMetadata()
		return {}
	}

	async function clearTagFromAllFiles(tagName: string) {
		for (const file of files.value) {
			file.tags = file.tags.filter((t) => t !== tagName)
		}
		await saveMetadata()
	}

	function addTagToFiles(filePaths: string[], tag: string) {
		for (const file of files.value) {
			if (filePaths.includes(file.path) && !file.tags.includes(tag)) {
				file.tags.push(tag)
			}
		}
		saveMetadata()
	}

	function removeTagFromFiles(filePaths: string[], tag: string) {
		for (const file of files.value) {
			if (filePaths.includes(file.path)) {
				file.tags = file.tags.filter((t) => t !== tag)
			}
		}
		saveMetadata()
	}

	function setDescriptionForFiles(filePaths: string[], description: string) {
		for (const file of files.value) {
			if (filePaths.includes(file.path)) {
				file.description = description
			}
		}
		saveMetadata()
	}

	function setSort(col: SortColumn) {
		if (sortColumn.value === col) {
			sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"
		} else {
			sortColumn.value = col
			sortDirection.value = "asc"
		}
		saveMetadata()
	}

	function playFile(file: AudioFile, options?: { offset?: number; range?: [number, number] }) {
		playbackOffset.value = options?.offset ?? null
		playbackRange.value = options?.range ?? null
		currentFile.value = file
		isPlaying.value = true
		file.lastPlayed = new Date().toISOString()
		saveMetadata()
	}

	function stopPlayback() {
		isPlaying.value = false
	}

	function restartPlayback() {
		playbackRestartCounter.value++
		isPlaying.value = true
	}

	function getProfileSnapshot(): ProfileSnapshot {
		const snapshotFiles: ProfileSnapshot["files"] = {}

		// Start with lastReadMeta to preserve files not yet loaded
		if (lastReadMeta) {
			for (const [name, data] of Object.entries(lastReadMeta.files)) {
				snapshotFiles[name] = {
					tags: data.tags,
					description: data.description,
					lastPlayed: data.lastPlayed,
				}
			}
		}

		// Overlay current in-memory files
		for (const file of files.value) {
			if (file.tags.length > 0 || file.description || file.lastPlayed) {
				snapshotFiles[file.name] = {
					tags: [...file.tags],
					description: file.description,
					lastPlayed: file.lastPlayed,
				}
			} else {
				delete snapshotFiles[file.name]
			}
		}

		return {
			files: snapshotFiles,
			tags: { ...tagStore.tagDefinitions },
			theme: Object.keys(themeStore.currentTheme).length > 0 ? { ...themeStore.currentTheme } : undefined,
			settings: settingsStore.getSettingsSnapshot(),
			rootDirectory: rootDirectory.value,
			soundboards: soundboardStore.getSoundboardSnapshot(),
			filters: {
				selectedTags: [...selectedTags.value],
				excludedTags: [...excludedTags.value],
				descriptionFilters: [...descriptionFilters.value],
				excludedDescriptionFilters: [...excludedDescriptionFilters.value],
				dateFilters: dateFilters.value.map((df) => ({ ...df })),
				filterExtension: [...filterExtension.value],
				filterTagged: filterTagged.value,
			},
			sortColumn: sortColumn.value,
			sortDirection: sortDirection.value,
		}
	}

	function applyProfileData(snapshot: ProfileSnapshot) {
		// 1. Replace tags (full replacement, not merge)
		tagStore.replaceTags(snapshot.tags)

		// 2. Apply theme
		themeStore.loadTheme(snapshot.theme)

		// 3. Apply settings
		settingsStore.loadSettings(snapshot.settings)

		// 4. Update file metadata in-place
		for (const file of files.value) {
			const meta = snapshot.files[file.name]
			if (meta) {
				file.tags = [...meta.tags]
				file.description = meta.description
				file.lastPlayed = meta.lastPlayed
			} else {
				file.tags = []
				file.description = ""
				file.lastPlayed = null
			}
		}

		// 5. Replace soundboards
		soundboardStore.replaceSoundboards(snapshot.soundboards || {})

		// 6. Restore filters (clear all if absent for backward compat)
		if (snapshot.filters) {
			selectedTags.value = [...snapshot.filters.selectedTags]
			excludedTags.value = [...snapshot.filters.excludedTags]
			descriptionFilters.value = [...snapshot.filters.descriptionFilters]
			excludedDescriptionFilters.value = [...snapshot.filters.excludedDescriptionFilters]
			dateFilters.value = snapshot.filters.dateFilters.map((df) => ({ ...df }))
			filterExtension.value = [...snapshot.filters.filterExtension]
			filterTagged.value = snapshot.filters.filterTagged
		} else {
			selectedTags.value = []
			excludedTags.value = []
			descriptionFilters.value = []
			excludedDescriptionFilters.value = []
			dateFilters.value = []
			filterExtension.value = []
			filterTagged.value = "all"
		}

		// 7. Restore sort state
		if (snapshot.sortColumn) {
			sortColumn.value = snapshot.sortColumn
			sortDirection.value = snapshot.sortDirection || "asc"
		} else {
			sortColumn.value = "name"
			sortDirection.value = "asc"
		}

		// 8. Update lastReadMeta so saveMetadata() merges correctly
		lastReadMeta = {
			version: 1,
			files: snapshot.files,
			tags: snapshot.tags,
			theme: snapshot.theme,
			settings: snapshot.settings,
			activeProfile: activeProfileName.value,
			profiles: profiles.value,
		}
	}

	async function createProfile(name: string): Promise<{ error?: string }> {
		const trimmed = name.trim()
		if (!trimmed) return { error: "Profile name cannot be empty" }
		if (profiles.value[trimmed]) return { error: `Profile "${trimmed}" already exists` }

		// On first non-Default profile creation, save the current state as "Default"
		if (!profiles.value["Default"] && activeProfileName.value === "Default") {
			profiles.value["Default"] = {
				name: "Default",
				createdAt: new Date().toISOString(),
				snapshot: getProfileSnapshot(),
			}
		}

		// Snapshot current state into the new profile
		profiles.value[trimmed] = {
			name: trimmed,
			createdAt: new Date().toISOString(),
			snapshot: getProfileSnapshot(),
		}

		activeProfileName.value = trimmed
		await saveMetadata()
		return {}
	}

	async function switchProfile(name: string): Promise<{ error?: string }> {
		if (name === activeProfileName.value) return {}
		if (!profiles.value[name]) return { error: `Profile "${name}" does not exist` }

		// Auto-save current state into the current profile
		if (profiles.value[activeProfileName.value]) {
			profiles.value[activeProfileName.value].snapshot = getProfileSnapshot()
		}

		const targetSnapshot = profiles.value[name].snapshot
		const oldDir = rootDirectory.value
		const newDir = targetSnapshot.rootDirectory ?? null

		// Apply target profile data (tags, theme, settings, file metadata in-place)
		applyProfileData(targetSnapshot)
		activeProfileName.value = name

		if (newDir !== oldDir) {
			rootDirectory.value = newDir
			await window.electronAPI.setRootDirectory(newDir)
			await saveMetadata()
			if (newDir) {
				await rescan()
			} else {
				files.value = []
			}
		} else {
			await saveMetadata()
		}

		return {}
	}

	async function deleteProfile(name: string): Promise<{ error?: string }> {
		if (name === "Default") return { error: "Cannot delete the Default profile" }
		if (!profiles.value[name]) return { error: `Profile "${name}" does not exist` }

		// If deleting the active profile, switch to Default first
		if (name === activeProfileName.value) {
			await switchProfile("Default")
		}

		delete profiles.value[name]
		await saveMetadata()
		return {}
	}

	async function renameProfile(oldName: string, newName: string): Promise<{ error?: string }> {
		if (oldName === "Default") return { error: "Cannot rename the Default profile" }
		const trimmed = newName.trim()
		if (!trimmed) return { error: "Profile name cannot be empty" }
		if (trimmed === oldName) return {}
		if (profiles.value[trimmed]) return { error: `Profile "${trimmed}" already exists` }
		if (!profiles.value[oldName]) return { error: `Profile "${oldName}" does not exist` }

		const entry = profiles.value[oldName]
		entry.name = trimmed
		profiles.value[trimmed] = entry
		delete profiles.value[oldName]

		if (activeProfileName.value === oldName) {
			activeProfileName.value = trimmed
		}

		await saveMetadata()
		return {}
	}

	// Soundboard wrapper methods (thin — delegate to soundboardStore + persist)
	async function createSoundboardWrapper(name: string, description: string, layoutType: "LIST" | "GRID" | "TABLE") {
		const id = soundboardStore.createSoundboard(name, description, layoutType, activeProfileName.value)
		await saveMetadata()
		return id
	}

	async function deleteSoundboardWrapper(id: string) {
		soundboardStore.deleteSoundboard(id)
		await saveMetadata()
	}

	async function updateSoundboardWrapper(
		id: string,
		updates: Partial<Pick<Soundboard, "name" | "description" | "layoutType" | "width" | "height" | "visibleColumns" | "gridColumns">>,
	) {
		soundboardStore.updateSoundboard(id, updates)
		await saveMetadata()
	}

	async function toggleSoundboardEnabled(id: string) {
		soundboardStore.toggleEnabled(id)
		await saveMetadata()
	}

	async function toggleSoundboardState(id: string) {
		soundboardStore.toggleState(id)
		await saveMetadata()
	}

	async function addSoundboardItem(soundboardId: string, item: SoundboardItem) {
		soundboardStore.addItem(soundboardId, item)
		await saveMetadata()
	}

	async function removeSoundboardItem(soundboardId: string, itemId: string) {
		soundboardStore.removeItem(soundboardId, itemId)
		await saveMetadata()
	}

	async function reorderSoundboardItems(soundboardId: string, fromIndex: number, toIndex: number) {
		soundboardStore.reorderItems(soundboardId, fromIndex, toIndex)
		await saveMetadata()
	}

	async function updateSoundboardItem(soundboardId: string, itemId: string, updates: { name?: string; partial?: boolean; offset?: number; range?: [number, number] }) {
		soundboardStore.updateItem(soundboardId, itemId, updates)
		await saveMetadata()
	}

	return reactive({
		files,
		rootDirectory,
		searchQuery,
		filterExtension,
		filterTagged,
		isScanning,
		sortColumn,
		sortDirection,
		selectedTags,
		excludedTags,
		descriptionFilters,
		excludedDescriptionFilters,
		dateFilters,
		lastUsedTag,
		currentFile,
		isPlaying,
		playbackOffset,
		playbackRange,
		playbackRestartCounter,
		dragPayload,
		filteredFiles,
		initFromPersistedDirectory,
		selectAndScanDirectory,
		createAndSetDirectory,
		rescan,
		saveMetadata,
		addTagToFile,
		removeTagFromFile,
		setDescription,
		deleteFile,
		renameFile,
		playFile,
		stopPlayback,
		restartPlayback,
		addTagFilter,
		removeTagFilter,
		addExcludeTagFilter,
		removeExcludeTagFilter,
		addDescriptionFilter,
		removeDescriptionFilter,
		addExcludeDescriptionFilter,
		removeExcludeDescriptionFilter,
		addDateFilter,
		removeDateFilter,
		clearAllFilters,
		editTag,
		mergeTag,
		clearTagFromAllFiles,
		addTagToFiles,
		removeTagFromFiles,
		setDescriptionForFiles,
		setSort,
		activeProfileName,
		profiles,
		getProfileSnapshot,
		applyProfileData,
		createProfile,
		switchProfile,
		deleteProfile,
		renameProfile,
		createSoundboard: createSoundboardWrapper,
		deleteSoundboard: deleteSoundboardWrapper,
		updateSoundboard: updateSoundboardWrapper,
		toggleSoundboardEnabled,
		toggleSoundboardState,
		addSoundboardItem,
		removeSoundboardItem,
		reorderSoundboardItems,
		updateSoundboardItem,
	})
}

export function _resetLibraryStore() {
	files.value = []
	rootDirectory.value = null
	searchQuery.value = ""
	filterExtension.value = []
	filterTagged.value = "all"
	isScanning.value = false
	sortColumn.value = "name"
	sortDirection.value = "asc"
	selectedTags.value = []
	excludedTags.value = []
	descriptionFilters.value = []
	excludedDescriptionFilters.value = []
	dateFilters.value = []
	lastReadMeta = null
	lastUsedTag.value = null
	currentFile.value = null
	isPlaying.value = false
	playbackOffset.value = null
	playbackRange.value = null
	dragPayload.value = null
	activeProfileName.value = "Default"
	profiles.value = {}
}
