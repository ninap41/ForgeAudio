<template>
	<div class="drawer-root">
		<div class="drawer-backdrop" @click.self="$emit('close')" />
		<div class="soundboard-drawer">
		<div class="drawer-header">
			<span class="drawer-title">SOUNDBOARDS</span>
			<button class="drawer-close-btn" @click="$emit('close')" title="Close">
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

		<!-- Create Soundboard Section -->
		<div class="drawer-section">
			<div class="section-label">CREATE SOUNDBOARD</div>
			<input
				v-model="newName"
				class="drawer-input"
				type="text"
				placeholder="Name *"
				@keydown.enter="handleCreate"
			/>
			<input
				v-model="newDescription"
				class="drawer-input"
				type="text"
				placeholder="Description (optional)"
				@keydown.enter="handleCreate"
			/>
			<div class="create-row">
				<select v-model="newLayout" class="drawer-select">
					<option value="LIST">List</option>
					<option value="GRID">Grid</option>
				</select>
				<button class="btn btn-accent" :disabled="!newName.trim()" @click="handleCreate">Create</button>
			</div>
		</div>

		<!-- Soundboard List Section -->
		<div class="drawer-section">
			<div class="section-label">MY SOUNDBOARDS</div>
			<div v-if="profileSoundboards.length === 0" class="empty-msg">No soundboards for this profile</div>
			<div v-for="sb in profileSoundboards" :key="sb.id" class="sb-card">
				<div class="sb-card-header">
					<span class="sb-name">{{ sb.name }}</span>
					<div class="sb-actions">
						<button
							class="sb-action-btn"
							:class="{ 'sb-action-btn--active': sb.enabled }"
							:title="sb.enabled ? 'Undock' : 'Dock'"
							@click="library.toggleSoundboardEnabled(sb.id)"
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
								<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
								<line x1="8" y1="21" x2="16" y2="21" />
								<line x1="12" y1="17" x2="12" y2="21" />
							</svg>
						</button>
						<button class="sb-action-btn sb-action-btn--danger" title="Delete" @click="confirmDelete(sb.id)">
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
								<polyline points="3 6 5 6 21 6" />
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
							</svg>
						</button>
					</div>
				</div>
				<div v-if="sb.description" class="sb-description">{{ sb.description }}</div>
				<div class="sb-meta">
					<span class="sb-layout-badge">{{ sb.layoutType }}</span>
					<span class="sb-item-count">{{ sb.items.length }} item{{ sb.items.length !== 1 ? "s" : "" }}</span>
				</div>
			</div>
		</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useLibraryStore } from "../stores/libraryStore"
import { useSoundboardStore } from "../stores/soundboardStore"

defineEmits<{ close: [] }>()

const library = useLibraryStore()
const soundboardStore = useSoundboardStore()

const newName = ref("")
const newDescription = ref("")
const newLayout = ref<"LIST" | "GRID">("LIST")

const profileSoundboards = computed(() => soundboardStore.getSoundboardsForProfile(library.activeProfileName))

async function handleCreate() {
	const name = newName.value.trim()
	if (!name) return
	await library.createSoundboard(name, newDescription.value.trim(), newLayout.value)
	newName.value = ""
	newDescription.value = ""
	newLayout.value = "LIST"
}

async function confirmDelete(id: string) {
	await library.deleteSoundboard(id)
}
</script>

<style scoped>
.drawer-root {
	position: fixed;
	inset: 0;
	z-index: 89;
}

.drawer-backdrop {
	position: fixed;
	inset: 0;
	z-index: 89;
	background: rgba(0, 0, 0, 0.3);
}

.soundboard-drawer {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	width: 380px;
	z-index: 90;
	background: var(--bg-secondary);
	border-left: 1px solid var(--border);
	display: flex;
	flex-direction: column;
	overflow-y: auto;
	transform: translateX(0);
	transition: transform 0.2s ease;
}

.drawer-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}

.drawer-title {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--text-secondary);
}

.drawer-close-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
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

.drawer-close-btn:hover {
	color: var(--text-primary);
	background: var(--bg-hover);
}

.drawer-section {
	padding: 12px 16px;
	border-bottom: 1px solid var(--border);
}

.section-label {
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--text-muted);
	margin-bottom: 8px;
}

.drawer-input {
	width: 100%;
	padding: 6px 8px;
	font-size: 12px;
	background: var(--bg-primary);
	border: 1px solid var(--border);
	border-radius: 4px;
	color: var(--text-primary);
	outline: none;
	box-sizing: border-box;
	margin-bottom: 6px;
}

.drawer-input:focus {
	border-color: var(--accent);
}

.drawer-select {
	padding: 6px 8px;
	font-size: 12px;
	background: var(--bg-primary);
	border: 1px solid var(--border);
	border-radius: 4px;
	color: var(--text-primary);
	outline: none;
	cursor: pointer;
}

.drawer-select:focus {
	border-color: var(--accent);
}

.create-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.btn {
	padding: 6px 12px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 500;
	cursor: pointer;
	border: 1px solid var(--border);
	background: var(--bg-secondary);
	color: var(--text-primary);
	transition:
		background 0.15s,
		color 0.15s;
}

.btn:hover {
	background: var(--bg-hover);
}

.btn-accent {
	background: var(--accent);
	color: var(--bg-primary);
	border-color: var(--accent);
}

.btn-accent:hover {
	background: var(--accent-hover);
}

.btn-accent:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.empty-msg {
	font-size: 12px;
	color: var(--text-muted);
	padding: 8px 0;
}

.sb-card {
	border: 1px solid var(--border);
	border-radius: 6px;
	padding: 8px 10px;
	margin-bottom: 6px;
}

.sb-card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.sb-name {
	font-size: 13px;
	font-weight: 500;
	color: var(--text-primary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex: 1;
	margin-right: 8px;
}

.sb-actions {
	display: flex;
	gap: 2px;
	flex-shrink: 0;
}

.sb-action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
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

.sb-action-btn:hover {
	color: var(--text-primary);
	background: var(--bg-hover);
}

.sb-action-btn--active {
	color: var(--accent);
}

.sb-action-btn--danger:hover {
	color: var(--danger);
}

.sb-description {
	font-size: 11px;
	color: var(--text-muted);
	font-style: italic;
	margin-top: 2px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sb-meta {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 4px;
}

.sb-layout-badge {
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.3px;
	color: var(--text-muted);
	background: var(--bg-primary);
	padding: 1px 5px;
	border-radius: 3px;
}

.sb-item-count {
	font-size: 10px;
	color: var(--text-muted);
}
</style>
