# ForgeAudio

<img src="public/ForgeAudioHome.png" alt="ForgeAudio" />

A fast, local-first audio file browser and tagger built with Electron, Vue 3, and Vite. Designed for sound designers, musicians, and developers who want quick search, tagging, and preview of large audio collections — without the bloat of Finder.

---

## Features

### File Browser

- **Parallel recursive scanning** — breadth-parallel directory walk, batched `stat()` calls, and streamed results so the file list populates incrementally rather than all at once
- **Resizable column list view** — Filename (+ description), Tags, Duration, Type; drag any column header edge to resize
- **Live file count** — toolbar shows how many files match the current filters, footer shows X of Y total
- **Spinning overlay** during scan so you always know when a rescan is in progress
- **Rescan** button to refresh the list without changing the root folder

### Search & Filtering

- **Tag autocomplete** — type `#` in the search bar to see a live dropdown of all your tags with color swatches; arrow keys navigate, Enter selects
- **Filter chips** — pressing Enter commits the current query as a persistent chip below the search bar:
  - `#metal` → adds a **tag filter chip** (file must have that tag)
  - `impact` → adds a **description filter chip** (file name or description must contain that text)
- **Multiple chips** — add as many chips as you want; all chips must match (AND logic)
- **Chip removal** — click `×` on any chip to remove it; "Clear all" clears everything at once
- **Multi-select format filter** — button dropdown with checkboxes to filter by multiple file formats at once (`.wav`, `.mp3`, `.aiff`, `.flac`, `.ogg`, `.m4a`); label shows "All formats", single format, or "N formats"
- **Tagged / Untagged filter** — quickly isolate files that have tags or files that don't

### Audio Playback

- **Click any row** to load and play a file immediately
- **Play/pause button** per row and in the bottom player bar
- **Spacebar** global shortcut toggles play/pause from anywhere
- **Scrubber** — drag to seek; the track shows a filled progress bar; releasing the handle always lands exactly where you drop it
- **Loop toggle** — repeats the current file on end
- **Current time / total duration** display

### Tags & Metadata

- **Color-coded tags** — each tag has an assigned color shown as a pill in every row
- **Click a tag chip in a row** to instantly add it as a filter
- **Remove a tag** from a row by clicking `×` on its chip
- **Right-click context menu** on any row:
  - **Play** — loads and plays the file
  - **Add Tag** — modal with autocomplete from your tag library; creates the tag if it doesn't exist yet
  - **Edit Description** — freeform text saved alongside the file
  - **Rename** — renames the file on disk and scrolls to it in the list
  - **Delete** — confirmation modal before removing from disk
  - **Reveal in Finder** — opens the file's location in macOS Finder
  - **Copy Path** — copies the absolute path to the clipboard

### Theme Engine

- **Theme Generator** (palette icon in the header) — a panel with five color controls: Accent, Background, Text, Danger, Success
- **"Apply palette"** — pick a single source color and auto-derive a full dark theme from it
- Live preview as you adjust colors; **Save** persists the theme to `library.json`; **Reset** returns to the default dark theme

### Settings

- View and change the root library folder
- Full tag list with inline color pickers and delete buttons
- Add new tags with a custom name and color

---

## Tech Stack

|                    |                                                              |
| ------------------ | ------------------------------------------------------------ |
| **Electron**       | Desktop shell, IPC, native context menu, file system access  |
| **Vue 3**          | UI framework — Composition API + `<script setup>` throughout |
| **Vite**           | Build tooling with hot reload in dev                         |
| **Pinia**          | State management (setup-store style)                         |
| **music-metadata** | Audio duration extraction                                    |
| **chroma-js**      | Color math for the theme generator                           |
| **TypeScript**     | End-to-end typing                                            |
| **Vitest**         | Unit test runner (179 tests)                                 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Launches the Vite dev server + Electron with hot reload.

### Build

```bash
npm run electron:build
```

### Test

```bash
npm test
```

---

## Project Structure

```
electron/
├── main.ts              — Main process: window, IPC handlers, atom:// URL scheme, context menu
├── preload.ts           — Context bridge (exposes electronAPI to renderer)
└── ipc/
    ├── scanner.ts       — Parallel recursive audio file scanner (streaming)
    ├── metadata.ts      — library.json read/write
    └── audioInfo.ts     — Audio duration extraction via music-metadata

src/
├── App.vue              — App shell: header (logo, DevTools toggle, ThemeGenerator), nav tabs, Player
├── router.ts            — Routes: / (Library), /settings (Settings)
│
├── components/
│   ├── SearchBar.vue        — Search input, tag autocomplete dropdown, filter chips
│   ├── AudioList.vue        — Resizable column list with header and footer
│   ├── AudioRow.vue         — File row: play button, name/description, tags, duration, type
│   ├── TagChip.vue          — Color-coded tag pill (removable, clickable)
│   ├── Player.vue           — Bottom playback bar: play/pause, scrubber, loop
│   ├── ThemeGenerator.vue   — Theme panel: palette generator + manual color controls
│   ├── SpinnerOverlay.vue   — Full-area loading indicator shown during scans
│   ├── AddTagModal.vue      — Modal to add a tag to a file (with autocomplete)
│   ├── EditDescriptionModal.vue — Modal to edit a file's description
│   ├── DeleteConfirmModal.vue   — Confirmation modal before deleting a file
│   └── RenameModal.vue          — Modal to rename a file on disk
│
├── views/
│   ├── LibraryView.vue   — Main browser: toolbar, search bar, filters, scan controls, modals
│   └── SettingsView.vue  — Tag management and library folder settings
│
├── stores/
│   ├── libraryStore.ts   — Files, chip filters, playback state, metadata I/O
│   ├── tagStore.ts       — Tag definitions (name → color)
│   └── themeStore.ts     — CSS variable theme state and persistence
│
└── styles/global.css     — Dark theme CSS variables and global resets

tests/                    — Vitest unit tests (179 tests across 12 files)
```

---

## Search & Filter Reference

| Action               | How                                                                   |
| -------------------- | --------------------------------------------------------------------- |
| Filter by text       | Type `impact`, press **Enter** → description chip                     |
| Filter by tag        | Type `#metal`, press **Enter** (or select from dropdown) → tag chip   |
| Browse tags          | Type `#` to open autocomplete; arrow keys navigate, **Enter** selects |
| Click a tag in a row | Instantly adds it as a filter chip                                    |
| Remove a chip        | Click `×` on the chip                                                 |
| Clear everything     | Click **Clear all**, or press **Escape** in the search bar            |
| Multiple filters     | Add as many chips as needed — all must match (AND logic)              |

---

## Metadata

All tags, descriptions, playback history, and theme are stored in `library.json` inside Electron's `userData` directory. The file is plain JSON and can be edited by hand.

```json
{
	"version": 1,
	"files": {
		"kick_01.wav": {
			"tags": ["percussion", "impact"],
			"description": "Punchy 808 kick with short tail",
			"lastPlayed": "2026-02-21T10:30:00Z"
		}
	},
	"tags": {
		"percussion": { "color": "#ff4d4d" },
		"ambient": { "color": "#4da6ff" }
	},
	"theme": {
		"--accent": "#4da6ff",
		"--bg-primary": "#1a1a1a"
	}
}
```

> Metadata is keyed by **filename** (not full path) so the library stays portable when you move your audio folder.

---

## License

MIT
