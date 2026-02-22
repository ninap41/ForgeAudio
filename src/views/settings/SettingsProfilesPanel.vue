<template>
  <section class="settings-section">
    <h3>Settings Profiles</h3>
    <p class="panel-description">
      A profile is a saved snapshot of your entire library metadata tied to a specific directory path. It captures your tags,
      descriptions, theme, and the root folder you were working in. Save profiles to quickly switch between different audio
      libraries, or export them as <code>.forgerc</code> files to share with others. Loading a profile restores all of that
      data and rescans the directory.
    </p>

    <div class="profiles-grid">
      <!-- Current Profile -->
      <div class="profile-card active">
        <div class="profile-header">
          <span class="profile-name">{{ currentProfileName }}</span>
          <span class="profile-badge">Active</span>
        </div>
        <div class="profile-meta">
          {{ tagCount }} tags, {{ fileCount }} files with metadata
        </div>
      </div>

      <!-- Saved Profiles -->
      <div
        v-for="profile in profiles"
        :key="profile.name"
        class="profile-card"
      >
        <div class="profile-header">
          <span class="profile-name">{{ profile.name }}</span>
          <span class="profile-date">{{ formatDate(profile.createdAt) }}</span>
        </div>
        <div class="profile-meta">
          {{ profile.tagCount }} tags, {{ profile.fileCount }} files
        </div>
        <div class="profile-actions">
          <button class="btn btn-sm" @click="loadProfile(profile)">Load</button>
          <button class="btn btn-sm" @click="exportProfile(profile)">Export</button>
          <button class="btn btn-sm btn-danger-subtle" @click="deleteProfile(profile)">Delete</button>
        </div>
      </div>
    </div>

    <!-- Save / Import -->
    <div class="profile-actions-bar">
      <div class="save-profile">
        <input
          v-model="newProfileName"
          type="text"
          class="text-input"
          placeholder="Profile name..."
          @keydown.enter="saveProfile"
        />
        <button
          class="btn btn-accent"
          :disabled="!newProfileName.trim()"
          @click="saveProfile"
        >
          Save Current as Profile
        </button>
      </div>
      <button class="btn" @click="importProfile">Import Profile</button>
    </div>

    <div v-if="statusMessage" :class="['status-message', statusType]">
      {{ statusMessage }}
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useTagStore } from '@/stores/tagStore'

interface Profile {
  name: string
  createdAt: string
  tagCount: number
  fileCount: number
  data: string  // JSON stringified metadata
}

const library = useLibraryStore()
const tagStore = useTagStore()

const profiles = ref<Profile[]>([])
const newProfileName = ref('')
const currentProfileName = ref('Default')
const statusMessage = ref('')
const statusType = ref<'success' | 'error'>('success')

const tagCount = computed(() => Object.keys(tagStore.tagDefinitions).length)
const fileCount = computed(() =>
  library.files.filter(f => f.tags.length > 0 || f.description).length
)

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

async function saveProfile() {
  const name = newProfileName.value.trim()
  if (!name) return

  try {
    const metaRaw = await window.electronAPI.readMetadata()
    profiles.value.push({
      name,
      createdAt: new Date().toISOString(),
      tagCount: tagCount.value,
      fileCount: fileCount.value,
      data: metaRaw,
    })
    newProfileName.value = ''
    showStatus('Profile saved', 'success')
  } catch (err) {
    showStatus(`Failed to save profile: ${(err as Error).message}`, 'error')
  }
}

async function loadProfile(profile: Profile) {
  try {
    await window.electronAPI.writeMetadata(profile.data)
    currentProfileName.value = profile.name
    await library.rescan()
    showStatus(`Loaded profile "${profile.name}"`, 'success')
  } catch (err) {
    showStatus(`Failed to load profile: ${(err as Error).message}`, 'error')
  }
}

async function exportProfile(profile: Profile) {
  try {
    const path = await window.electronAPI.saveFileDialog(`${profile.name}.forgerc`)
    if (!path) return
    await window.electronAPI.writeFile(path, profile.data)
    showStatus(`Exported to ${path}`, 'success')
  } catch (err) {
    showStatus(`Failed to export: ${(err as Error).message}`, 'error')
  }
}

function deleteProfile(profile: Profile) {
  profiles.value = profiles.value.filter(p => p.name !== profile.name)
  showStatus(`Deleted profile "${profile.name}"`, 'success')
}

async function importProfile() {
  try {
    const filePath = await window.electronAPI.selectFile()
    if (!filePath) return
    const data = await window.electronAPI.readFile(filePath)

    // Validate it's valid metadata JSON
    const parsed = JSON.parse(data)
    if (!parsed.version) {
      showStatus('Invalid profile: missing version field', 'error')
      return
    }

    const name = filePath.split('/').pop()?.replace('.forgerc', '').replace('.json', '') ?? 'Imported'
    profiles.value.push({
      name,
      createdAt: new Date().toISOString(),
      tagCount: Object.keys(parsed.tags ?? {}).length,
      fileCount: Object.keys(parsed.files ?? {}).length,
      data,
    })
    showStatus(`Imported profile "${name}"`, 'success')
  } catch (err) {
    showStatus(`Failed to import: ${(err as Error).message}`, 'error')
  }
}

function showStatus(message: string, type: 'success' | 'error') {
  statusMessage.value = message
  statusType.value = type
  setTimeout(() => { statusMessage.value = '' }, 3000)
}
</script>

<style scoped>
.settings-section {
  margin-bottom: 32px;
}

h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel-description {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.panel-description code {
  font-size: 11px;
  padding: 1px 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 3px;
}

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.profile-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
}

.profile-card.active {
  border-color: var(--accent);
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.profile-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.profile-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--accent);
  color: white;
  text-transform: uppercase;
}

.profile-date {
  font-size: 10px;
  color: var(--text-muted);
}

.profile-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.profile-actions {
  display: flex;
  gap: 4px;
}

.profile-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.save-profile {
  display: flex;
  gap: 8px;
  flex: 1;
}

.text-input {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 8px;
  color: var(--text-primary);
  font-size: 12px;
  flex: 1;
}

.text-input:focus {
  outline: none;
  border-color: var(--accent);
}

.btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.btn:hover:not(:disabled) {
  background: var(--bg-hover);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-accent {
  background: var(--accent);
  border: none;
  color: white;
}

.btn-accent:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-sm {
  padding: 3px 8px;
  font-size: 11px;
}

.btn-danger-subtle {
  color: var(--danger, #ff4d4d);
  border-color: transparent;
}

.btn-danger-subtle:hover {
  background: color-mix(in srgb, var(--danger, #ff4d4d) 10%, transparent);
}

.status-message {
  font-size: 11px;
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 12px;
}

.status-message.success {
  color: var(--success, #4dff4d);
  background: color-mix(in srgb, var(--success, #4dff4d) 10%, transparent);
}

.status-message.error {
  color: var(--danger, #ff4d4d);
  background: color-mix(in srgb, var(--danger, #ff4d4d) 10%, transparent);
}
</style>
