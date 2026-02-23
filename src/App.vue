<template>
	<BootSplash v-if="showBootSplash" @done="showBootSplash = false" />
	<div id="app-shell">
		<AuroraBackground />

		<header class="app-header">
			<div class="header-top">
				<img class="app-logo" src="/ForgeIconLogo.png" alt="ForgeAudioIcon" />
				<!-- <h1 class="heading">ForgeAudio</h1> -->
				<img class="app-title" src="/ForgeTextLogo.png" alt="ForgeAudioText" />

				<div class="header-actions">
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
		</header>
		<main class="app-main">
			<router-view />
		</main>

		<Player />
		<TagStoreDebugModal v-if="showDebugModal" @close="showDebugModal = false" />
	</div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"
import { useRouter } from "vue-router"
import BootSplash from "./components/BootSplash.vue"
import Player from "./components/Player.vue"
import ThemeGenerator from "./components/ThemeGenerator.vue"
import TagStoreDebugModal from "./components/TagStoreDebugModal.vue"
import AuroraBackground from "./components/AuroraBackground.vue"
import { useThemeStore } from "./stores/themeStore"
import { useLibraryStore } from "./stores/libraryStore"

const themeStore = useThemeStore()
const library = useLibraryStore()
const router = useRouter()
const showBootSplash = ref(true)
const showDebugModal = ref(false)

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

.nav-tabs {
	display: flex;
	gap: 4px;
}

img.app-title {
	height: 50px;
	filter: drop-shadow(0 0 8px rgba(0, 255, 180, 0.4)) drop-shadow(0 0 20px rgba(0, 255, 180, 0.2))
		drop-shadow(0 0 40px rgba(0, 255, 180, 0.1));
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
