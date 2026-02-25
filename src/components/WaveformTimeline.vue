<template>
	<div class="waveform-timeline">
		<div ref="containerRef" class="waveform-container" />
		<div v-if="isLoading" class="waveform-overlay">Loading waveform...</div>
		<div v-else-if="error" class="waveform-overlay waveform-error">{{ error }}</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue"
import WaveSurfer from "wavesurfer.js"
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js"

interface Props {
	filePath: string
	duration: number
	mode: "offset" | "range"
	offset: number | undefined
	rangeStart: number | undefined
	rangeEnd: number | undefined
}

const props = defineProps<Props>()
const emit = defineEmits<{
	"update:offset": [value: number]
	"update:rangeStart": [value: number]
	"update:rangeEnd": [value: number]
}>()

const containerRef = ref<HTMLDivElement>()
const isLoading = ref(true)
const error = ref<string | null>(null)

let ws: WaveSurfer | null = null
let regions: RegionsPlugin | null = null
let disableDragSelection: (() => void) | null = null
let themeInterval: ReturnType<typeof setInterval> | null = null

// Guard to prevent feedback loops when we update regions from props
let updatingFromProps = false

function getThemeColor(prop: string, fallback: string = ""): string {
	try {
		const style = getComputedStyle(document.documentElement)
		return style.getPropertyValue(prop).trim() || fallback
	} catch {
		return fallback
	}
}

function roundTime(t: number): number {
	return Math.round(t * 10) / 10
}

function clampTime(t: number): number {
	const dur = ws?.getDuration() || props.duration || 0
	return Math.max(0, Math.min(dur, t))
}

function hexToRgba(hex: string, alpha: number): string {
	hex = hex.replace("#", "")
	if (hex.length === 3) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
	}
	const r = parseInt(hex.substring(0, 2), 16)
	const g = parseInt(hex.substring(2, 4), 16)
	const b = parseInt(hex.substring(4, 6), 16)
	return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function createOffsetMarker() {
	if (!regions) return
	const start = clampTime(props.offset ?? 0)
	regions.addRegion({
		id: "offset-marker",
		start,
		end: start,
		color: getThemeColor("--accent", "#4da6ff"),
		drag: true,
		resize: false,
	})
}

function createRangeRegion() {
	if (!regions) return
	const dur = ws?.getDuration() || props.duration || 0
	const start = clampTime(props.rangeStart ?? 0)
	const end = clampTime(props.rangeEnd ?? dur)
	const accent = getThemeColor("--accent", "#4da6ff")

	regions.addRegion({
		id: "range-region",
		start,
		end,
		color: hexToRgba(accent, 0.25),
		drag: true,
		resize: true,
	})
}

function setupRegions() {
	if (!regions) return

	if (disableDragSelection) {
		disableDragSelection()
		disableDragSelection = null
	}

	regions.clearRegions()

	if (props.mode === "offset") {
		createOffsetMarker()
	} else {
		createRangeRegion()
		const accent = getThemeColor("--accent", "#4da6ff")
		disableDragSelection = regions.enableDragSelection({
			color: hexToRgba(accent, 0.25),
		})
	}
}

function handleRegionUpdated(region: { id: string; start: number; end: number }) {
	if (updatingFromProps) return

	if (props.mode === "offset") {
		if (region.id !== "offset-marker") return
		emit("update:offset", roundTime(clampTime(region.start)))
	} else if (props.mode === "range") {
		const start = Math.min(region.start, region.end)
		const end = Math.max(region.start, region.end)
		emit("update:rangeStart", roundTime(clampTime(start)))
		emit("update:rangeEnd", roundTime(clampTime(end)))
	}
}

function handleRegionCreated(region: { id: string; start: number; end: number; remove: () => void }) {
	if (updatingFromProps) return

	// In offset mode, remove any drag-created regions — only the marker is allowed
	if (props.mode === "offset") {
		if (region.id !== "offset-marker") {
			region.remove()
		}
		return
	}

	// In range mode: skip our own setup region (id "range-region"),
	// but when the user drag-creates a new region (auto-generated id),
	// remove all others so only one region exists at a time
	if (props.mode === "range" && region.id !== "range-region") {
		const allRegions = regions?.getRegions() ?? []
		for (const r of allRegions) {
			if (r.id !== region.id) {
				r.remove()
			}
		}
		const start = Math.min(region.start, region.end)
		const end = Math.max(region.start, region.end)
		emit("update:rangeStart", roundTime(clampTime(start)))
		emit("update:rangeEnd", roundTime(clampTime(end)))
	}
}

function handleClick(relativeX: number) {
	if (!ws || props.mode !== "offset") return
	const dur = ws.getDuration()
	const t = roundTime(clampTime(relativeX * dur))
	emit("update:offset", t)

	// Move the marker
	const marker = regions?.getRegions().find((r) => r.id === "offset-marker")
	if (marker) {
		updatingFromProps = true
		marker.setOptions({ start: t, end: t })
		updatingFromProps = false
	}
}

onMounted(async () => {
	if (!containerRef.value) return
	if (!props.filePath) {
		isLoading.value = false
		error.value = "No file path provided"
		return
	}

	try {
		// Measure the container so we request exactly as many peaks as we have pixels
		// Each bar = barWidth(2) + barGap(1) = 3px, so peaks = containerWidth / 3
		const containerWidth = containerRef.value.clientWidth || 600
		const peakCount = Math.max(100, Math.floor(containerWidth / 3))

		// Compute peaks in the main process — no AudioContext.decodeAudioData()
		const peaks = await window.electronAPI.getWaveformPeaks(props.filePath, peakCount)

		// If component was unmounted while awaiting, bail out
		if (!containerRef.value) return

		ws = WaveSurfer.create({
			container: containerRef.value,
			height: 98,
			waveColor: getThemeColor("--text-muted", "#666666"),
			progressColor: getThemeColor("--accent", "#4da6ff"),
			cursorColor: "transparent",
			barWidth: 2,
			barGap: 1,
			barRadius: 1,
			normalize: true,
			interact: true,
			hideScrollbar: true,
			peaks: [peaks],
			duration: props.duration,
		})

		regions = ws.registerPlugin(RegionsPlugin.create())

		// Listen for region events
		regions.on("region-updated", handleRegionUpdated)
		regions.on("region-created", handleRegionCreated)

		// Click-to-set in offset mode
		ws.on("click", handleClick)

		// Create initial regions
		setupRegions()

		isLoading.value = false
	} catch (e) {
		error.value = e instanceof Error ? e.message : "Failed to load waveform"
		isLoading.value = false
	}
})

onUnmounted(() => {
	if (themeInterval) {
		clearInterval(themeInterval)
		themeInterval = null
	}
	if (disableDragSelection) {
		disableDragSelection()
		disableDragSelection = null
	}
	if (ws) {
		ws.destroy()
		ws = null
		regions = null
	}
})

// Mode switching: clear all regions and re-create for new mode
watch(
	() => props.mode,
	() => {
		if (!ws || isLoading.value) return
		setupRegions()
	}
)

// Sync offset prop → marker position
watch(
	() => props.offset,
	(newVal) => {
		if (!regions || props.mode !== "offset" || isLoading.value) return
		const marker = regions.getRegions().find((r) => r.id === "offset-marker")
		if (!marker) return
		const target = clampTime(newVal ?? 0)
		if (Math.abs(marker.start - target) > 0.05) {
			updatingFromProps = true
			marker.setOptions({ start: target, end: target })
			updatingFromProps = false
		}
	}
)

// Sync range props → region position
watch(
	[() => props.rangeStart, () => props.rangeEnd],
	([newStart, newEnd]) => {
		if (!regions || props.mode !== "range" || isLoading.value) return
		const region = regions.getRegions().find((r) => r.id === "range-region")
		if (!region) return
		const dur = ws?.getDuration() || props.duration || 0
		const start = clampTime(newStart ?? 0)
		const end = clampTime(newEnd ?? dur)
		if (Math.abs(region.start - start) > 0.05 || Math.abs(region.end - end) > 0.05) {
			updatingFromProps = true
			region.setOptions({ start, end })
			updatingFromProps = false
		}
	}
)

// Theme reactivity: update wavesurfer colors when theme changes
themeInterval = setInterval(() => {
	if (!ws) return
	const waveColor = getThemeColor("--text-muted", "#666666")
	const progressColor = getThemeColor("--accent", "#4da6ff")
	ws.setOptions({ waveColor, progressColor })
}, 2000)
</script>

<style scoped>
.waveform-timeline {
	position: relative;
	height: 120px;
	overflow-x: auto;
	overflow-y: hidden;
	border: 1px solid var(--border);
	border-radius: 4px;
	background: var(--bg-primary);
	margin: 8px 0 12px;
}

.waveform-container {
	height: 100%;
}

.waveform-overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
	color: var(--text-muted);
	background: var(--bg-primary);
	z-index: 1;
}

.waveform-error {
	color: var(--danger, #ff4d4d);
}

/* Region handle visibility */
:deep(.wavesurfer-region) {
	border-left: 2px solid var(--accent) !important;
	border-right: 2px solid var(--accent) !important;
}

:deep(.wavesurfer-region[data-id="offset-marker"]) {
	border-left: 2px solid var(--accent) !important;
	border-right: none !important;
	width: 2px !important;
}

:deep(.wavesurfer-region > div[data-resize]) {
	width: 6px !important;
	background: var(--accent) !important;
	opacity: 0.8 !important;
}
</style>
