<template>
  <section class="settings-section">
    <h3>Analytics & Insights</h3>

    <div class="analytics-grid">
      <!-- Tag Usage Distribution -->
      <div class="analytics-card">
        <h4>Tag Usage</h4>
        <div v-if="tagUsage.length > 0" class="tag-usage-list">
          <div v-for="item in tagUsage" :key="item.tag" class="tag-usage-row">
            <span
              class="tag-pill"
              :style="{ background: tagStore.getColor(item.tag) }"
            >
              {{ item.tag }}
            </span>
            <div class="usage-bar-container">
              <div
                class="usage-bar"
                :style="{
                  width: `${item.percentage}%`,
                  background: tagStore.getColor(item.tag),
                }"
              ></div>
            </div>
            <span class="usage-count">{{ item.count }} ({{ item.percentage }}%)</span>
          </div>
        </div>
        <div v-else class="empty-state">No tags in use</div>
      </div>

      <!-- Most Tagged Files -->
      <div class="analytics-card">
        <h4>Most Tagged Files</h4>
        <div v-if="mostTagged.length > 0" class="file-list">
          <div v-for="file in mostTagged" :key="file.path" class="file-row">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-tag-count">{{ file.tags.length }} tags</span>
          </div>
        </div>
        <div v-else class="empty-state">No tagged files</div>
      </div>

      <!-- Recently Played -->
      <div class="analytics-card">
        <h4>Recently Played</h4>
        <div v-if="recentlyPlayed.length > 0" class="file-list">
          <div v-for="file in recentlyPlayed" :key="file.path" class="file-row">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-date">{{ formatRelativeDate(file.lastPlayed!) }}</span>
          </div>
        </div>
        <div v-else class="empty-state">No playback history</div>
      </div>

      <!-- Recently Modified (by modifiedAt file system date) -->
      <div class="analytics-card">
        <h4>Recently Modified</h4>
        <div v-if="recentlyModified.length > 0" class="file-list">
          <div v-for="file in recentlyModified" :key="file.path" class="file-row">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-date">{{ formatRelativeDate(file.modifiedAt!) }}</span>
          </div>
        </div>
        <div v-else class="empty-state">No modification data</div>
      </div>
    </div>

    <!-- Library Summary -->
    <div class="summary-card">
      <h4>Library Summary</h4>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">Coverage</span>
          <span class="summary-value">{{ coveragePercent }}%</span>
          <span class="summary-detail">files have at least one tag</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Description Rate</span>
          <span class="summary-value">{{ descriptionPercent }}%</span>
          <span class="summary-detail">files have descriptions</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Tag Variety</span>
          <span class="summary-value">{{ uniqueTagCount }}</span>
          <span class="summary-detail">unique tags defined</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Orphaned Tags</span>
          <span class="summary-value">{{ orphanedTagCount }}</span>
          <span class="summary-detail">tags not assigned to any file</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useTagStore } from '@/stores/tagStore'

const library = useLibraryStore()
const tagStore = useTagStore()

// Tag usage sorted by count descending
const tagUsage = computed(() => {
  const counts: Record<string, number> = {}
  for (const file of library.files) {
    for (const tag of file.tags) {
      counts[tag] = (counts[tag] ?? 0) + 1
    }
  }

  const total = library.files.length || 1
  return Object.entries(counts)
    .map(([tag, count]) => ({
      tag,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
})

// Top 10 files with most tags
const mostTagged = computed(() => {
  return [...library.files]
    .filter(f => f.tags.length > 0)
    .sort((a, b) => b.tags.length - a.tags.length)
    .slice(0, 10)
})

// Top 10 recently played
const recentlyPlayed = computed(() => {
  return [...library.files]
    .filter(f => f.lastPlayed)
    .sort((a, b) => new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime())
    .slice(0, 10)
})

// Top 10 recently modified files
const recentlyModified = computed(() => {
  return [...library.files]
    .filter(f => f.modifiedAt)
    .sort((a, b) => new Date(b.modifiedAt!).getTime() - new Date(a.modifiedAt!).getTime())
    .slice(0, 10)
})

const coveragePercent = computed(() => {
  if (library.files.length === 0) return 0
  const tagged = library.files.filter(f => f.tags.length > 0).length
  return Math.round((tagged / library.files.length) * 100)
})

const descriptionPercent = computed(() => {
  if (library.files.length === 0) return 0
  const withDesc = library.files.filter(f => f.description).length
  return Math.round((withDesc / library.files.length) * 100)
})

const uniqueTagCount = computed(() => Object.keys(tagStore.tagDefinitions).length)

const orphanedTagCount = computed(() => {
  const usedTags = new Set<string>()
  for (const file of library.files) {
    for (const tag of file.tags) {
      usedTags.add(tag)
    }
  }
  return Object.keys(tagStore.tagDefinitions).filter(
    t => t !== 'uncategorized' && !usedTags.has(t)
  ).length
})

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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
  color: var(--text-primary);
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.analytics-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.tag-usage-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-usage-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-pill {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  min-width: 60px;
  text-align: center;
}

.usage-bar-container {
  flex: 1;
  height: 16px;
  background: var(--bg-primary);
  border-radius: 2px;
  overflow: hidden;
}

.usage-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease-out;
  opacity: 0.7;
}

.usage-count {
  font-size: 10px;
  color: var(--text-muted);
  min-width: 60px;
  text-align: right;
  white-space: nowrap;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}

.file-row:last-child {
  border-bottom: none;
}

.file-name {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.file-tag-count {
  font-size: 11px;
  color: var(--accent);
  white-space: nowrap;
}

.file-date {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
}

.summary-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 8px;
}

.summary-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
  margin-bottom: 2px;
}

.summary-detail {
  font-size: 10px;
  color: var(--text-muted);
}

.empty-state {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  padding: 16px 0;
}
</style>
