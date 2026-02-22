<template>
	<div class="theme-generator" ref="containerRef">
		<button class="palette-btn" @click="isOpen = !isOpen" title="Theme Generator">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
				<circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
				<circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
				<circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
				<path
					d="M12 2C6.5 2 2 6.5 2 12a10 10 0 0 0 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
				/>
			</svg>
		</button>

		<div v-if="isOpen" class="theme-panel">
			<div class="panel-header">Theme</div>

			<div class="source-row">
				<label class="color-row">
					<span class="color-label">Source color</span>
					<input type="color" v-model="sourceColor" />
				</label>
				<button class="action-btn apply-btn" @click="applyPalette">Apply palette</button>
			</div>

			<div class="divider" />

			<div class="color-rows">
				<label class="color-row">
					<span class="color-label">Accent</span>
					<input type="color" v-model="accent" />
				</label>
				<label class="color-row">
					<span class="color-label">Background</span>
					<input type="color" v-model="bgBase" />
				</label>
				<label class="color-row">
					<span class="color-label">Text</span>
					<input type="color" v-model="textBase" />
				</label>
				<label class="color-row">
					<span class="color-label">Danger</span>
					<input type="color" v-model="danger" />
				</label>
				<label class="color-row">
					<span class="color-label">Success</span>
					<input type="color" v-model="success" />
				</label>
			</div>

			<div class="panel-actions">
				<button class="action-btn save-btn" @click="handleSave">Save</button>
				<button class="action-btn reset-btn" @click="handleReset">Reset</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import chroma from "chroma-js"
import { useThemeStore } from "@/stores/themeStore"
import { DEFAULT_THEME } from "@/stores/themeStore"

const themeStore = useThemeStore()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const sourceColor = ref("#4da6ff")
// 5 primary color inputs — initialized from defaults
const accent = ref(DEFAULT_THEME["--accent"])
const bgBase = ref(DEFAULT_THEME["--bg-primary"])
const textBase = ref(DEFAULT_THEME["--text-primary"])
const danger = ref(DEFAULT_THEME["--danger"])
const success = ref(DEFAULT_THEME["--success"])
function applyPalette() {
	const darkBG = chroma(sourceColor.value).darken(2.6)
	const [c0, c1, c2, c3, c4] = chroma.scale([darkBG, sourceColor.value, "white"]).colors(5)
	bgBase.value = c0
	danger.value = c1
	accent.value = c2
	success.value = c3
	textBase.value = c4
}

const derivedTheme = computed((): Record<string, string> => {
	const a = chroma(accent.value)
	const bg = chroma(bgBase.value)
	const txt = chroma(textBase.value)

	return {
		"--accent": accent.value,
		"--accent-hover": a.brighten(0.6).hex(),
		"--bg-primary": bgBase.value,
		"--bg-secondary": bg.brighten(0.15).hex(),
		"--bg-hover": bg.brighten(0.3).hex(),
		"--bg-selected": bg.brighten(0.55).hex(),
		"--border": bg.brighten(0.8).hex(),
		"--scrollbar-track": bgBase.value,
		"--scrollbar-thumb": bg.brighten(0.55).brighten(0.3).hex(),
		"--text-primary": textBase.value,
		"--text-secondary": txt.darken(0.8).hex(),
		"--text-muted": txt.darken(1.6).hex(),
		"--danger": danger.value,
		"--success": success.value,
		"--tag-default": bg.brighten(1.2).desaturate(0.5).hex(),
	}
})

watch(derivedTheme, (vars) => {
	themeStore.applyTheme(vars)
})

function handleSave() {
	themeStore.saveTheme(derivedTheme.value)
	isOpen.value = false
}

function handleReset() {
	themeStore.resetTheme()
	accent.value = DEFAULT_THEME["--accent"]
	bgBase.value = DEFAULT_THEME["--bg-primary"]
	textBase.value = DEFAULT_THEME["--text-primary"]
	danger.value = DEFAULT_THEME["--danger"]
	success.value = DEFAULT_THEME["--success"]
}

function handleClickOutside(event: MouseEvent) {
	if (isOpen.value && containerRef.value && !containerRef.value.contains(event.target as Node)) {
		isOpen.value = false
	}
}

onMounted(() => {
	document.addEventListener("mousedown", handleClickOutside)
})

onUnmounted(() => {
	document.removeEventListener("mousedown", handleClickOutside)
})
</script>

<style scoped>
.theme-generator {
	position: relative;
	display: flex;
	align-items: center;
}

.palette-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	border-radius: 6px;
	color: var(--text-secondary);
	transition:
		color 0.15s,
		background 0.15s;
}

.palette-btn:hover {
	color: var(--text-primary);
	background: var(--bg-hover);
}

.theme-panel {
	position: absolute;
	top: calc(100% + 8px);
	right: 0;
	width: 200px;
	background: var(--bg-secondary);
	border: 1px solid var(--border);
	border-radius: 8px;
	padding: 12px;
	z-index: 1000;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.panel-header {
	font-size: 11px;
	font-weight: 600;
	color: var(--text-muted);
	text-transform: uppercase;
	letter-spacing: 0.08em;
	margin-bottom: 10px;
}

.source-row {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-bottom: 10px;
}

.divider {
	height: 1px;
	background: var(--border);
	margin-bottom: 10px;
}

.apply-btn {
	width: 100%;
	background: var(--bg-hover);
	color: var(--text-secondary);
	border: 1px solid var(--border);
	padding: 5px 8px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 500;
	text-align: center;
	transition:
		background 0.15s,
		color 0.15s;
}

.apply-btn:hover {
	background: var(--bg-selected);
	color: var(--text-primary);
}

.color-rows {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-bottom: 12px;
}

.color-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	cursor: pointer;
}

.color-label {
	font-size: 12px;
	color: var(--text-secondary);
}

.color-row input[type="color"] {
	width: 28px;
	height: 20px;
	padding: 0;
	border: 1px solid var(--border);
	border-radius: 3px;
	cursor: pointer;
	background: none;
}

.panel-actions {
	display: flex;
	gap: 6px;
}

.action-btn {
	flex: 1;
	padding: 5px 8px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 500;
	transition: background 0.15s;
}

.save-btn {
	background: var(--accent);
	color: #fff;
}

.save-btn:hover {
	background: var(--accent-hover);
}

.reset-btn {
	background: var(--bg-hover);
	color: var(--text-secondary);
	border: 1px solid var(--border);
}

.reset-btn:hover {
	color: var(--text-primary);
	background: var(--bg-selected);
}
</style>
