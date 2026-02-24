<template>
	<div
		class="dock-panel"
		:class="{ 'dock-panel--collapsed': collapsed }"
		:style="panelStyle"
	>
		<div class="dock-panel-titlebar" @click="$emit('toggle-collapse')">
			<span class="dock-panel-title">{{ title }}</span>
			<div class="dock-panel-controls">
				<button
					class="dock-panel-btn"
					@click.stop="$emit('toggle-collapse')"
					:title="collapsed ? 'Expand' : 'Collapse'"
				>
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
				<button
					class="dock-panel-btn"
					@click.stop="$emit('close')"
					title="Close"
				>
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
		<div v-if="!collapsed" class="dock-panel-body">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
	panelId: string
	title: string
	collapsed: boolean
	width?: number
	height?: number
}

const props = withDefaults(defineProps<Props>(), {
	width: 280,
	height: 350,
})

defineEmits<{
	'toggle-collapse': []
	close: []
}>()

const panelStyle = computed(() => ({
	width: `${props.width}px`,
	height: props.collapsed ? 'auto' : `${props.height}px`,
}))
</script>

<style scoped>
.dock-panel {
	background: var(--bg-secondary);
	border: 1px solid var(--border);
	border-radius: 8px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	display: flex;
	flex-direction: column;
	pointer-events: auto;
	overflow: hidden;
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
	transition: color 0.15s, background 0.15s;
}

.dock-panel-btn:hover {
	color: var(--text-primary);
	background: var(--bg-hover);
}

.dock-panel-body {
	flex: 1;
	overflow-y: auto;
	padding: 8px;
}
</style>
