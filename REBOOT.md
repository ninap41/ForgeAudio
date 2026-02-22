# Reboot Context for Claude Code

## Project
Audio Library Manager — Electron + Vue 3 + Vite app at `/Users/ninapalumbo/Desktop/FuckTheFinder`

## Current Branch
`master` — ahead of `main`

## Commit History (newest first)

| Hash | Summary |
|---|---|
| `c35c042` | feat: parallel scanner walk, streaming IPC scan, parallel duration loading |
| `6126b29` | fix: correct window mock in modals tests to preserve DOM event constructors |
| `98aab54` | feat: audio playback fix, tag categories, context menu modals, scan spinner, description display |
| `78a5249` | added tests |
| `8a84261` | Initial scaffold: Electron + Vue 3 + Vite audio library manager |

---

## What Was Done This Session

### Scanner performance optimization (committed as `c35c042`)

1. **Parallel directory walk + batched `stat()`** (`electron/ipc/scanner.ts`)
   - All sibling subdirectory walks now run concurrently via `Promise.all`
   - All `stat()` calls within a directory are batched with `Promise.all`
   - Added optional `onFile` callback to `scanDirectory` for streaming support

2. **Streaming IPC scan** (`electron/main.ts`, `electron/preload.ts`, `src/env.d.ts`)
   - Replaced `ipcMain.handle('fs:scanDirectory')` with `ipcMain.on` + `event.sender.send`
   - Main process streams batches of 50 files via `fs:scanProgress`, then sends `fs:scanDone`
   - Preload API: `startScan`, `onScanProgress`, `onScanDone`, `removeScanListeners` (replaced `scanDirectory`)

3. **Streaming `rescan()` + parallel `loadDurations()`** (`src/stores/libraryStore.ts`)
   - `rescan()` reads metadata first, then populates `files.value` incrementally as batches arrive
   - `loadDurations()` uses 8 concurrent workers instead of a serial `for await` loop

4. **New scanner tests** (`tests/scanner.test.ts`, `tests/libraryStore.test.ts`)
   - 7 new `onFile` callback tests + 1 sibling-subdir parallel walk test
   - libraryStore mock updated to match new streaming API

---

## Uncommitted Changes (3 files)

These are improvements to already-committed features from `98aab54` that were not yet staged.

### `src/components/Player.vue` — playback race condition fix
- Pause before `load()` to cancel any in-flight `play()` promise
- Use `@canplay` event to trigger `play()` once audio is actually ready, instead of calling it immediately after `load()`
- Wraps `play()` in try/catch to suppress `AbortError` during track switching

### `src/stores/tagStore.ts` — custom category persistence
- Added `customCategories` ref and included it in the `categories` computed
- Added `addCategory(name)` and `loadCategories(cats)` functions (for save/restore)

### `src/views/SettingsView.vue` — add category UI
- New "New category name" input row with an "Add Category" button wired to `tagStore.addCategory`

---

## Quick Start Next Session

```bash
cd ~/Desktop/FuckTheFinder

# 1. Commit the 3 outstanding files
git add src/components/Player.vue src/stores/tagStore.ts src/views/SettingsView.vue
git commit -m "fix: player race condition and custom category persistence"

# 2. Run tests to confirm everything is green
npm test

# 3. Launch for manual verification
npm run dev
```

## Key Architecture Notes

- **IPC scan flow**: renderer calls `startScan(dir)` → main streams `fs:scanProgress` batches → main sends `fs:scanDone` → `rescan()` promise resolves
- **Duration loading**: 8-worker pool pattern in `loadDurations()`; snapshot taken at call time so a re-scan mid-load is safe
- **Metadata format**: `library.json` in Electron userData; `LibraryMetadata` interface in `libraryStore.ts`
- **Tag categories**: stored in `tagStore.customCategories`; persisted via `saveMetadata()` → `meta.categories`; loaded on rescan via `tagStore.loadCategories()`
- **Audio URL scheme**: `atom://localfile` + `encodeURI(path)` (registered in `electron/main.ts`)

---

## Round: Header, DevTools, Scrubber Fix, App Rename
**Date:** 2026-02-21

### 1. ForgeAudio Logo + Header Redesign (`src/App.vue`)
- Added `public/ForgeAudioLogo.png` (copied from ~/Downloads; `public/` directory was created fresh).
- Split the app header into two rows:
  - **Top row**: logo on the left (`height: 28px`), action buttons on the right.
  - **Bottom row**: Library / Settings nav tabs (tab-underline style preserved).
- Added a DevTools toggle button (code `</>` icon) to the right of the ThemeGenerator in the header actions area.

### 2. DevTools — Off by Default + Toggle (`electron/main.ts`, `electron/preload.ts`, `src/env.d.ts`, `src/App.vue`)
- Removed `mainWindow.webContents.openDevTools()` — DevTools no longer auto-open in dev mode.
- Added `ipcMain.handle('devtools:toggle', ...)` — checks `isDevToolsOpened()` and toggles open/close.
- Exposed `toggleDevTools: () => ipcRenderer.invoke('devtools:toggle')` in the context bridge.
- Added `toggleDevTools: () => Promise<void>` to the `ElectronAPI` TS interface.
- Header button calls `window.electronAPI.toggleDevTools()`.

### 3. Audio Scrubber Fix (`src/components/Player.vue`)
- **Scrub stuck bug**: Added `document.addEventListener('mouseup', onDocumentMouseUp)` — if the mouse is released outside the slider, `commitScrub(currentTime.value)` is called to finalize the seek and clear `isScrubbing`. Cleaned up in `onUnmounted`.
- **Visual fill**: Added `scrubberPercent` computed (`currentTime / duration * 100`). Bound `--scrubber-pct` to the scrubber element via `:style`. Updated `.scrubber` CSS to `linear-gradient(to right, var(--accent) var(--scrubber-pct), var(--border) var(--scrubber-pct))`.
- **Edge case**: `:max` now falls back to `1` when duration is 0 to avoid `max="0"`.

### 4. App Rename to ForgeAudio
- `package.json`: Added `"productName": "ForgeAudio"` (used by electron-builder for `.app` bundle name). The `name` field and parent directory are unchanged.
- `electron/main.ts`: Added `mainWindow.setTitle('ForgeAudio')` for runtime window title.

### Test Status
All 97 tests passing after all changes.

---

## Round: Scrubber Tests + Chip-Based Filtering
**Date:** 2026-02-21

### 1. Player.vue — Scrubber Re-implementation (user-applied)
The user rewrote the scrubber to use `@pointerdown / @pointerup` instead of `@mousedown / @change`, and added `wasPlayingBeforeScrub` state. Key behavior:
- `onScrubStart` (pointerdown): sets `isScrubbing = true`, saves `wasPlayingBeforeScrub`, pauses audio
- `onScrubInput` (input): updates `currentTime` visually
- `onScrubEnd` (pointerup): reads `scrubberEl.valueAsNumber` directly, calls `seekTo`, resumes if was playing
- `onScrubChange` (change): keyboard-only path (no prior pointerdown)
- `seekTo(val)`: clamps to `[0, duration]`, sets `audioEl.currentTime`, holds `isScrubbing = true` until `seeked` event fires

### 2. Player scrubber tests (`tests/player.test.ts`) — new file, 13 tests
- `formatTime`: formats 125s → 2:05, shows 0:00 before audio loads
- `scrub start`: pauses audio on pointerdown when playing; no-throw when paused
- `scrub input`: current-time display updates as scrubber drags
- `scrub end`: seeks to correct position; resumes if was playing; no resume if was paused; clamps to 0; clamps to duration
- `isScrubbing guard`: timeupdate does not snap scrubber back mid-scrub; updates resume after `seeked` fires
- `keyboard scrubbing`: `@change` fires without pointerdown and seeks correctly

### 3. Chip-Based Filtering (`src/stores/libraryStore.ts`)
Replaced the `searchQuery`-string based `filteredFiles` logic with structured chip state:
- `selectedTags: string[]` — tag filter chips; file must have ALL active tags (AND)
- `descriptionFilters: string[]` — text filter chips; file must match ALL chips in name or description (AND)
- New functions: `addTagFilter`, `removeTagFilter`, `addDescriptionFilter` (trims, dedupes), `removeDescriptionFilter`, `clearAllFilters`
- `searchQuery` kept in store as text-input buffer (no longer used for filtering)

### 4. SearchBar — Chip UI (`src/components/SearchBar.vue`)
- Typing in the input and pressing **Enter** creates a description chip and clears the input
- **Escape** clears the input and all active filter chips
- Active chips displayed below the input row (tag chips in accent color, description chips in muted)
- Each chip has a `×` remove button
- "Clear all" button appears when any chips are active

### 5. AudioRow — Tag click → filter (`src/components/AudioRow.vue`)
- `@click.stop` on `<TagChip>` changed to `@click.stop="library.addTagFilter(tag)"` so clicking a tag in the list instantly adds it as a filter chip

### 6. libraryStore tests — updated + expanded (`tests/libraryStore.test.ts`)
- Replaced 6 `searchQuery`-based filter tests with equivalent chip-based versions
- Added 11 new tests for chip filter functions (addTagFilter, removeTagFilter, addDescriptionFilter, removeDescriptionFilter, clearAllFilters) covering: add, dedup, trim, empty-string guard, AND semantics, clear

### Test Status
10 test files, **121 tests**, all passing.
