<template>
  <section class="settings-section">
    <h3>Bulk Operations</h3>

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
          class="btn"
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
          class="btn"
          :disabled="!canReplace"
          @click="handleReplace"
        >
          Rename
        </button>
        <div v-if="replaceError" class="error-message">{{ replaceError }}</div>
        <div v-if="replaceSuccess" class="success-message">Tag renamed successfully</div>
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

const mergeSource = ref('')
const mergeTarget = ref('')
const mergeError = ref('')
const mergeSuccess = ref(false)

const replaceSource = ref('')
const replaceName = ref('')
const replaceError = ref('')
const replaceSuccess = ref(false)

const canMerge = computed(() => {
  return (
    mergeSource.value &&
    mergeTarget.value &&
    mergeSource.value !== mergeTarget.value &&
    mergeSource.value !== 'uncategorized'
  )
})

const canReplace = computed(() => {
  return replaceSource.value && replaceName.value.trim()
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
    setTimeout(() => {
      mergeSuccess.value = false
    }, 3000)
  }
}

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
    setTimeout(() => {
      replaceSuccess.value = false
    }, 3000)
  }
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

.btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--accent);
  border: none;
  color: white;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn:hover:not(:disabled) {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
