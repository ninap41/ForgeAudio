<template>
	<div id="app-shell">
		<header class="app-header">
			<div class="header-top">
				<img class="app-logo" src="/ForgeIconLogo.png" alt="ForgeAudioIcon" />
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
import { onMounted, ref } from "vue"
import Player from "./components/Player.vue"
import ThemeGenerator from "./components/ThemeGenerator.vue"
import TagStoreDebugModal from "./components/TagStoreDebugModal.vue"
import { useThemeStore } from "./stores/themeStore"
import { useLibraryStore } from "./stores/libraryStore"

const themeStore = useThemeStore()
const library = useLibraryStore()
const showDebugModal = ref(false)

onMounted(() => {
	themeStore.loadTheme()
	library.initFromPersistedDirectory()
})

function toggleDevTools() {
	window.electronAPI.toggleDevTools()
}
</script>

<style scoped>
#app-shell {
	display: flex;
	flex-direction: column;
	height: 100vh;
	overflow: hidden;
}

.app-header {
	flex-shrink: 0;
	border-bottom: 1px solid var(--border);
	background: var(--bg-secondary);
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

.app-main {
	flex: 1;
	overflow: hidden;
}
</style>
