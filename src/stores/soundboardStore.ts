import { ref, computed, reactive } from "vue"

export interface SoundboardItem {
	id: string
	name: string
	filePath: string
	duration: number
	offset?: number
	range?: [number, number]
}

export interface Soundboard {
	id: string
	profileId: string
	name: string
	description: string
	layoutType: "LIST" | "GRID" | "TABLE"
	enabled: boolean
	state: "minimized" | "expanded"
	items: SoundboardItem[]
	width?: number
	height?: number
	updatedAt?: string
	visibleColumns?: string[]
}

const soundboards = ref<Record<string, Soundboard>>({})

let idCounter = 0

function generateId(): string {
	return `sb_${Date.now()}_${++idCounter}`
}

export function useSoundboardStore() {
	const allSoundboards = computed(() => Object.values(soundboards.value))

	const enabledSoundboards = computed(() => allSoundboards.value.filter((sb) => sb.enabled))

	function getSoundboardsForProfile(profileId: string): Soundboard[] {
		return allSoundboards.value.filter((sb) => sb.profileId === profileId)
	}

	function createSoundboard(
		name: string,
		description: string,
		layoutType: "LIST" | "GRID" | "TABLE",
		profileId: string,
	): string {
		const id = generateId()
		soundboards.value[id] = {
			id,
			profileId,
			name,
			description,
			layoutType,
			enabled: false,
			state: "expanded",
			items: [],
		}
		return id
	}

	function deleteSoundboard(id: string) {
		delete soundboards.value[id]
	}

	function updateSoundboard(id: string, updates: Partial<Pick<Soundboard, "name" | "description" | "layoutType" | "width" | "height" | "visibleColumns">>) {
		const sb = soundboards.value[id]
		if (!sb) return
		if (updates.name !== undefined) sb.name = updates.name
		if (updates.description !== undefined) sb.description = updates.description
		if (updates.layoutType !== undefined) sb.layoutType = updates.layoutType
		if (updates.width !== undefined) sb.width = updates.width
		if (updates.height !== undefined) sb.height = updates.height
		if (updates.visibleColumns !== undefined) sb.visibleColumns = updates.visibleColumns
		sb.updatedAt = new Date().toISOString()
	}

	function updateItem(soundboardId: string, itemId: string, updates: Partial<Pick<SoundboardItem, "name" | "offset" | "range">>) {
		const sb = soundboards.value[soundboardId]
		if (!sb) return
		const item = sb.items.find((i) => i.id === itemId)
		if (!item) return
		if (updates.name !== undefined) item.name = updates.name
		if (updates.offset !== undefined) item.offset = updates.offset
		if (updates.range !== undefined) item.range = updates.range
		sb.updatedAt = new Date().toISOString()
	}

	function toggleEnabled(id: string) {
		const sb = soundboards.value[id]
		if (sb) {
			sb.enabled = !sb.enabled
			if (sb.enabled) sb.state = "expanded"
		}
	}

	function setEnabled(id: string, enabled: boolean) {
		const sb = soundboards.value[id]
		if (sb) {
			sb.enabled = enabled
			if (enabled) sb.state = "expanded"
		}
	}

	function toggleState(id: string) {
		const sb = soundboards.value[id]
		if (sb) sb.state = sb.state === "minimized" ? "expanded" : "minimized"
	}

	function addItem(soundboardId: string, item: SoundboardItem) {
		const sb = soundboards.value[soundboardId]
		if (sb) {
			sb.items.push(item)
			sb.updatedAt = new Date().toISOString()
		}
	}

	function removeItem(soundboardId: string, itemId: string) {
		const sb = soundboards.value[soundboardId]
		if (sb) {
			sb.items = sb.items.filter((i) => i.id !== itemId)
			sb.updatedAt = new Date().toISOString()
		}
	}

	function loadSoundboards(data: Record<string, Soundboard>) {
		soundboards.value = data
	}

	function replaceSoundboards(data: Record<string, Soundboard>) {
		soundboards.value = data
	}

	function getSoundboardSnapshot(): Record<string, Soundboard> {
		return JSON.parse(JSON.stringify(soundboards.value))
	}

	return reactive({
		allSoundboards,
		enabledSoundboards,
		getSoundboardsForProfile,
		createSoundboard,
		deleteSoundboard,
		updateSoundboard,
		updateItem,
		toggleEnabled,
		setEnabled,
		toggleState,
		addItem,
		removeItem,
		loadSoundboards,
		replaceSoundboards,
		getSoundboardSnapshot,
	})
}

export function _resetSoundboardStore() {
	soundboards.value = {}
	idCounter = 0
}
