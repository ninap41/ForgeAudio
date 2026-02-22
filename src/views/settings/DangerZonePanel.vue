<template>
  <section class="settings-section danger-zone">
    <h3>Danger Zone</h3>
    <p class="panel-description">
      Irreversible destructive actions. Clearing tags, deleting definitions, or resetting metadata cannot be undone unless you
      have a backup. Each action requires you to type a confirmation phrase before it executes.
    </p>

    <div class="danger-card">
      <div class="danger-row">
        <div class="danger-info">
          <strong>Clear All Tags</strong>
          <p>Remove all tags from every file. Tag definitions will remain.</p>
        </div>
        <button
          class="btn btn-danger"
          @click="startAction('clearTags')"
        >
          Clear Tags
        </button>
      </div>

      <div class="danger-row">
        <div class="danger-info">
          <strong>Delete All Tag Definitions</strong>
          <p>Remove all tag definitions and clear tags from all files.</p>
        </div>
        <button
          class="btn btn-danger"
          @click="startAction('deleteTags')"
        >
          Delete Tags
        </button>
      </div>

      <div class="danger-row">
        <div class="danger-info">
          <strong>Clear All Descriptions</strong>
          <p>Remove descriptions from all files.</p>
        </div>
        <button
          class="btn btn-danger"
          @click="startAction('clearDescriptions')"
        >
          Clear Descriptions
        </button>
      </div>

      <div class="danger-row">
        <div class="danger-info">
          <strong>Reset All Metadata</strong>
          <p>Clear all tags, descriptions, and playback history. Files on disk are not affected.</p>
        </div>
        <button
          class="btn btn-danger"
          @click="startAction('resetAll')"
        >
          Reset All
        </button>
      </div>
    </div>

    <!-- Confirmation dialog -->
    <div v-if="pendingAction" class="confirm-overlay" @click.self="cancelAction">
      <div class="confirm-dialog">
        <h4>{{ confirmTitle }}</h4>
        <p class="confirm-warning">{{ confirmMessage }}</p>
        <p class="confirm-instruction">
          Type <strong>{{ confirmPhrase }}</strong> to confirm:
        </p>
        <input
          v-model="confirmInput"
          type="text"
          class="text-input"
          :placeholder="confirmPhrase"
          @keydown.enter="executeAction"
          @keydown.escape="cancelAction"
          ref="confirmInputEl"
        />
        <div class="confirm-actions">
          <button
            class="btn btn-danger"
            :disabled="confirmInput !== confirmPhrase"
            @click="executeAction"
          >
            Confirm {{ confirmTitle }}
          </button>
          <button class="btn" @click="cancelAction">Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useTagStore } from '@/stores/tagStore'

type DangerAction = 'clearTags' | 'deleteTags' | 'clearDescriptions' | 'resetAll'

const library = useLibraryStore()
const tagStore = useTagStore()

const pendingAction = ref<DangerAction | null>(null)
const confirmInput = ref('')
const confirmInputEl = ref<HTMLInputElement | null>(null)
const successMessage = ref('')

const confirmPhrase = computed(() => {
  switch (pendingAction.value) {
    case 'clearTags': return 'CLEAR TAGS'
    case 'deleteTags': return 'DELETE TAGS'
    case 'clearDescriptions': return 'CLEAR DESCRIPTIONS'
    case 'resetAll': return 'RESET ALL'
    default: return ''
  }
})

const confirmTitle = computed(() => {
  switch (pendingAction.value) {
    case 'clearTags': return 'Clear All Tags'
    case 'deleteTags': return 'Delete All Tag Definitions'
    case 'clearDescriptions': return 'Clear All Descriptions'
    case 'resetAll': return 'Reset All Metadata'
    default: return ''
  }
})

const confirmMessage = computed(() => {
  switch (pendingAction.value) {
    case 'clearTags':
      return `This will remove tags from all ${library.files.length} files. Tag definitions will be preserved.`
    case 'deleteTags':
      return 'This will delete all tag definitions and remove all tags from files. This cannot be undone.'
    case 'clearDescriptions':
      return `This will remove descriptions from all ${library.files.length} files.`
    case 'resetAll':
      return 'This will clear ALL metadata: tags, descriptions, and playback history. Files on disk will not be deleted.'
    default:
      return ''
  }
})

function startAction(action: DangerAction) {
  pendingAction.value = action
  confirmInput.value = ''
  successMessage.value = ''
  nextTick(() => {
    confirmInputEl.value?.focus()
  })
}

function cancelAction() {
  pendingAction.value = null
  confirmInput.value = ''
}

async function executeAction() {
  if (confirmInput.value !== confirmPhrase.value) return

  const action = pendingAction.value
  pendingAction.value = null
  confirmInput.value = ''

  switch (action) {
    case 'clearTags':
      for (const file of library.files) {
        file.tags = []
      }
      await library.saveMetadata()
      successMessage.value = 'All tags cleared from files'
      break

    case 'deleteTags': {
      // Clear tags from files
      for (const file of library.files) {
        file.tags = []
      }
      // Delete all tag definitions except uncategorized
      const tagNames = Object.keys(tagStore.tagDefinitions).filter(t => t !== 'uncategorized')
      for (const tag of tagNames) {
        tagStore.deleteTag(tag)
      }
      await library.saveMetadata()
      successMessage.value = 'All tag definitions deleted'
      break
    }

    case 'clearDescriptions':
      for (const file of library.files) {
        file.description = ''
      }
      await library.saveMetadata()
      successMessage.value = 'All descriptions cleared'
      break

    case 'resetAll':
      for (const file of library.files) {
        file.tags = []
        file.description = ''
        file.lastPlayed = null
      }
      const allTags = Object.keys(tagStore.tagDefinitions).filter(t => t !== 'uncategorized')
      for (const tag of allTags) {
        tagStore.deleteTag(tag)
      }
      await library.saveMetadata()
      successMessage.value = 'All metadata has been reset'
      break
  }

  setTimeout(() => {
    successMessage.value = ''
  }, 5000)
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
  color: var(--danger, #ff4d4d);
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
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.danger-card {
  border: 1px solid var(--danger, #ff4d4d);
  border-radius: 4px;
  overflow: hidden;
}

.danger-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--danger, #ff4d4d) 20%, var(--border));
}

.danger-row:last-child {
  border-bottom: none;
}

.danger-info {
  flex: 1;
  margin-right: 16px;
}

.danger-info strong {
  display: block;
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.danger-info p {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0;
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

.btn-danger {
  background: transparent;
  border-color: var(--danger, #ff4d4d);
  color: var(--danger, #ff4d4d);
}

.btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--danger, #ff4d4d) 10%, transparent);
}

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.confirm-dialog {
  background: var(--bg-primary);
  border: 1px solid var(--danger, #ff4d4d);
  border-radius: 8px;
  padding: 20px;
  max-width: 420px;
  width: 90%;
}

.confirm-warning {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.confirm-instruction {
  font-size: 12px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.text-input {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px;
  color: var(--text-primary);
  font-size: 13px;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.text-input:focus {
  outline: none;
  border-color: var(--danger, #ff4d4d);
}

.confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.success-message {
  font-size: 11px;
  color: var(--success, #4dff4d);
  padding: 8px 12px;
  background: color-mix(in srgb, var(--success, #4dff4d) 10%, transparent);
  border-radius: 4px;
  margin-top: 12px;
}
</style>
