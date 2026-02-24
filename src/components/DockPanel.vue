<template>
	<div class="dock-panel" :class="{ 'dock-panel--collapsed': collapsed }" :style="panelStyle">
		<!-- Resize handles (only when expanded) -->
		<template v-if="!collapsed">
			<div class="resize-handle resize-handle--left" @pointerdown.stop="onResizeStart($event, 'left')" />
			<div class="resize-handle resize-handle--top" @pointerdown.stop="onResizeStart($event, 'top')" />
			<div class="resize-handle resize-handle--corner" @pointerdown.stop="onResizeStart($event, 'corner')" />
		</template>

		<div class="dock-panel-titlebar" @click="$emit('toggle-collapse')">
			<span class="dock-panel-title" :title="description">{{ title }}</span>
			<div class="dock-panel-controls">
				<slot name="header-actions" />
				<button class="dock-panel-btn" @click.stop="$emit('toggle-collapse')" :title="collapsed ? 'Expand' : 'Collapse'">
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
						<polyline v-if="collapsed" points="18 15 12 9 6 15" />
						<polyline v-else points="6 9 12 15 18 9" />
					</svg>
				</button>
				<button class="dock-panel-btn" @click.stop="$emit('close')" title="Close">
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
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
		</div>
		<div v-if="!collapsed && $slots.subtitle" class="dock-panel-subtitle">
			<slot name="subtitle" />
		</div>
		<div v-if="!collapsed" class="dock-panel-body">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue"

interface Props {
	panelId: string
	title: string
	collapsed: boolean
	description?: string
	width?: number
	height?: number
}

const props = withDefaults(defineProps<Props>(), {
	width: 280,
	height: 350,
})

const emit = defineEmits<{
	"toggle-collapse": []
	close: []
	resize: [width: number, height: number]
}>()

const panelStyle = computed(() => ({
	width: `${props.width}px`,
	height: props.collapsed ? "auto" : `${props.height}px`,
}))

const MIN_W = 200
const MAX_W = 600
const MIN_H = 200
const MAX_H = 800

let resizeEdge: "left" | "top" | "corner" | null = null
let startX = 0
let startY = 0
let startW = 0
let startH = 0

function onResizeStart(e: PointerEvent, edge: "left" | "top" | "corner") {
	e.preventDefault()
	resizeEdge = edge
	startX = e.clientX
	startY = e.clientY
	startW = props.width
	startH = props.height
	document.addEventListener("pointermove", onResizeMove)
	document.addEventListener("pointerup", onResizeEnd)
}

function onResizeMove(e: PointerEvent) {
	if (!resizeEdge) return
	const dx = e.clientX - startX
	const dy = e.clientY - startY

	let w = startW
	let h = startH

	if (resizeEdge === "left" || resizeEdge === "corner") {
		w = Math.min(MAX_W, Math.max(MIN_W, startW - dx))
	}
	if (resizeEdge === "top" || resizeEdge === "corner") {
		h = Math.min(MAX_H, Math.max(MIN_H, startH - dy))
	}

	emit("resize", w, h)
}

function onResizeEnd() {
	resizeEdge = null
	document.removeEventListener("pointermove", onResizeMove)
	document.removeEventListener("pointerup", onResizeEnd)
}

onBeforeUnmount(() => {
	document.removeEventListener("pointermove", onResizeMove)
	document.removeEventListener("pointerup", onResizeEnd)
})
</script>

<style scoped>
.dock-panel {
	position: relative;
	background: var(--bg-secondary);
	border: 1px solid var(--border);
	/* border-radius: 8px; */
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	display: flex;
	flex-direction: column;
	pointer-events: auto;
	overflow: hidden;
}

.resize-handle {
	position: absolute;
	z-index: 5;
}

.resize-handle--left {
	left: -3px;
	top: 0;
	width: 6px;
	height: 100%;
	cursor: ew-resize;
}

.resize-handle--top {
	top: -3px;
	left: 0;
	width: 100%;
	height: 6px;
	cursor: ns-resize;
}

.resize-handle--corner {
	top: -4px;
	left: -4px;
	width: 12px;
	height: 12px;
	cursor: nwse-resize;
}

.dock-panel-titlebar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 6px 8px;
	cursor: pointer;
	user-select: none;
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}

.dock-panel--collapsed .dock-panel-titlebar {
	border-bottom: none;
}

.dock-panel-title {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--text-secondary);
}

.dock-panel-controls {
	display: flex;
	gap: 2px;
}

.dock-panel-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	border-radius: 4px;
	color: var(--text-muted);
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
	transition:
		color 0.15s,
		background 0.15s;
}

.dock-panel-btn:hover {
	color: var(--text-primary);
	background: var(--bg-hover);
}

.dock-panel-subtitle {
	padding: 4px 8px;
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}

.dock-panel-body {
	flex: 1;
	overflow-y: auto;
	padding: 8px;
}
</style>
