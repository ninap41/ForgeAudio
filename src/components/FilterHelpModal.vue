<template>
  <BaseModal title="Search Filters" maxWidth="520px" @close="$emit('close')">
    <table class="filter-table">
      <thead>
        <tr>
          <th>Syntax</th>
          <th>Type</th>
          <th>Action</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="guide in filterGuides" :key="guide.syntax">
          <td><code>{{ guide.syntax }}</code></td>
          <td>{{ guide.type }}</td>
          <td>{{ guide.action }}</td>
          <td>{{ guide.description }}</td>
        </tr>
      </tbody>
    </table>
    <div class="tips">
      <p class="tips-title">Tips</p>
      <ul>
        <li>Press <kbd>Escape</kbd> to clear all filters</li>
        <li>Remove individual chips with the <code>&times;</code> button</li>
        <li>Including and excluding the same term moves it to exclude</li>
      </ul>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from '@/components/BaseModal.vue'

defineEmits<{ close: [] }>()

const filterGuides = [
  { syntax: 'text',   prefix: '',   type: 'Description', action: 'Include', description: 'Show files whose name or description contains the text' },
  { syntax: '!text',  prefix: '!',  type: 'Description', action: 'Exclude', description: 'Hide files whose name or description contains the text' },
  { syntax: '#tag',   prefix: '#',  type: 'Tag',         action: 'Include', description: 'Show only files that have the tag (AND with other includes)' },
  { syntax: '!#tag',  prefix: '!#', type: 'Tag',         action: 'Exclude', description: 'Hide files that have the tag (OR — any match is hidden)' },
]
</script>

<style scoped>
.filter-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0 16px;
}

.filter-table th {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  text-align: left;
  padding: 6px 10px;
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border);
}

.filter-table td {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 8px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
}

.filter-table tbody tr:last-child td {
  border-bottom: none;
}

.filter-table code {
  display: inline-block;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
  font-weight: 600;
}

.tips {
  margin-top: 4px;
  margin-bottom: 8px;
}

.tips-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.tips ul {
  margin: 0;
  padding-left: 18px;
}

.tips li {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
}

.tips kbd {
  display: inline-block;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0 4px;
  font-size: 11px;
  font-family: monospace;
  color: var(--text-secondary);
}

.tips code {
  color: var(--text-secondary);
  font-family: monospace;
  font-size: 12px;
}
</style>
