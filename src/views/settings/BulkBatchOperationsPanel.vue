<template>
  <section class="settings-section">
    <h3>Bulk and Batch Operations</h3>

    <div class="operations-grid">
      <!-- Merge Tag -->
      <div class="operation-card">
        <h4>Merge Tag</h4>
        <div class="form-group">
          <label>From</label>
          <select v-model="mergeSource" class="select-input">
            <option value="">Select source tag...</option>
            <option v-for="(_, tag) in tagStore.tagDefinitions" :key="tag" :value="tag">
              {{ tag === 'uncategorized' ? `${tag} (cannot use)` : tag }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>To</label>
          <select v-model="mergeTarget" class="select-input">
            <option value="">Select target tag...</option>
            <option v-for="(_, tag) in tagStore.tagDefinitions" :key="tag" :value="tag">
              {{ tag }}
            </option>
          </select>
        </div>
        <button
          class="btn btn-accent"
          :disabled="!canMerge"
          @click="handleMerge"
        >
          Merge
        </button>
        <div v-if="mergeError" class="error-message">{{ mergeError }}</div>
        <div v-if="mergeSuccess" class="success-message">Tags merged successfully</div>
      </div>

      <!-- Find & Replace -->
      <div class="operation-card">
        <h4>Find & Replace Tag Name</h4>
        <div class="form-group">
          <label>Tag to rename</label>
          <select v-model="replaceSource" class="select-input">
            <option value="">Select tag...</option>
            <option v-for="(_, tag) in tagStore.tagDefinitions" :key="tag" :value="tag">
              {{ tag }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>New name</label>
          <input
            v-model="replaceName"
            type="text"
            class="text-input"
            placeholder="New tag name"
          />
        </div>
        <button
          class="btn btn-accent"
          :disabled="!canReplace"
          @click="handleReplace"
        >
          Rename
        </button>
        <div v-if="replaceError" class="error-message">{{ replaceError }}</div>
        <div v-if="replaceSuccess" class="success-message">Tag renamed successfully</div>
      </div>

      <!-- Add Tag to Files -->
      <div class="operation-card">
        <h4>Add Tag to Multiple Files</h4>
        <div class="form-group">
          <label>Target files</label>
          <select v-model="addTarget" class="select-input">
            <option value="untagged">All untagged files ({{ untaggedCount }})</option>
            <option value="all">All files ({{ library.files.length }})</option>
            <option value="extension">By extension</option>
          </select>
        </div>
        <div v-if="addTarget === 'extension'" class="form-group">
          <label>Extension</label>
          <select v-model="addExtension" class="select-input">
            <option value="">Select extension...</option>
            <option v-for="ext in availableExtensions" :key="ext" :value="ext">
              {{ ext }} ({{ extensionCount(ext) }})
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Tag to add</label>
          <select v-model="addTagName" class="select-input">
            <option value="">Select tag...</option>
            <option v-for="(_, tag) in tagStore.tagDefinitions" :key="tag" :value="tag">
              {{ tag }}
            </option>
          </select>
        </div>
        <div class="affected-count">{{ addAffectedCount }} files will be affected</div>
        <button
          class="btn btn-accent"
          :disabled="!canAdd"
          @click="handleAddTag"
        >
          Add Tag
        </button>
        <div v-if="addSuccess" class="success-message">Tag added to {{ lastAddCount }} files</div>
      </div>

      <!-- Remove Tag from Files -->
      <div class="operation-card">
        <h4>Remove Tag from Multiple Files</h4>
        <div class="form-group">
          <label>Tag to remove</label>
          <select v-model="removeTagName" class="select-input">
            <option value="">Select tag...</option>
            <option v-for="(_, tag) in tagStore.tagDefinitions" :key="tag" :value="tag">
              {{ tag }} ({{ fileCountForTag(tag) }} files)
            </option>
          </select>
        </div>
        <div class="affected-count" v-if="removeTagName">
          {{ fileCountForTag(removeTagName) }} files will be affected
        </div>
        <button
          class="btn btn-accent"
          :disabled="!removeTagName"
          @click="handleRemoveTag"
        >
          Remove Tag
        </button>
        <div v-if="removeSuccess" class="success-message">Tag removed from {{ lastRemoveCount }} files</div>
      </div>

      <!-- Batch Description -->
      <div class="operation-card">
        <h4>Set Description for Multiple Files</h4>
        <div class="form-group">
          <label>Target files</label>
          <select v-model="descTarget" class="select-input">
            <option value="no-description">Files without description ({{ noDescCount }})</option>
            <option value="tagged">Files with specific tag</option>
            <option value="extension">By extension</option>
          </select>
        </div>
        <div v-if="descTarget === 'tagged'" class="form-group">
          <label>Tag</label>
          <select v-model="descTagFilter" class="select-input">
            <option value="">Select tag...</option>
            <option v-for="(_, tag) in tagStore.tagDefinitions" :key="tag" :value="tag">
              {{ tag }}
            </option>
          </select>
        </div>
        <div v-if="descTarget === 'extension'" class="form-group">
          <label>Extension</label>
          <select v-model="descExtFilter" class="select-input">
            <option value="">Select extension...</option>
            <option v-for="ext in availableExtensions" :key="ext" :value="ext">
              {{ ext }} ({{ extensionCount(ext) }})
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Description</label>
          <input
            v-model="descText"
            type="text"
            class="text-input"
            placeholder="Enter description..."
          />
        </div>
        <div class="affected-count">{{ descAffectedCount }} files will be affected</div>
        <button
          class="btn btn-accent"
          :disabled="!canSetDescription"
          @click="handleSetDescription"
        >
          Set Description
        </button>
        <div v-if="descSuccess" class="success-message">Description set for {{ lastDescCount }} files</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useTagStore } from '@/stores/tagStore'

const library = useLibraryStore()
const tagStore = useTagStore()

// --- Merge Tag state ---
const mergeSource = ref('')
const mergeTarget = ref('')
const mergeError = ref('')
const mergeSuccess = ref(false)

const canMerge = computed(() => {
  return (
    mergeSource.value &&
    mergeTarget.value &&
    mergeSource.value !== mergeTarget.value &&
    mergeSource.value !== 'uncategorized'
  )
})

async function handleMerge() {
  mergeError.value = ''
  mergeSuccess.value = false

  const result = await library.mergeTag(mergeSource.value, mergeTarget.value)
  if (result.error) {
    mergeError.value = result.error
  } else {
    mergeSuccess.value = true
    mergeSource.value = ''
    mergeTarget.value = ''
    setTimeout(() => { mergeSuccess.value = false }, 3000)
  }
}

// --- Find & Replace state ---
const replaceSource = ref('')
const replaceName = ref('')
const replaceError = ref('')
const replaceSuccess = ref(false)

const canReplace = computed(() => {
  return replaceSource.value && replaceName.value.trim()
})

async function handleReplace() {
  replaceError.value = ''
  replaceSuccess.value = false

  const currentColor = tagStore.tagDefinitions[replaceSource.value]?.color ?? '#4da6ff'
  const result = await library.editTag(replaceSource.value, replaceName.value, currentColor)
  if (result.error) {
    replaceError.value = result.error
  } else {
    replaceSuccess.value = true
    replaceSource.value = ''
    replaceName.value = ''
    setTimeout(() => { replaceSuccess.value = false }, 3000)
  }
}

// --- Add Tag to Files state ---
const addTarget = ref<'untagged' | 'all' | 'extension'>('untagged')
const addExtension = ref('')
const addTagName = ref('')
const addSuccess = ref(false)
const lastAddCount = ref(0)

// --- Remove Tag state ---
const removeTagName = ref('')
const removeSuccess = ref(false)
const lastRemoveCount = ref(0)

// --- Batch Description state ---
const descTarget = ref<'no-description' | 'tagged' | 'extension'>('no-description')
const descTagFilter = ref('')
const descExtFilter = ref('')
const descText = ref('')
const descSuccess = ref(false)
const lastDescCount = ref(0)

// --- Shared computeds ---
const untaggedCount = computed(() => library.files.filter(f => f.tags.length === 0).length)
const noDescCount = computed(() => library.files.filter(f => !f.description).length)

const availableExtensions = computed(() => {
  const exts = new Set<string>()
  for (const file of library.files) {
    if (file.extension) exts.add(file.extension.toLowerCase())
  }
  return Array.from(exts).sort()
})

function extensionCount(ext: string): number {
  return library.files.filter(f => f.extension.toLowerCase() === ext).length
}

function fileCountForTag(tag: string): number {
  return library.files.filter(f => f.tags.includes(tag)).length
}

const addTargetFiles = computed(() => {
  switch (addTarget.value) {
    case 'untagged':
      return library.files.filter(f => f.tags.length === 0)
    case 'all':
      return [...library.files]
    case 'extension':
      return addExtension.value
        ? library.files.filter(f => f.extension.toLowerCase() === addExtension.value)
        : []
    default:
      return []
  }
})

const addAffectedCount = computed(() => {
  if (!addTagName.value) return addTargetFiles.value.length
  return addTargetFiles.value.filter(f => !f.tags.includes(addTagName.value)).length
})

const canAdd = computed(() => {
  return addTagName.value && addAffectedCount.value > 0
})

const descTargetFiles = computed(() => {
  switch (descTarget.value) {
    case 'no-description':
      return library.files.filter(f => !f.description)
    case 'tagged':
      return descTagFilter.value
        ? library.files.filter(f => f.tags.includes(descTagFilter.value))
        : []
    case 'extension':
      return descExtFilter.value
        ? library.files.filter(f => f.extension.toLowerCase() === descExtFilter.value)
        : []
    default:
      return []
  }
})

const descAffectedCount = computed(() => descTargetFiles.value.length)

const canSetDescription = computed(() => {
  return descText.value.trim() && descAffectedCount.value > 0
})

function handleAddTag() {
  const paths = addTargetFiles.value
    .filter(f => !f.tags.includes(addTagName.value))
    .map(f => f.path)

  if (paths.length === 0) return

  library.addTagToFiles(paths, addTagName.value)
  lastAddCount.value = paths.length
  addSuccess.value = true
  addTagName.value = ''

  setTimeout(() => { addSuccess.value = false }, 3000)
}

function handleRemoveTag() {
  const paths = library.files
    .filter(f => f.tags.includes(removeTagName.value))
    .map(f => f.path)

  if (paths.length === 0) return

  library.removeTagFromFiles(paths, removeTagName.value)
  lastRemoveCount.value = paths.length
  removeSuccess.value = true
  removeTagName.value = ''

  setTimeout(() => { removeSuccess.value = false }, 3000)
}

function handleSetDescription() {
  const paths = descTargetFiles.value.map(f => f.path)
  if (paths.length === 0) return

  library.setDescriptionForFiles(paths, descText.value.trim())
  lastDescCount.value = paths.length
  descSuccess.value = true
  descText.value = ''

  setTimeout(() => { descSuccess.value = false }, 3000)
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

.operations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.operation-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.select-input,
.text-input {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 8px;
  color: var(--text-primary);
  font-size: 12px;
}

.select-input:focus,
.text-input:focus {
  outline: none;
  border-color: var(--accent);
}

.affected-count {
  font-size: 11px;
  color: var(--text-muted);
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

.error-message {
  font-size: 11px;
  color: var(--danger, #ff4d4d);
  padding: 4px 8px;
  background: color-mix(in srgb, var(--danger, #ff4d4d) 10%, transparent);
  border-radius: 4px;
}

.success-message {
  font-size: 11px;
  color: var(--success, #4dff4d);
  padding: 4px 8px;
  background: color-mix(in srgb, var(--success, #4dff4d) 10%, transparent);
  border-radius: 4px;
}
</style>
