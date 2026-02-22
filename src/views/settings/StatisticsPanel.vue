<template>
  <section class="settings-section">
    <h3>Library Statistics</h3>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Files</div>
        <div class="stat-value">{{ library.files.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Size</div>
        <div class="stat-value">{{ totalSize }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tagged</div>
        <div class="stat-value">{{ taggedCount }} / {{ library.files.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Tags</div>
        <div class="stat-value">{{ avgTagsPerFile }}</div>
      </div>
    </div>

    <div class="format-breakdown">
      <h4>Format Breakdown</h4>
      <div class="format-list">
        <div v-for="(count, ext) in formatBreakdown" :key="ext" class="format-row">
          <span class="format-ext">{{ ext }}</span>
          <div class="format-bar-container">
            <div class="format-bar" :style="{ width: formatBarWidth(count) }"></div>
          </div>
          <span class="format-count">{{ count }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { formatBytes } from '@/utils/formatBytes'

const library = useLibraryStore()

const totalSize = computed(() => {
  const bytes = library.files.reduce((sum, file) => sum + file.size, 0)
  return formatBytes(bytes)
})

const taggedCount = computed(() => {
  return library.files.filter(f => f.tags.length > 0).length
})

const avgTagsPerFile = computed(() => {
  if (library.files.length === 0) return '0.00'
  const total = library.files.reduce((sum, file) => sum + file.tags.length, 0)
  return (total / library.files.length).toFixed(2)
})

const formatBreakdown = computed(() => {
  const breakdown: Record<string, number> = {}
  for (const file of library.files) {
    const ext = file.extension.toLowerCase() || 'unknown'
    breakdown[ext] = (breakdown[ext] ?? 0) + 1
  }
  // Sort by count descending
  return Object.fromEntries(
    Object.entries(breakdown).sort(([, a], [, b]) => b - a)
  )
})

function formatBarWidth(count: number): string {
  const max = Math.max(...Object.values(formatBreakdown.value))
  if (max === 0) return '0%'
  return `${(count / max) * 100}%`
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

h4 {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.format-breakdown {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
}

.format-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.format-ext {
  font-size: 11px;
  font-weight: 500;
  min-width: 40px;
  color: var(--text-secondary);
}

.format-bar-container {
  flex: 1;
  height: 20px;
  background: var(--bg-primary);
  border-radius: 2px;
  overflow: hidden;
}

.format-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-dark, var(--accent)));
  transition: width 0.2s;
}

.format-count {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 30px;
  text-align: right;
}
</style>
