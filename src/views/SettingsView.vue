<template>
	<div class="settings-layout">
		<nav class="settings-nav" aria-label="Settings navigation">
			<div
				v-for="item in navItems"
				:key="item.id"
				class="nav-item"
				:class="{ active: activePanel === item.id, danger: item.id === 'danger-zone' }"
				role="button"
				tabindex="0"
				@click="activePanel = item.id"
				@keydown.enter="activePanel = item.id"
			>
				{{ item.label }}
			</div>
		</nav>

		<div class="settings-content">
			<!-- General (Library + Tags + Statistics) -->
			<div v-if="activePanel === 'general'">
				<p class="panel-description">
					Your library at a glance. Set your root audio folder, manage tag definitions, and view overall statistics.
					This panel updates automatically whenever you scan a directory, add or remove tags, or change file metadata.
				</p>

				<section class="settings-section">
					<h3>Library</h3>
					<div class="settings-directory-info">
						<div class="setting-row">
							<span class="setting-label">Root directory</span>
							<span class="setting-value">{{ library.rootDirectory ?? "Not set" }}</span>
							<button class="btn" @click="library.selectAndScanDirectory()">Change</button>
						</div>
					</div>
				</section>

				<section class="settings-section">
					<h3>Tags</h3>

					<div class="tag-list" role="list" aria-label="Tag definitions">
						<div
							v-for="(def, tagName) in tagStore.tagDefinitions"
							:key="tagName"
							class="tag-row"
							role="listitem"
							tabindex="0"
							@keydown.enter="tagName !== 'uncategorized' && (editingTag = tagName as string)"
						>
							<input
								type="color"
								:value="def.color"
								@input="
									(e) => {
										tagStore.setTagColor(tagName, (e.target as HTMLInputElement).value)
										library.saveMetadata()
									}
								"
								class="color-picker"
								:aria-label="`Color for ${tagName}`"
							/>
							<span class="tag-name">{{ tagName }}</span>
							<span class="tag-count">{{ tagCounts[tagName] ?? 0 }} sound{{ (tagCounts[tagName] ?? 0) !== 1 ? "s" : "" }}</span>
							<button v-if="tagName !== 'uncategorized'" class="btn btn-subtle btn-sm" @click="editingTag = tagName as string">
								Edit
							</button>
							<button v-if="tagName !== 'uncategorized'" class="btn btn-subtle btn-sm" @click="clearingTag = tagName as string">
								Clear
							</button>
							<button
								v-if="tagName !== 'uncategorized'"
								class="btn btn-subtle btn-sm btn-danger-subtle"
								@click="() => (tagStore.deleteTag(tagName as string), library.saveMetadata())"
							>
								Delete
							</button>
						</div>
					</div>

					<div class="new-tag-row">
						<input v-model="newTagName" placeholder="Tag name" class="text-input" @keydown.enter="addTag" aria-label="New tag name" />
						<input v-model="newTagColor" type="color" class="color-picker" aria-label="New tag color" />
						<button class="btn" @click="addTag" :disabled="!newTagName.trim()">Add Tag</button>
					</div>
				</section>

				<StatisticsPanel />
			</div>

			<!-- Panel components -->
			<BulkBatchOperationsPanel v-if="activePanel === 'bulk-batch'" />
			<ExportImportPanel v-if="activePanel === 'export-import'" />
			<BackupPanel v-if="activePanel === 'backups'" />
			<AutoTagPanel v-if="activePanel === 'auto-tag'" />
			<AnalyticsPanel v-if="activePanel === 'analytics'" />
			<SettingsProfilesPanel v-if="activePanel === 'profiles'" />
			<AdvancedSettingsPanel v-if="activePanel === 'advanced'" />
			<DangerZonePanel v-if="activePanel === 'danger-zone'" />
		</div>

		<EditTagModal v-if="editingTag !== null" :tagName="editingTag" @close="editingTag = null" />
		<ClearTagModal v-if="clearingTag !== null" :tagName="clearingTag" @close="clearingTag = null" />
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useLibraryStore } from "@/stores/libraryStore"
import { useTagStore } from "@/stores/tagStore"
import EditTagModal from "@/components/EditTagModal.vue"
import ClearTagModal from "@/components/ClearTagModal.vue"
import StatisticsPanel from "./settings/StatisticsPanel.vue"
import BulkBatchOperationsPanel from "./settings/BulkBatchOperationsPanel.vue"
import ExportImportPanel from "./settings/ExportImportPanel.vue"
import BackupPanel from "./settings/BackupPanel.vue"
import AutoTagPanel from "./settings/AutoTagPanel.vue"
import AnalyticsPanel from "./settings/AnalyticsPanel.vue"
import SettingsProfilesPanel from "./settings/SettingsProfilesPanel.vue"
import AdvancedSettingsPanel from "./settings/AdvancedSettingsPanel.vue"
import DangerZonePanel from "./settings/DangerZonePanel.vue"

const navItems = [
	{ id: "general", label: "General" },
	{ id: "bulk-batch", label: "Bulk & Batch" },
	{ id: "export-import", label: "Export / Import" },
	{ id: "backups", label: "Backups" },
	{ id: "auto-tag", label: "Auto-Tag" },
	{ id: "analytics", label: "Analytics" },
	{ id: "profiles", label: "Profiles" },
	{ id: "advanced", label: "Advanced" },
	{ id: "danger-zone", label: "Danger Zone" },
] as const

const library = useLibraryStore()
const tagStore = useTagStore()

const activePanel = ref<string>("general")
const editingTag = ref<string | null>(null)
const clearingTag = ref<string | null>(null)
const newTagName = ref("")
const newTagColor = ref("#4da6ff")

const tagCounts = computed(() => {
	const counts: Record<string, number> = {}

	// Count files with each tag
	for (const file of library.files) {
		for (const tag of file.tags) {
			counts[tag] = (counts[tag] ?? 0) + 1
		}
	}

	// Count uncategorized files (those with no tags)
	const uncategorizedCount = library.files.filter((f) => f.tags.length === 0).length
	if (uncategorizedCount > 0) {
		counts["uncategorized"] = uncategorizedCount
	}

	return counts
})

function addTag() {
	const name = newTagName.value.trim().toLowerCase()
	if (!name) return
	tagStore.createTag(name, newTagColor.value)
	library.saveMetadata()
	newTagName.value = ""
}
</script>

<style scoped>
.settings-layout {
	display: flex;
	height: 100%;
	overflow: hidden;
}

.settings-nav {
	width: 180px;
	min-width: 180px;
	background: var(--bg-secondary);
	border-right: 1px solid var(--border);
	padding: 12px 0;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.nav-item {
	padding: 8px 16px;
	font-size: 12px;
	font-weight: 500;
	color: var(--text-secondary);
	cursor: pointer;
	transition: background 0.15s, color 0.15s;
	outline: none;
	white-space: nowrap;
}

.nav-item:hover {
	background: var(--bg-hover);
	color: var(--text-primary);
}

.nav-item:focus-visible {
	box-shadow: inset 0 0 0 2px var(--accent);
}

.nav-item.active {
	background: var(--bg-selected);
	color: var(--text-primary);
	border-left: 2px solid var(--accent);
	padding-left: 14px;
}

.nav-item.danger {
	color: var(--danger, #ff4d4d);
}

.nav-item.danger:hover {
	background: color-mix(in srgb, var(--danger, #ff4d4d) 8%, transparent);
}

.nav-item.danger.active {
	background: color-mix(in srgb, var(--danger, #ff4d4d) 12%, transparent);
	border-left-color: var(--danger, #ff4d4d);
}

.settings-content {
	flex: 1;
	padding: 24px;
	overflow-y: auto;
}

.panel-description {
	font-size: 12px;
	line-height: 1.5;
	color: var(--text-muted);
	margin-bottom: 20px;
}

h3 {
	font-size: 14px;
	font-weight: 600;
	margin-bottom: 16px;
	color: var(--text-secondary);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.settings-directory-info {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.settings-section {
	margin-bottom: 32px;
}

.setting-row {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 0;
}

.setting-label {
	font-weight: 500;
	min-width: 120px;
}

.setting-value {
	color: var(--text-secondary);
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
}

.tag-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin-bottom: 8px;
}

.tag-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 0;
	border-radius: 4px;
	outline: none;
}

.tag-row:focus-visible {
	box-shadow: 0 0 0 2px var(--accent);
}

.tag-name {
	flex: 1;
}

.tag-count {
	font-size: 11px;
	color: var(--text-muted);
	white-space: nowrap;
	min-width: 60px;
	text-align: right;
}

.new-tag-row {
	display: flex;
	gap: 8px;
	align-items: center;
	margin-top: 16px;
	padding-top: 16px;
	border-top: 1px solid var(--border);
}

.text-input {
	background: var(--bg-secondary);
	border: 1px solid var(--border);
	border-radius: 4px;
	padding: 5px 8px;
	color: var(--text-primary);
}

.color-picker {
	width: 28px;
	height: 28px;
	border: 1px solid var(--border);
	border-radius: 4px;
	background: none;
	cursor: pointer;
	padding: 0;
}

.btn {
	padding: 5px 12px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 500;
	background: var(--bg-primary);
	border: 1px solid var(--border);
	color: var(--text-primary);
	transition: background 0.15s;
}

.btn:hover {
	background: var(--bg-hover);
}
.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
.btn-subtle {
	border-color: transparent;
	color: var(--text-secondary);
}
.btn-sm {
	padding: 3px 8px;
	font-size: 11px;
}
.btn-danger-subtle {
	color: var(--danger, #ff4d4d);
}
.btn-danger-subtle:hover {
	background: color-mix(in srgb, var(--danger, #ff4d4d) 10%, transparent);
}
</style>
