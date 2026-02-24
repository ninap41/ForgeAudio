<template>
	<BootSplash v-if="showBootSplash" @done="showBootSplash = false" />
	<div id="app-shell">
		<header class="app-header ember-wrap" :style="{ '--ember-color': emberColor }">
			<div class="header-top" :style="{ '--ember-color': emberColor }">
				<img class="app-logo" src="/ForgeIconLogo.png" alt="ForgeAudioIcon" />
				<div>
					<img class="app-title" src="/ForgeTextLogo.png" alt="ForgeAudioText" />
				</div>

				<div class="header-actions">
					<button
						class="icon-btn"
						:class="{ 'icon-btn--active': showSoundboardDrawer }"
						@click.stop="showSoundboardDrawer = !showSoundboardDrawer"
						title="Soundboard"
					>
						<svg
							width="15"
							height="15"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect x="3" y="3" width="7" height="7" />
							<rect x="14" y="3" width="7" height="7" />
							<rect x="3" y="14" width="7" height="7" />
							<rect x="14" y="14" width="7" height="7" />
						</svg>
					</button>
					<button class="icon-btn" @click="showDebugModal = true" title="Tag Store Debug">
						<svg
							width="15"
							height="15"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<ellipse cx="12" cy="5" rx="9" ry="3" />
							<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
							<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
						</svg>
					</button>
					<button class="icon-btn" @click="toggleDevTools" title="Toggle DevTools">
						<svg
							width="15"
							height="15"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="16 18 22 12 16 6" />
							<polyline points="8 6 2 12 8 18" />
						</svg>
					</button>
					<ThemeGenerator />
				</div>
			</div>
			<nav class="nav-tabs">
				<router-link to="/" class="nav-tab" active-class="active">Library</router-link>
				<router-link to="/settings" class="nav-tab" active-class="active">Settings</router-link>
				<div class="header-info">
					<span class="header-info-item">
						<span class="header-info-label">Current Profile:</span>
						<span class="header-info-value glow">{{
							library.activeProfileName === "Default" ? "(Default)" : library.activeProfileName
						}}</span>
					</span>
					<span v-if="library.rootDirectory" class="header-info-item">
						<span class="header-info-label">Directory:</span>
						<span class="header-info-value glow">{{ library.rootDirectory }}</span>
					</span>
				</div>
			</nav>
			<div class="ember-glow"></div>
			<div class="ember-field" aria-hidden="true">
				<span v-for="n in 14" :key="n" class="ember" :class="`e${n}`"></span>
			</div>
		</header>
		<main class="app-main">
			<router-view />
		</main>

		<Player />
		<DockedSoundboardContainer />
		<SoundboardDrawer v-if="showSoundboardDrawer" @close="showSoundboardDrawer = false" />
		<TagStoreDebugModal v-if="showDebugModal" @close="showDebugModal = false" />
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRouter } from "vue-router"
import BootSplash from "./components/BootSplash.vue"
import Player from "./components/Player.vue"
import ThemeGenerator from "./components/ThemeGenerator.vue"
import TagStoreDebugModal from "./components/TagStoreDebugModal.vue"
import DockedSoundboardContainer from "./components/DockedSoundboardContainer.vue"
import SoundboardDrawer from "./components/SoundboardDrawer.vue"
import { useThemeStore } from "./stores/themeStore"
import { useLibraryStore } from "./stores/libraryStore"

const themeStore = useThemeStore()
const library = useLibraryStore()
const router = useRouter()
const showBootSplash = ref(true)
const showDebugModal = ref(false)
const showSoundboardDrawer = ref(false)

const emberColor = computed(() => {
	// Recompute when the theme changes
	void themeStore.currentTheme
	const s = getComputedStyle(document.documentElement)
	const picks = [
		s.getPropertyValue("--accent").trim(),
		s.getPropertyValue("--success").trim(),
		s.getPropertyValue("--danger").trim(),
		s.getPropertyValue("--accent-hover").trim(),
	].filter((c) => /^#[\da-f]{6}$/i.test(c))

	if (!picks.length) return "#4dff88"

	function lum(hex: string): number {
		const r = parseInt(hex.slice(1, 3), 16)
		const g = parseInt(hex.slice(3, 5), 16)
		const b = parseInt(hex.slice(5, 7), 16)
		return 0.299 * r + 0.587 * g + 0.114 * b
	}

	return picks.reduce((a, b) => (lum(a) >= lum(b) ? a : b))
})

function handleKeydown(e: KeyboardEvent) {
	// Cmd+, → navigate to Settings
	if ((e.metaKey || e.ctrlKey) && e.key === ",") {
		e.preventDefault()
		router.push("/settings")
	}
	// Cmd+1 → Library, Cmd+2 → Settings
	if ((e.metaKey || e.ctrlKey) && e.key === "1") {
		e.preventDefault()
		router.push("/")
	}
	if ((e.metaKey || e.ctrlKey) && e.key === "2") {
		e.preventDefault()
		router.push("/settings")
	}
}

onMounted(() => {
	themeStore.loadTheme()
	library.initFromPersistedDirectory()
	window.addEventListener("keydown", handleKeydown)
})

onUnmounted(() => {
	window.removeEventListener("keydown", handleKeydown)
})

function toggleDevTools() {
	window.electronAPI.toggleDevTools()
}
</script>

<style scoped>
#app-shell {
	position: relative;
	display: flex;
	flex-direction: column;
	height: 100vh;
	overflow: hidden;
}

.app-header {
	position: relative;
	z-index: 1;
	flex-shrink: 0;
	border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
	background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
	padding: 0 16px;
}

.header-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 0 6px;
}

.app-logo {
	height: 28px;
	width: auto;
	display: block;
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 4px;
}

.icon-btn {
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

.icon-btn:hover {
	color: var(--text-primary);
	background: var(--bg-hover);
}

.icon-btn--active {
	color: var(--accent);
	background: var(--bg-hover);
}

.nav-tabs {
	display: flex;
	gap: 4px;
}

.ember-wrap {
	position: relative;
}

img.app-title {
	height: 50px;
	position: relative;
	z-index: 1;
	filter: drop-shadow(0 3px 6px color-mix(in srgb, var(--ember-color) 50%, transparent))
		drop-shadow(0 6px 16px color-mix(in srgb, var(--ember-color) 30%, transparent))
		drop-shadow(0 0 8px color-mix(in srgb, var(--ember-color) 18%, transparent));
}

.ember-glow {
	position: absolute;
	bottom: 50px;
	left: 0;
	right: 0;
	height: 20px;
	z-index: -1;

	background: radial-gradient(
		ellipse at 50% 0%,
		color-mix(in srgb, var(--ember-color) 25%, transparent) 0%,
		color-mix(in srgb, var(--ember-color) 10%, transparent) 50%,
		transparent 100%
	);
	filter: blur(5px);
	animation: ember-glow-pulse 2.5s ease-in-out infinite;
}

@keyframes ember-glow-pulse {
	0%,
	100% {
		opacity: 0.4;
	}
	50% {
		opacity: 1;
	}
}

.ember-field {
	position: absolute;
	inset: 0;
	bottom: -4px;
	pointer-events: none;
	z-index: 2;
}

.ember {
	position: absolute;
	bottom: 0;
	width: var(--sz);
	height: var(--sz);
	left: var(--x);
	border-radius: 50%;
	pointer-events: none;
	background: var(--ember-color);
	box-shadow:
		0 0 3px 1px color-mix(in srgb, var(--ember-color) 70%, transparent),
		0 0 8px 2px color-mix(in srgb, var(--ember-color) 35%, transparent);
	opacity: 0;
	will-change: transform, opacity;
}

.e1 {
	--x: 5%;
	--sz: 2px;
	animation: rise-1 2.4s 0s infinite;
}
.e2 {
	--x: 12%;
	--sz: 1.5px;
	animation: rise-2 3.2s 0.4s infinite;
}
.e3 {
	--x: 20%;
	--sz: 2.5px;
	animation: rise-3 2.8s 1.2s infinite;
}
.e4 {
	--x: 28%;
	--sz: 2px;
	animation: rise-1 3.6s 0.8s infinite;
}
.e5 {
	--x: 35%;
	--sz: 1.5px;
	animation: rise-2 2.6s 2s infinite;
}
.e6 {
	--x: 42%;
	--sz: 3px;
	animation: rise-3 3s 0.2s infinite;
}
.e7 {
	--x: 50%;
	--sz: 2px;
	animation: rise-1 3.4s 1.6s infinite;
}
.e8 {
	--x: 58%;
	--sz: 2.5px;
	animation: rise-2 2.2s 0.6s infinite;
}
.e9 {
	--x: 65%;
	--sz: 1.5px;
	animation: rise-3 3.8s 1s infinite;
}
.e10 {
	--x: 72%;
	--sz: 2px;
	animation: rise-1 2.8s 2.4s infinite;
}
.e11 {
	--x: 78%;
	--sz: 3px;
	animation: rise-2 3.2s 0.3s infinite;
}
.e12 {
	--x: 85%;
	--sz: 2px;
	animation: rise-3 2.6s 1.8s infinite;
}
.e13 {
	--x: 92%;
	--sz: 1.5px;
	animation: rise-1 3s 1.4s infinite;
}
.e14 {
	--x: 97%;
	--sz: 2px;
	animation: rise-2 3.4s 2.2s infinite;
}

@keyframes rise-1 {
	0% {
		transform: translateY(0) translateX(0);
		opacity: 0;
	}
	8% {
		opacity: 0.9;
	}
	20% {
		transform: translateY(-10px) translateX(2px);
		opacity: 0.2;
	}
	35% {
		transform: translateY(-20px) translateX(-1px);
		opacity: 0.85;
	}
	50% {
		transform: translateY(-30px) translateX(3px);
		opacity: 0.15;
	}
	65% {
		transform: translateY(-40px) translateX(0);
		opacity: 0.7;
	}
	80% {
		transform: translateY(-48px) translateX(-2px);
		opacity: 0.3;
	}
	100% {
		transform: translateY(-58px) translateX(1px);
		opacity: 0;
	}
}

@keyframes rise-2 {
	0% {
		transform: translateY(0) translateX(0);
		opacity: 0;
	}
	10% {
		opacity: 0.7;
	}
	15% {
		opacity: 0.1;
	}
	25% {
		transform: translateY(-8px) translateX(-2px);
		opacity: 0.95;
	}
	30% {
		opacity: 0.2;
	}
	45% {
		transform: translateY(-18px) translateX(2px);
		opacity: 0.8;
	}
	55% {
		opacity: 0.1;
	}
	70% {
		transform: translateY(-32px) translateX(-1px);
		opacity: 0.6;
	}
	85% {
		transform: translateY(-42px) translateX(1px);
		opacity: 0.15;
	}
	100% {
		transform: translateY(-48px) translateX(0);
		opacity: 0;
	}
}

@keyframes rise-3 {
	0% {
		transform: translateY(0) translateX(0);
		opacity: 0;
	}
	5% {
		opacity: 0.6;
	}
	18% {
		transform: translateY(-10px) translateX(3px);
		opacity: 0.3;
	}
	28% {
		opacity: 1;
	}
	42% {
		transform: translateY(-24px) translateX(-2px);
		opacity: 0.2;
	}
	58% {
		transform: translateY(-36px) translateX(1px);
		opacity: 0.75;
	}
	72% {
		transform: translateY(-44px) translateX(-1px);
		opacity: 0.15;
	}
	88% {
		transform: translateY(-52px) translateX(2px);
		opacity: 0.5;
	}
	100% {
		transform: translateY(-60px) translateX(0);
		opacity: 0;
	}
}

.nav-tab {
	padding: 8px 16px;
	text-decoration: none;
	color: var(--text-secondary);
	font-size: 13px;
	font-weight: 500;
	border-radius: 6px 6px 0 0;
	transition:
		color 0.15s,
		background 0.15s;
}

.nav-tab:hover {
	color: var(--text-primary);
	background: var(--bg-hover);
}

.nav-tab.active {
	color: var(--text-primary);
	background: var(--bg-primary);
	border: 1px solid var(--border);
	border-bottom-color: var(--bg-primary);
	margin-bottom: -1px;
}

.header-info {
	margin-left: auto;
	display: flex;
	gap: 16px;
	align-items: center;
}

.header-info-item {
	display: flex;
	align-items: center;
	gap: 5px;
	font-size: 11px;
}

.header-info-label {
	font-weight: 700;
	color: var(--text-secondary);
}

.header-info-value {
	color: var(--success);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 300px;
}

.header-info-value.glow {
	animation: glow 1.5s steps(3, end) infinite;
}

@keyframes glow {
	0%,
	100% {
		text-shadow: 0 0 2px var(--success);
	}
	50% {
		text-shadow:
			0 0 6px var(--success),
			0 0 8px var(--success);
	}
}

.app-main {
	flex: 1;
	overflow: hidden;
}
</style>
