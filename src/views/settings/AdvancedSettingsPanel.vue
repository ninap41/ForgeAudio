<template>
  <section class="settings-section">
    <h3>Advanced Settings</h3>
    <p class="panel-description">
      Fine-tune scanner performance and automation. These settings control how files
      are scanned, whether durations are loaded automatically, and whether backups are created on every save.
    </p>

    <div class="settings-grid">
      <!-- Scanner Settings -->
      <div class="setting-card">
        <h4>Scanner</h4>
        <div class="form-group">
          <label>Batch size</label>
          <div class="input-with-hint">
            <input
              type="number"
              v-model.number="settings.scannerBatchSize"
              min="10"
              max="200"
              class="text-input number-input"
              @change="persistSettings"
            />
            <span class="input-hint">Files per batch (10-200)</span>
          </div>
        </div>
        <div class="form-group">
          <label>Duration workers</label>
          <div class="input-with-hint">
            <input
              type="number"
              v-model.number="settings.durationConcurrency"
              min="1"
              max="32"
              class="text-input number-input"
              @change="persistSettings"
            />
            <span class="input-hint">Parallel duration loaders (1-32)</span>
          </div>
        </div>
      </div>

      <!-- Performance -->
      <div class="setting-card">
        <h4>Performance</h4>
        <div class="toggle-row">
          <div class="toggle-info">
            <span class="toggle-label">Auto-load Durations</span>
            <span class="toggle-hint">Automatically load audio durations after scan</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="settings.autoLoadDurations" @change="persistSettings" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="toggle-row">
          <div class="toggle-info">
            <span class="toggle-label">Auto-backup on Save</span>
            <span class="toggle-hint">Create a backup every time metadata is saved</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="settings.autoBackup" @change="persistSettings" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Appearance -->
      <div class="setting-card">
        <h4>Appearance</h4>
        <div class="toggle-row">
          <div class="toggle-info">
            <span class="toggle-label">Boot Splash Animation</span>
            <span class="toggle-hint">Show the opening animation on app launch</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" v-model="settings.showBootSplash" @change="persistSettings" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settingsStore'
import { useLibraryStore } from '@/stores/libraryStore'

const settings = useSettingsStore()
const library = useLibraryStore()

function persistSettings() {
  library.saveMetadata()
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

h4 {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.setting-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
}

.form-group {
  margin-bottom: 12px;
}

label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 4px;
}

.input-with-hint {
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-input {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 8px;
  color: var(--text-primary);
  font-size: 12px;
}

.text-input:focus {
  outline: none;
  border-color: var(--accent);
}

.number-input {
  width: 70px;
}

.input-hint {
  font-size: 10px;
  color: var(--text-muted);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.toggle-row:last-child {
  border-bottom: none;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.toggle-hint {
  font-size: 10px;
  color: var(--text-muted);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  margin: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background: var(--text-muted);
  border-radius: 50%;
  transition: 0.2s;
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--accent);
  border-color: var(--accent);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(16px);
  background: white;
}
</style>
