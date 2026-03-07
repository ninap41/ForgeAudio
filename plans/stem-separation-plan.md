# Stem Separation Feature — Implementation Plan

## Context

ForgeAudio needs local instrument separation to split audio files into stems (drums, vocals, bass, other). Stems are surfaced under the **Midi tab** in their own audio list, named `${SOURCE_TRACK_NAME}_${INSTRUMENT_TYPE}` (e.g., `mysong_drums.wav`). This lays the foundation for future drum detection and MIDI conversion — stems can later be downloaded and converted to MIDI.

## Recommendation: Python + Demucs via child_process.spawn

**Why this is best for ForgeAudio:**
- **Quality**: Meta's Demucs (htdemucs) is the gold standard for music source separation. Nothing comparable exists in JS.
- **Clean integration**: Python runs as a subprocess fully isolated from Electron/Vue. Electron main already owns all filesystem/process access.
- **Future-proof**: Drum stem feeds directly into future drum-to-MIDI pipeline.
- **Dev simplicity**: No model conversion, no custom audio DSP — just `pip install demucs`.

**Packaging (v1)**: Requires Python 3.8+ with `pip install demucs`. Graceful error if unavailable. Future versions could bundle a PyInstaller binary.

## Output Directory Strategy

```
<libraryRoot>/.forgeaudio/stems/htdemucs/<filename-without-ext>/
  ├── drums.wav
  ├── vocals.wav
  ├── bass.wav
  └── other.wav
```

The scanner (`electron/ipc/scanner.ts:47`) already skips directories starting with `.` — `.forgeaudio/` is automatically excluded from indexing.

Demucs naturally outputs to `<out-dir>/<model>/<trackname>/`, so we use `<libraryRoot>/.forgeaudio/stems/` as the `-o` flag and let demucs create its standard structure.

### Stem File Naming

Stems are displayed in the Midi tab's audio list with the naming convention:
```
${SOURCE_TRACK_NAME}_${INSTRUMENT_TYPE}
```

Examples for a source file `mysong.wav`:
- `mysong_drums.wav`
- `mysong_vocals.wav`
- `mysong_bass.wav`
- `mysong_other.wav`

The on-disk filenames from demucs remain as-is (`drums.wav`, `vocals.wav`, etc.) inside their subdirectory. The display name in the Midi tab is constructed at runtime from the source filename + stem type.

## Data Model

### New `StemInfo` interface
```typescript
interface StemInfo {
  status: "processing" | "completed" | "failed" | "cancelled"
  model: string
  createdAt: string
  tracks: string[]    // ["drums", "vocals", "bass", "other"]
  outputDir: string   // absolute path to stem directory
}
```

### New `StemFile` interface (for Midi tab display)
```typescript
interface StemFile {
  sourceFileName: string   // original file name: "mysong.wav"
  sourcePath: string       // original file path
  stemType: string         // "drums", "vocals", "bass", "other"
  displayName: string      // "mysong_drums.wav"
  path: string             // full path to the stem WAV
  duration: number | null
}
```

### Extend `AudioFile`
Add optional `stems?: StemInfo` field.

### Metadata persistence
`saveMetadata()` at line 428 currently only persists files with tags/description/lastPlayed. Must also check `|| file.stems` to avoid silently erasing stem data. Same fix needed in `getProfileSnapshot()` at line 831.

### Scan merge
`rescan()` at line 366 must carry `stems` forward from `meta.files[sf.name]`.

---

## UI: Midi Tab — Stems Audio List

The **MidiView** (already created at `src/views/MidiView.vue` with route `/midi`) becomes the home for separated stems.

### MidiView Layout
- **Header section**: Title + status info
- **Stems audio list**: Displays all stems from all files that have completed separation
- **Empty state**: "No stems yet. Right-click an audio file in the Library and choose 'Separate Stems' to get started."
- **Progress indicator**: When a separation is running, show inline progress bar at top

### Stems Audio List Columns
| Column | Content |
|---|---|
| Play button | Play/pause the stem |
| Name | `${SOURCE_TRACK_NAME}_${INSTRUMENT_TYPE}` (e.g., `mysong_drums`) |
| Type | Stem type badge (drums/vocals/bass/other) |
| Source | Original file name |
| Duration | Stem duration |
| Actions | Reveal in Finder, Download/Export |

### Stem Playback
Stems play through the existing Player component via `library.playFile()` by constructing a virtual `AudioFile` object pointing to the stem WAV path. The `atom://` protocol serves any local file — no changes needed.

### Future: Download / Convert to MIDI
Each stem row will have an export/download action. In v1, this reveals the file in Finder. In future versions, a "Convert to MIDI" action will feed the stem (especially drums) into a MIDI conversion pipeline.

---

## File-by-File Change Plan

### New Files

| File | Purpose |
|---|---|
| `electron/ipc/stems.ts` | IPC module: `checkDemucsAvailable()`, `separateStems()` (spawns python, parses tqdm progress from stderr), `cancelSeparation()`, `listStemFiles()`, `getStemOutputDir()`. Process map for cancellation. |
| `tests/stems.test.ts` | ~20 unit tests: stem metadata on AudioFile, saveMetadata persistence condition, scan merge, profile snapshot/restore, separation state refs, allStemFiles computed, playStem path construction, reset |
| `tests/stemsIpc.test.ts` | ~10 unit tests: getStemOutputDir path logic, checkDemucsAvailable (mock spawn), listStemFiles, cancelSeparation, isProcessRunning |

### Modified Files

| File | Changes |
|---|---|
| `electron/main.ts` | Import stems module. Register 5 IPC handlers: `stems:checkAvailable` (handle), `stems:separate` (on — streaming progress via `event.sender.send`), `stems:cancel` (handle), `stems:list` (handle), `stems:getOutputDir` (handle). Add "Separate Stems…" to context menu after soundboard section (line ~741). |
| `electron/preload.ts` | Expose 10 stem APIs: `checkStemsAvailable`, `startStemSeparation`, `cancelStemSeparation`, `listStems`, `getStemOutputDir`, `onStemsProgress`, `onStemsComplete`, `onStemsError`, `removeStemsListeners`, `onContextMenuSeparateStems`. |
| `src/env.d.ts` | Add `StemCheckResult` interface. Extend `ElectronAPI` with all stem method types. |
| `src/stores/libraryStore.ts` | Add `StemInfo` + `StemFile` interfaces, extend `AudioFile`. Add 3 module-scope refs (`separatingFile`, `separationProgress`, `separationMessage`). Add computed `allStemFiles` (iterates `files.value`, builds `StemFile[]` for all completed stems). Add 6 methods (`startStemSeparation`, `cancelStemSeparation`, `handleStemsProgress`, `handleStemsComplete`, `handleStemsError`, `playStem`). Fix `saveMetadata()` line 428 condition. Fix `getProfileSnapshot()` line 831 condition. Fix scan merge line 366 to carry stems. Fix `applyProfileData()` line 874 to restore stems. Add to `_resetLibraryStore()`. Extend `LibraryMetadata.files` and `ProfileSnapshot.files` types. |
| `src/views/MidiView.vue` | Full rewrite from placeholder. Renders stems audio list from `library.allStemFiles`. Play button per stem. Columns: play, name (`${source}_${type}`), stem type badge, source file, duration, actions (reveal). Empty state when no stems. Progress banner when separation running. Register IPC listeners for stems progress/complete/error. |
| `src/views/LibraryView.vue` | Register `onContextMenuSeparateStems` IPC listener in `onMounted()` to trigger `library.startStemSeparation(file)`. Show error AlertBanner if demucs unavailable or separation already running. Add `removeStemsListeners()` in `onBeforeUnmount()`. |
| `CLAUDE.md` | Document stem separation feature in Feature Overview table, Project Structure, and Architecture section. Update test count. |

---

## Architecture Flow

```
User right-clicks file in Library → "Separate Stems…"
  → main sends context-menu:separateStems IPC to renderer
  → LibraryView listener calls library.startStemSeparation(file)
  → store checks demucs via stems:checkAvailable (handle)
  → store sets file.stems.status = "processing", saves metadata
  → store calls startStemSeparation IPC (send — fire-and-forget)
  → main spawns: python3 -m demucs -n htdemucs -o <stemsDir> <inputPath>
  → main parses stderr for tqdm progress (regex: /(\d+)%\|/)
  → main streams stems:progress to renderer
  → store updates separationProgress ref → MidiView reactively updates
  → on exit code 0: main sends stems:complete with tracks + outputDir
  → store sets file.stems.status = "completed", saves metadata
  → allStemFiles computed updates → Midi tab shows new stems
```

**Cancellation**: User clicks cancel on progress indicator → `cancelStemSeparation()` → `stems:cancel` IPC → main kills child process → status set to "cancelled".

**playStem()**: Constructs a virtual `AudioFile` pointing at the stem WAV path, calls existing `playFile()`. The atom:// protocol serves any local file — no changes needed.

**allStemFiles computed**: Iterates `files.value`, for each file with `stems.status === "completed"`, generates a `StemFile` entry per track:
```typescript
const allStemFiles = computed(() => {
  const result: StemFile[] = []
  for (const file of files.value) {
    if (file.stems?.status === "completed") {
      const baseName = file.name.replace(/\.[^.]+$/, "")
      for (const track of file.stems.tracks) {
        result.push({
          sourceFileName: file.name,
          sourcePath: file.path,
          stemType: track,
          displayName: `${baseName}_${track}.wav`,
          path: `${file.stems.outputDir}/${track}.wav`,
          duration: file.duration,
        })
      }
    }
  }
  return result
})
```

## Key Patterns Reused

- **Streaming IPC** (`ipcMain.on` + `event.sender.send`): matches scan flow at main.ts:225
- **Context menu item**: matches soundboard "Add to Soundboard…" pattern at main.ts:727
- **Preload bridge**: matches existing `on*` listener pattern at preload.ts:90
- **Store refs**: matches `isScanning`, `currentFile` pattern (module-scope refs)
- **Computed list**: matches `filteredFiles` computed pattern at libraryStore.ts
- **AlertBanner**: matches existing scan/import alert pattern at LibraryView.vue:43
- **`_resetLibraryStore()`**: matches existing reset pattern at libraryStore.ts:1155
- **`saveMetadata()` merge**: extends existing `lastReadMeta` pattern at libraryStore.ts:421

## Verification

1. **Tests**: `npm test` — all existing 877 tests must pass, plus ~30 new tests
2. **Dev smoke test**: `npm run dev` → right-click a file → "Separate Stems…" → verify progress in Midi tab → verify stems appear in stems list → play a stem
3. **Demucs unavailable**: Uninstall demucs → right-click → "Separate Stems…" → verify error AlertBanner with setup instructions
4. **Cancel**: Start separation → cancel → verify status updates
5. **Metadata persistence**: Separate stems → restart app → verify stems still shown in Midi tab
6. **Profile switching**: Create profile → separate stems → switch profiles → switch back → verify stems preserved
7. **Stem naming**: Verify stems display as `${source}_${type}` format in Midi tab
