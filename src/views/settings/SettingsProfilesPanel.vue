<template>
  <section class="settings-section">
    <h3>Settings Profiles</h3>
    <p class="panel-description">
      A profile is a saved snapshot of your entire library metadata. It captures your tags,
      descriptions, theme, settings, and root directory. Save profiles to quickly switch between
      different configurations, or export them as <code>.forgerc</code> files to share with others.
      Switching profiles with the same directory is instant; switching to a different directory
      triggers a rescan.
    </p>

    <div class="profiles-grid">
      <!-- Saved Profiles -->
      <div
        v-for="profile in profileList"
        :key="profile.name"
        :class="['profile-card', { active: profile.name === library.activeProfileName }]"
      >
        <div class="profile-header">
          <span class="profile-name">{{ profile.name }}</span>
          <span v-if="profile.name === library.activeProfileName" class="profile-badge">Active</span>
          <span v-else class="profile-date">{{ formatDate(profile.createdAt) }}</span>
        </div>
        <div class="profile-meta">
          {{ Object.keys(profile.snapshot.tags).length }} tags,
          {{ Object.keys(profile.snapshot.files).length }} files
        </div>
        <div v-if="profile.snapshot.rootDirectory" class="profile-directory" :title="profile.snapshot.rootDirectory">
          {{ profile.snapshot.rootDirectory }}
        </div>
        <div v-if="profile.name !== library.activeProfileName" class="profile-actions">
          <button class="btn btn-sm" @click="loadProfile(profile.name)">Load</button>
          <button class="btn btn-sm" @click="exportProfile(profile.name)">Export</button>
          <button
            v-if="profile.name !== 'Default'"
            class="btn btn-sm btn-danger-subtle"
            @click="handleDeleteProfile(profile.name)"
          >Delete</button>
        </div>
        <div v-else class="profile-actions">
          <button class="btn btn-sm" @click="exportProfile(profile.name)">Export</button>
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
import { useLibraryStore, type ProfileEntry } from '@/stores/libraryStore'

const library = useLibraryStore()

const newProfileName = ref('')
const statusMessage = ref('')
const statusType = ref<'success' | 'error'>('success')

const profileList = computed(() => {
  return Object.values(library.profiles as Record<string, ProfileEntry>).sort((a, b) => {
    // Default always first
    if (a.name === 'Default') return -1
    if (b.name === 'Default') return 1
    return a.name.localeCompare(b.name)
  })
})

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

async function saveProfile() {
  const name = newProfileName.value.trim()
  if (!name) return

  try {
    const result = await library.createProfile(name)
    if (result.error) {
      showStatus(result.error, 'error')
      return
    }
    newProfileName.value = ''
    showStatus(`Profile "${name}" saved`, 'success')
  } catch (err) {
    showStatus(`Failed to save profile: ${(err as Error).message}`, 'error')
  }
}

async function loadProfile(name: string) {
  try {
    const result = await library.switchProfile(name)
    if (result.error) {
      showStatus(result.error, 'error')
      return
    }
    showStatus(`Switched to profile "${name}"`, 'success')
  } catch (err) {
    showStatus(`Failed to switch profile: ${(err as Error).message}`, 'error')
  }
}

async function exportProfile(name: string) {
  try {
    const entry = (library.profiles as Record<string, ProfileEntry>)[name]
    if (!entry) return

    const exportData = JSON.stringify({
      version: 1,
      ...entry.snapshot,
    }, null, 2)

    const path = await window.electronAPI.saveFileDialog(`${name}.forgerc`)
    if (!path) return
    await window.electronAPI.writeFile(path, exportData)
    showStatus(`Exported to ${path}`, 'success')
  } catch (err) {
    showStatus(`Failed to export: ${(err as Error).message}`, 'error')
  }
}

async function handleDeleteProfile(name: string) {
  try {
    const result = await library.deleteProfile(name)
    if (result.error) {
      showStatus(result.error, 'error')
      return
    }
    showStatus(`Deleted profile "${name}"`, 'success')
  } catch (err) {
    showStatus(`Failed to delete: ${(err as Error).message}`, 'error')
  }
}

async function importProfile() {
  try {
    const filePath = await window.electronAPI.selectFile()
    if (!filePath) return
    const data = await window.electronAPI.readFile(filePath)

    const parsed = JSON.parse(data)
    if (!parsed.version) {
      showStatus('Invalid profile: missing version field', 'error')
      return
    }

    const name = filePath.split('/').pop()?.replace('.forgerc', '').replace('.json', '') ?? 'Imported'

    // Build a ProfileSnapshot from the imported data
    const snapshot = {
      files: parsed.files ?? {},
      tags: parsed.tags ?? {},
      theme: parsed.theme,
      settings: parsed.settings,
      rootDirectory: parsed.rootDirectory ?? null,
    }

    // Add directly to the profiles map
    ;(library.profiles as Record<string, ProfileEntry>)[name] = {
      name,
      createdAt: new Date().toISOString(),
      snapshot,
    }

    await library.saveMetadata()
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
  margin-bottom: 4px;
}

.profile-directory {
  font-size: 10px;
  color: var(--text-muted);
  opacity: 0.7;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
