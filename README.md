# ForgeAudio

<p align="center">
  <img src="public/ForgeAudioHome.png" width="900" alt="ForgeAudio Screenshot" />
</p>

<p align="center">
  <strong>⚡ A fast, local-first audio file browser built for serious sound libraries.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-Desktop-blue" />
  <img src="https://img.shields.io/badge/Vue-3-brightgreen" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue" />
  <img src="https://img.shields.io/badge/Tests-179-success" />
  <img src="https://img.shields.io/badge/License-MIT-lightgrey" />
</p>

---

## 🎧 Why ForgeAudio?

Most file browsers are optimized for documents — not creative assets.

ForgeAudio is built specifically for large audio libraries:

- ⚡ Instant, composable filtering
- 🧠 Keyboard-first navigation
- 🗂 Portable metadata (no database lock-in)
- 🚫 No cloud. No telemetry. No bloat.
- 🎨 Customizable dark theme engine

Designed for sound designers, musicians, and developers who need speed and control.

---

## 🎥 Demo

<p align="center">
  <img src="public/ForgeAudioHome.png" width="900" />
</p>

---

# ✨ Features

---

## 📂 File Browser

- **Parallel recursive scanning** — breadth-parallel directory traversal with batched `stat()` calls
- **Streaming results** — file list populates incrementally (no blocking UI)
- **Resizable column list view** — Filename (+ description), Tags, Duration, Type
- **Live file count** — shows X of Y matching files
- **Scan overlay** — visual feedback during rescans
- **Rescan button** — refresh without changing root folder

---

## 🔎 Search & Filtering

- **Tag autocomplete** — type `#` to open live tag dropdown with color swatches
- **Filter chips** — press Enter to commit persistent filters
  - `#metal` → tag filter
  - `impact` → description/name substring filter

- **AND-based logic** — all chips must match
- **Multi-select format filter** — checkbox dropdown for `.wav`, `.mp3`, `.aiff`, `.flac`, `.ogg`, `.m4a`
- **Tagged / Untagged toggle**
- **Keyboard navigation** — arrow keys + Enter support

---

## ▶ Audio Playback

- Click any row to instantly load and play
- Per-row play/pause buttons
- Global **spacebar toggle**
- Precise drag-to-seek scrubber
- Loop toggle
- Current time / total duration display

Single active audio element. No redundant reloads.

---

## 🏷 Tags & Metadata

- Color-coded tag pills
- Click tag to instantly filter by it
- Remove tag via inline `×`
- Right-click context menu:
  - Play
  - Add Tag
  - Edit Description
  - Rename (on disk)
  - Delete (with confirmation)
  - Reveal in Finder
  - Copy Path

Metadata stored in portable JSON format — no database required.

---

## 🎨 Theme Engine

- Live theme generator (Accent, Background, Text, Danger, Success)
- Single-color palette derivation via `chroma-js`
- Real-time preview
- Persisted CSS variable system
- Reset to default dark theme

---

## ⚙ Settings

- Change root library folder
- Manage tag library with color pickers
- Add/delete tags
- Centralized metadata persistence

---

# 🚀 Performance Characteristics

- Parallel file system traversal
- Incremental streaming population
- O(n) filtering
- No UI thread blocking
- Handles large nested directory trees smoothly

---

# 🧠 Architecture

```
Main Process (Electron)
│
├── Scanner (parallel FS traversal)
├── Metadata (library.json I/O)
└── Audio Info (music-metadata)
│
Renderer (Vue 3)
│
├── Pinia Stores
│   ├── libraryStore
│   ├── tagStore
│   └── themeStore
│
├── Filter System (pure computed logic)
├── Playback Engine
└── Theme Engine
```

**Principles:**

- Local-first
- No network calls
- IPC boundary separation
- Business logic in stores
- Pure computed filtering
- Type-safe end-to-end

---

# 🧩 Tech Stack

|                    |                                        |
| ------------------ | -------------------------------------- |
| **Electron**       | Desktop shell, IPC, file system access |
| **Vue 3**          | Composition API + `<script setup>`     |
| **Vite**           | Fast dev server + build tooling        |
| **Pinia**          | Setup-store state management           |
| **music-metadata** | Audio duration extraction              |
| **chroma-js**      | Color math for theme generation        |
| **TypeScript**     | Strict typing throughout               |
| **Vitest**         | 179 unit tests across 12 files         |

---

# 🧪 Reliability

ForgeAudio includes:

- 179 unit tests
- Store-level logic testing
- Filtering edge-case validation
- Metadata persistence coverage
- IPC boundary mocking

Performance-critical logic is protected by tests.

---

# 🛠 Getting Started

## Prerequisites

- Node.js 18+
- npm 9+

---

## Install

```bash
npm install
```

---

## Development

```bash
npm run dev
```

Launches Vite + Electron with hot reload.

---

## Build

```bash
npm run electron:build
```

---

## Test

```bash
npm test
```

---

# 📁 Project Structure

```
electron/
├── main.ts
├── preload.ts
└── ipc/
    ├── scanner.ts
    ├── metadata.ts
    └── audioInfo.ts

src/
├── App.vue
├── router.ts
├── components/
├── views/
├── stores/
└── styles/

tests/
```

---

# 📦 Metadata Design

All tags, descriptions, playback history, and theme settings are stored in:

`library.json` inside Electron’s `userData` directory.

```json
{
	"version": 1,
	"files": {
		"kick_01.wav": {
			"tags": ["percussion", "impact"],
			"description": "Punchy 808 kick",
			"lastPlayed": "2026-02-21T10:30:00Z"
		}
	},
	"tags": {
		"percussion": { "color": "#ff4d4d" }
	},
	"theme": {
		"--accent": "#4da6ff"
	}
}
```

Metadata is keyed by **filename**, not full path — ensuring portability when moving your audio folder.

---

# 🗺 Roadmap (Optional Future Ideas)

- Waveform preview rendering
- Saved filter presets
- Bulk tag editing
- Virtualized list for extremely large libraries
- Indexed search engine

---

# 📜 License

MIT
