# BaseModal — Reusable Modal System for Electron + Vite + Vue 3

A drop-in shared modal component for any Electron + Vite + Vue 3 project. Provides the overlay, ARIA accessibility, keyboard/click dismiss, and a full set of pre-styled CSS classes via slots — so every modal in your app is consistent with zero duplicated boilerplate.

---

## Setup

### 1. Copy `BaseModal.vue` into your project

Place `src/components/BaseModal.vue` in your components directory. No external dependencies — it's a single `.vue` SFC using only Vue 3 Composition API.

### 2. Define the required CSS custom properties

BaseModal styles reference these CSS variables. Define them on `:root` in your global stylesheet (e.g. `global.css`, `main.css`, or your theme system):

```css
:root {
  /* Backgrounds */
  --bg-primary: #1a1a1a;      /* Input/button background */
  --bg-secondary: #252525;    /* Modal panel background */
  --bg-hover: #333333;        /* Button hover state */

  /* Borders */
  --border: #3a3a3a;          /* Input/modal/button borders */

  /* Text */
  --text-primary: #e0e0e0;    /* Primary text, input text */
  --text-secondary: #a0a0a0;  /* Labels, body text */
  --text-muted: #707070;      /* Subtitles, hints */

  /* Accent (primary action color) */
  --accent: #4da6ff;          /* Accent button bg + input focus border */
  --accent-hover: #3d96ef;    /* Accent button hover */
}
```

All values are fully customizable — swap them for your own palette or wire them into a theme system. BaseModal has no hardcoded colors except for `.modal-error` (`#ff4d4d`) and `.btn-danger` (`#7f1d1d` / `#991b1b` / `#fca5a5`), which you can override with scoped styles or additional CSS variables if needed.

### 3. Use it

```vue
<template>
  <BaseModal title="My Modal" @close="$emit('close')">
    <p class="modal-body">Hello from a modal.</p>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from '@/components/BaseModal.vue'
defineEmits<{ close: [] }>()
</script>
```

---

## API Reference

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | **required** | Displayed in the `<h3>` header |
| `ariaLabel` | `string` | falls back to `title` | Sets `aria-label` on the dialog overlay |
| `maxWidth` | `string` | `'400px'` | CSS `max-width` on the `.modal` container |

### Emits

| Event | Triggered by |
|---|---|
| `close` | Clicking the overlay background (`.self` — not the modal panel), pressing Escape |

### Slots

| Slot | Purpose | Default content |
|---|---|---|
| `subtitle` | Rendered directly below the `<h3>` title | *(empty)* |
| `default` | Main body — inputs, text, custom content | *(empty)* |
| `actions` | Footer button row | A single "Close" button |

---

## Provided CSS Classes

BaseModal exposes these classes to slotted content via `:deep()` scoped styles. Use them directly on elements inside any slot — no extra imports or style blocks needed.

### Text

| Class | Element | What it does |
|---|---|---|
| `.modal-subtitle` | `<p>` | 12px `--text-muted`, truncated with ellipsis, 16px bottom margin |
| `.modal-body` | `<p>` | 13px `--text-secondary`, 16px bottom margin |
| `.modal-error` | `<p>` | 12px red (`#ff4d4d`), 12px bottom margin |

### Inputs

| Class | Element | What it does |
|---|---|---|
| `.modal-input` | `<input>` | Full-width, `--bg-primary` background, `--border` border, focus → `--accent` border |
| `.modal-textarea` | `<textarea>` | Same as `.modal-input` + vertical resize, `font-family: inherit` |
| `.field-label` | `<label>` | 11px uppercase `--text-secondary`, 0.4px letter-spacing |

### Buttons

| Class | Element | What it does |
|---|---|---|
| `.btn` | `<button>` | Default: `--bg-primary` background, `--border`, hover → `--bg-hover`, disabled → 50% opacity |
| `.btn-accent` | `<button>` | `--accent` background, black text, hover → `--accent-hover` |
| `.btn-danger` | `<button>` | Dark red background (`#7f1d1d`), light red text (`#fca5a5`) |

---

## Conventions

### ARIA & Accessibility
- BaseModal automatically sets `role="dialog"`, `aria-modal="true"`, and `aria-label` — don't add these manually in child modals
- The overlay traps visual focus; combine with a focus-trap library if needed for strict WCAG compliance

### Keyboard
- **Escape**: Handled by BaseModal — closes the modal
- **Enter**: Add `@keydown.enter="submit"` on inputs for keyboard submission
- Child modals can also listen for `@keydown.escape="$emit('close')"` on individual inputs — the event bubbles up and both handlers fire (no conflict)

### Auto-focus
Focus the primary input on mount so users can start typing immediately:
```ts
const inputEl = ref<HTMLInputElement>()
onMounted(() => inputEl.value?.focus())
```

### Error handling
```vue
<p v-if="error" class="modal-error">{{ error }}</p>
```
- Store error in a `ref<string>('')`
- Clear error at the start of each submission attempt
- On IPC/API failure, set the error and keep the modal open

### Loading states
```vue
<button class="btn btn-accent" :disabled="loading || !isValid">
  {{ loading ? 'Saving...' : 'Save' }}
</button>
```
- Disable both Cancel and Submit buttons during async operations
- Show inline loading text on the submit button

### Close on success
- Only call `emit('close')` after the operation succeeds
- On error, keep the modal open and display the error message

---

## Full Template Example

A complete modal with labeled input, error handling, loading state, and auto-focus:

```vue
<template>
  <BaseModal title="Rename Item" @close="$emit('close')">
    <template #subtitle>
      <p class="modal-subtitle">{{ currentName }}</p>
    </template>

    <label class="field-label">New Name</label>
    <input
      ref="inputEl"
      v-model="newName"
      class="modal-input"
      placeholder="Enter a new name..."
      @keydown.enter="submit"
      @keydown.escape="$emit('close')"
    />

    <p v-if="error" class="modal-error">{{ error }}</p>

    <template #actions>
      <button class="btn" @click="$emit('close')" :disabled="loading">Cancel</button>
      <button
        class="btn btn-accent"
        @click="submit"
        :disabled="loading || !newName.trim()"
      >
        {{ loading ? 'Renaming...' : 'Rename' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BaseModal from '@/components/BaseModal.vue'

defineProps<{ currentName: string }>()
const emit = defineEmits<{ close: [] }>()

const inputEl = ref<HTMLInputElement>()
const newName = ref('')
const error = ref('')
const loading = ref(false)

onMounted(() => inputEl.value?.focus())

async function submit() {
  const name = newName.value.trim()
  if (!name) return

  loading.value = true
  error.value = ''

  try {
    // Replace with your IPC call or API request
    await window.electronAPI.renameItem(name)
    emit('close')
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}
</script>
```

### Confirmation modal (no inputs)

```vue
<template>
  <BaseModal title="Delete Item" @close="$emit('close')">
    <template #subtitle>
      <p class="modal-subtitle">{{ itemName }}</p>
    </template>
    <p class="modal-body">This action cannot be undone.</p>
    <p v-if="error" class="modal-error">{{ error }}</p>
    <template #actions>
      <button class="btn" @click="$emit('close')" :disabled="loading">Cancel</button>
      <button class="btn btn-danger" @click="confirm" :disabled="loading">
        {{ loading ? 'Deleting...' : 'Delete' }}
      </button>
    </template>
  </BaseModal>
</template>
```

### Info/display modal (default Close button)

```vue
<template>
  <BaseModal title="About" maxWidth="500px" @close="$emit('close')">
    <p class="modal-body">Version 1.0.0</p>
    <!-- No #actions slot → BaseModal renders a default "Close" button -->
  </BaseModal>
</template>
```

---

## Scoped Style Overrides

If a modal needs to override a BaseModal-provided class (e.g. different subtitle color or danger button variant), add a scoped class alongside the base class:

```vue
<p class="modal-subtitle custom-subtitle">...</p>

<style scoped>
.custom-subtitle {
  font-size: 13px;
  color: var(--text-primary);
  white-space: normal;  /* allow wrapping */
}
</style>
```

Modal-specific elements (color pickers, file browsers, code viewers, etc.) should have their own scoped styles in the child modal — BaseModal only provides the shared foundation.

---

## Porting to a New Project

1. Copy `src/components/BaseModal.vue` into the new project
2. Define the CSS custom properties listed in [Setup](#2-define-the-required-css-custom-properties) in your global styles
3. Adjust the `@` path alias if your Vite config uses a different alias (or use relative imports)
4. Optionally copy `tests/baseModal.test.ts` — it uses Vitest + `@vue/test-utils` with no project-specific dependencies

That's it. No stores, no plugins, no external packages.
