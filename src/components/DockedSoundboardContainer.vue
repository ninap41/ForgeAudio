<template>
	<div v-if="soundboardStore.enabledSoundboards.length > 0" class="docked-container">
		<DockPanel
			v-for="sb in soundboardStore.enabledSoundboards"
			:key="sb.id"
			:panel-id="sb.id"
			:title="sb.name"
			:collapsed="sb.state === 'minimized'"
			:width="sb.width ?? 280"
			:height="sb.height ?? 350"
			@toggle-collapse="library.toggleSoundboardState(sb.id)"
			@close="library.toggleSoundboardEnabled(sb.id)"
			@resize="(w: number, h: number) => handleResize(sb.id, w, h)"
		>
			<SoundboardListView v-if="sb.layoutType === 'LIST'" :soundboard="sb" />
			<SoundboardGridView v-else :soundboard="sb" />
		</DockPanel>
	</div>
</template>

<script setup lang="ts">
import DockPanel from "./DockPanel.vue"
import SoundboardListView from "./SoundboardListView.vue"
import SoundboardGridView from "./SoundboardGridView.vue"
import { useLibraryStore } from "../stores/libraryStore"
import { useSoundboardStore } from "../stores/soundboardStore"

const library = useLibraryStore()
const soundboardStore = useSoundboardStore()

let saveTimer: ReturnType<typeof setTimeout> | null = null

function handleResize(id: string, width: number, height: number) {
	soundboardStore.updateSoundboard(id, { width, height })
	if (saveTimer) clearTimeout(saveTimer)
	saveTimer = setTimeout(() => {
		library.saveMetadata()
	}, 300)
}
</script>

<style scoped>
.docked-container {
	position: fixed;
	bottom: 0;
	right: 0px;
	z-index: 50;
	display: flex;
	flex-direction: row-reverse;
	align-items: flex-end;
	pointer-events: none;
}
</style>
