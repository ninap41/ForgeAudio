# WAVESURFER.md — Waveform Implementation Guide

Reference for the wavesurfer.js integration in ForgeAudio, and a guide for future DAW-related features.

---

## Library

- **Package**: `wavesurfer.js` v7.12+
- **Docs**: https://wavesurfer.xyz
- **GitHub**: https://github.com/katspaugh/wavesurfer.js
- **No Vue wrapper** — vanilla JS API instantiated directly inside Vue components. A wrapper adds complexity without benefit for our use case.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Renderer (Vue)                                              │
│                                                             │
│  AddToSoundboardModal / EditSoundboardItemModal             │
│    ├── WaveformTimeline.vue                                 │
│    │     ├── WaveSurfer instance (peaks + duration only)    │
│    │     └── RegionsPlugin (offset marker OR range region)  │
│    └── Preview button → library.playFile(file, options)     │
│                                                             │
│  IPC call: getWaveformPeaks(filePath, 800)                  │
├─────────────────────────────────────────────────────────────┤
│ Main Process (Node.js)                                      │
│                                                             │
│  audio:getWaveformPeaks handler                             │
│    ├── WAV files → generateWavPeaks() (actual PCM parsing)  │
│    └── Other formats → generateBytePeaks() (byte approx.)  │
└─────────────────────────────────────────────────────────────┘
```

### Why peaks are computed in the main process

`AudioContext.decodeAudioData()` — the standard browser API for decoding audio — can crash the Electron renderer process on large or certain encoded files. This is a hard crash (not a catchable JS error), which blanks the entire app. By computing peaks in the Node.js main process, we avoid `decodeAudioData()` entirely. If the main process encounters a corrupt file, it returns an error through IPC without affecting the UI.

### Why we don't use `loadBlob()` / `load(url)`

wavesurfer.js's `loadBlob()` and `load(url)` both internally call `AudioContext.decodeAudioData()` to generate waveform peaks. This triggers the same renderer crash. Instead, we pre-compute peaks and pass them via the `peaks` + `duration` constructor options, which tells wavesurfer to render directly without decoding.

---

## Peak Generation (`electron/main.ts`)

### IPC Handler

```
Channel: "audio:getWaveformPeaks"
Args:    (filePath: string, targetWidth: number)
Returns: number[]   — array of peak amplitudes, 0.0–1.0
```

### WAV Files — `generateWavPeaks()`

Parses the RIFF/WAVE container properly by iterating chunks:

1. Finds the `fmt ` chunk → reads `numChannels` and `bitsPerSample`
2. Finds the `data` chunk → locates raw PCM byte range
3. Divides total samples into `targetWidth` bins
4. For each bin, reads left-channel PCM samples and takes the peak absolute value

Supported bit depths: **16-bit** (Int16LE / 32768), **24-bit** (Int24LE / 8388608), **32-bit** (Int32LE / 2147483648).

Returns `null` on parse failure, triggering fallback to byte-level peaks.

### Compressed Formats — `generateBytePeaks()`

For MP3, FLAC, OGG, M4A, AIFF: reads raw file bytes and computes approximate peaks by treating each byte as a signed value `(byte - 128) / 128`. This doesn't produce an accurate waveform (compressed audio bytes don't directly correspond to PCM amplitude), but provides a reasonable visual shape for selecting offset/range points.

### Adding accurate peaks for compressed formats (future)

To get real waveform peaks for MP3/FLAC/etc., options:
- **Recommended**: Use `ffmpeg` in the main process to decode to raw PCM, then compute peaks from that. The `fluent-ffmpeg` package or direct `child_process.spawn('ffmpeg', ['-i', filePath, '-f', 's16le', '-ac', '1', '-ar', '8000', '-'])` would work.
- **Alternative**: Use the `node-web-audio-api` npm package (native AudioContext for Node.js).
- **Alternative**: Use `audiowaveform` CLI (https://github.com/bbc/audiowaveform) — generates JSON peak data.

---

## WaveformTimeline Component

### Location

`src/components/WaveformTimeline.vue`

### Props

| Prop | Type | Description |
|---|---|---|
| `filePath` | `string` | Absolute path to the audio file. Component loads its own peaks via IPC. |
| `duration` | `number` | Known duration in seconds (from library metadata or `getAudioDuration` IPC). |
| `mode` | `'offset' \| 'range'` | Determines which type of region is shown. Only one mode active at a time. |
| `offset` | `number \| undefined` | Current offset position in seconds (offset mode). |
| `rangeStart` | `number \| undefined` | Range start in seconds (range mode). |
| `rangeEnd` | `number \| undefined` | Range end in seconds (range mode). |

### Emits

| Event | Payload | When |
|---|---|---|
| `update:offset` | `number` | User clicks waveform or drags offset marker (offset mode). |
| `update:rangeStart` | `number` | User drags range start handle or creates new range (range mode). |
| `update:rangeEnd` | `number` | User drags range end handle or creates new range (range mode). |

All emitted values are clamped to `[0, duration]` and rounded to 0.1s precision.

### Lifecycle

**`onMounted`**:
1. Calls `getWaveformPeaks(filePath, 800)` IPC to get pre-computed peaks from the main process
2. Guards against unmount during the async wait
3. Creates `WaveSurfer` instance with pre-computed `peaks` and `duration` (no audio decoding)
4. Registers `RegionsPlugin`
5. Binds event handlers: `region-updated`, `region-created`, `click`
6. Calls `setupRegions()` to create the initial offset marker or range region
7. Clears loading state

**`onUnmounted`**:
1. Clears theme-polling interval
2. Disables drag selection if active
3. Calls `ws.destroy()` — cleans up all DOM elements, event listeners, canvas

### WaveSurfer Configuration

```ts
WaveSurfer.create({
  container: containerRef,
  height: 98,                    // waveform area within 120px container
  waveColor: '--text-muted',     // theme-reactive
  progressColor: '--accent',     // theme-reactive
  cursorColor: 'transparent',    // hidden — we use regions instead
  barWidth: 2,                   // thin bars
  barGap: 1,                     // minimal gap
  barRadius: 1,                  // slight rounding
  normalize: true,               // scales peaks to fill height
  interact: true,                // enables click events for offset mode
  hideScrollbar: true,           // clean appearance
  peaks: [peaks],                // pre-computed — NO audio decoding
  duration: props.duration,      // from metadata
})
```

**Key decisions**:
- `interact: true` — required for the `click` event to fire (used to position offset marker)
- `cursorColor: 'transparent'` — hides wavesurfer's built-in playback cursor; we only use regions for visual indicators
- No `minPxPerSec` — lets `fillParent: true` (default) scale the waveform to fit the container. Setting `minPxPerSec` on long files creates a waveform wider than the container, causing sparse bars.
- No `url` or `media` — wavesurfer renders purely from the provided peaks array; no internal audio element needed

### Region System

Only **one region** is active at any time. Mode switching calls `regions.clearRegions()` before creating the new region type.

#### Offset Mode

A single **marker** (region with `start === end`):
```ts
regions.addRegion({
  id: 'offset-marker',
  start: offsetTime,
  end: offsetTime,        // start === end makes it a point marker
  color: accent,
  drag: true,             // user can drag to reposition
  resize: false,          // no resize handles
})
```

- Click on waveform → moves marker to clicked time, emits `update:offset`
- Drag marker → emits `update:offset` on release
- Any drag-created region (from accidental drag) is immediately removed via `handleRegionCreated`

#### Range Mode

A single **region** with start and end handles:
```ts
regions.addRegion({
  id: 'range-region',
  start: rangeStart,
  end: rangeEnd,
  color: accentAt25Opacity,   // semi-transparent accent fill
  drag: true,                 // user can drag entire region
  resize: true,               // start/end handles for resizing
})
```

- Drag handles → emits `update:rangeStart` / `update:rangeEnd`
- `enableDragSelection()` allows click-drag on empty space to create a new range
- When a new drag-selection region is created, all existing regions are removed first (enforced in `handleRegionCreated`)
- Drag selection is disabled when switching away from range mode

### Single-Region Enforcement

The component enforces exactly one region at all times:

| Scenario | Behavior |
|---|---|
| Mode switch (offset ↔ range) | `setupRegions()` clears all regions, disables drag selection, creates new region |
| Offset mode: accidental drag creates region | `handleRegionCreated` removes it immediately (`region.id !== "offset-marker"`) |
| Range mode: user drag-creates new range | `handleRegionCreated` removes all other regions, emits new range values |
| Range mode: drag existing region | `handleRegionUpdated` emits new start/end values |
| Prop change from parent | `updatingFromProps` guard prevents feedback loops |

### Bidirectional Sync & Feedback Loop Prevention

The `updatingFromProps` flag prevents infinite emit cycles:

```
Parent changes offset prop → watch fires → marker.setOptions() (updatingFromProps=true)
  → wavesurfer fires region-updated → handleRegionUpdated sees guard → skips emit
```

Without this guard: prop change → region update → emit → parent updates prop → repeat.

The threshold check (`Math.abs(marker.start - target) > 0.05`) prevents unnecessary updates when the difference is sub-visual (< 50ms).

### Theme Reactivity

A `setInterval` (2s) polls CSS custom properties and calls `ws.setOptions({ waveColor, progressColor })`. This picks up changes from the ThemeGenerator. The interval is cleared on unmount.

**Future improvement**: Replace the polling interval with a `watch` on `themeStore` for instant updates.

### Styling

Region handles are styled via scoped `:deep()` selectors targeting wavesurfer's internal DOM:

```css
/* Range region: accent borders on both sides */
:deep(.wavesurfer-region) {
  border-left: 2px solid var(--accent);
  border-right: 2px solid var(--accent);
}

/* Offset marker: single 2px line */
:deep(.wavesurfer-region[data-id="offset-marker"]) {
  border-left: 2px solid var(--accent);
  border-right: none;
  width: 2px;
}

/* Resize handles: 6px wide accent strips */
:deep(.wavesurfer-region > div[data-resize]) {
  width: 6px;
  background: var(--accent);
  opacity: 0.8;
}
```

The container always stays in the DOM (not `v-if`'d away) so wavesurfer has valid dimensions. Loading/error states use absolute-positioned overlays on top.

---

## Modal Integration

### AddToSoundboardModal.vue

- Mounts `WaveformTimeline` when `v-if="partial"` is true (user checks "Partial playback")
- Passes `filePath` and `fileDuration` — the timeline self-loads its peaks
- Number inputs below the timeline are bidirectionally synced with the timeline via `v-model` + emit events
- Preview button calls `library.playFile(file, { offset })` or `library.playFile(file, { range })`

### EditSoundboardItemModal.vue

- Same integration pattern
- Pre-fills offset/range from existing soundboard item data in `onMounted`
- `itemFilePath` resolved from the soundboard item, passed to timeline

### Usage Pattern

```html
<WaveformTimeline
  :file-path="filePath"
  :duration="fileDuration"
  :mode="partialMode"
  :offset="offset"
  :range-start="rangeStart"
  :range-end="rangeEnd"
  @update:offset="offset = $event"
  @update:range-start="rangeStart = $event"
  @update:range-end="rangeEnd = $event"
/>
```

No external loading orchestration needed. The component handles everything internally.

---

## Testing (`tests/waveformTimeline.test.ts`)

### Mock Strategy

wavesurfer.js and the Regions plugin are fully mocked at the module level:

```ts
vi.mock('wavesurfer.js', () => ({
  default: { create: vi.fn(() => mockWaveSurfer) },
}))

vi.mock('wavesurfer.js/dist/plugins/regions.esm.js', () => ({
  default: { create: vi.fn(() => mockRegionsPlugin) },
}))
```

Key mock behaviors:
- `mockRegionsPlugin.addRegion()` creates mock region objects and fires `region-created` handlers
- Mock regions track `start`, `end`, and record `setOptions()` / `remove()` calls
- `mockGetWaveformPeaks` simulates the IPC returning 800 peaks
- Event handlers are captured in `regionEventHandlers` / `wsEventHandlers` maps and can be invoked directly in tests

### Test Categories (31 tests)

| Category | Count | What's tested |
|---|---|---|
| Component rendering | 8 | Container class, loading state, error state, wavesurfer creation/destruction, IPC calls, no decoding |
| Offset mode | 5 | Marker creation, drag emit, prop sync, clamping, click-to-set |
| Range mode | 4 | Region creation, resize emit, prop sync, drag selection |
| Mode switching | 3 | Clear on switch, correct region type, bidirectional |
| Edge cases | 8 | Zero duration, empty path, loading transitions, error messages, defaults, feedback loop guard, drag selection scope |

---

## wavesurfer.js API Quick Reference

### Core (`WaveSurfer`)

| Method | Description |
|---|---|
| `WaveSurfer.create(options)` | Create instance. Must have `container`. |
| `ws.loadBlob(blob, peaks?, duration?)` | Load from Blob. **Avoid** — calls `decodeAudioData()`. |
| `ws.load(url, peaks?, duration?)` | Load from URL. **Avoid** — calls `decodeAudioData()`. |
| `ws.destroy()` | Clean up everything (DOM, listeners, audio). Always call on unmount. |
| `ws.getDuration()` | Returns duration in seconds. |
| `ws.getCurrentTime()` | Returns current playback time. |
| `ws.setOptions(opts)` | Update visual options (colors, dimensions). |
| `ws.zoom(minPxPerSec)` | Change zoom level. |
| `ws.registerPlugin(plugin)` | Register a plugin instance. |

**Events**: `click`, `ready`, `play`, `pause`, `finish`, `timeupdate`, `scroll`, `zoom`, `decode`, `load`, `loading`, `destroy`

### Regions Plugin

| Method | Description |
|---|---|
| `RegionsPlugin.create()` | Create plugin instance (pass to `ws.registerPlugin`). |
| `regions.addRegion(params)` | Add a region. Returns the `Region` object. |
| `regions.clearRegions()` | Remove all regions. |
| `regions.getRegions()` | Get all current regions as array. |
| `regions.enableDragSelection(opts)` | Enable click-drag to create regions. Returns disable function. |

**Region params**: `{ id?, start, end?, color?, drag?, resize?, resizeStart?, resizeEnd?, content?, minLength?, maxLength? }`

**Plugin events**: `region-created`, `region-updated`, `region-removed`, `region-clicked`, `region-double-clicked`, `region-in`, `region-out`

**Region methods**: `region.setOptions(opts)`, `region.remove()`, `region.play()`, `region.setContent()`

---

## Future DAW Features — Implementation Notes

### Playback Cursor on Waveform

To show a moving playback cursor synced with the Player:

1. Use wavesurfer's built-in cursor by setting `cursorColor` to a visible color
2. Drive `ws.setTime(currentTime)` from a `watch` on `library.currentTime` — this moves the cursor without triggering audio playback (since no audio is loaded in wavesurfer)
3. Alternatively, create a dedicated region `id: "playback-cursor"` with `start === end` and update its position on each animation frame

### Zoom & Scroll

wavesurfer.js has built-in zoom/scroll:

```ts
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.esm.js'

ws.registerPlugin(ZoomPlugin.create({ scale: 0.5 }))
ws.zoom(200) // 200 pixels per second
```

Remove `hideScrollbar: true` to show the horizontal scrollbar. Use `autoScroll: true` + `autoCenter: true` to follow the playback cursor.

### Timeline Ruler

```ts
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'

ws.registerPlugin(TimelinePlugin.create({
  container: timelineContainerRef,
  timeInterval: 1,
  primaryLabelInterval: 5,
}))
```

Renders time labels below the waveform. Needs a separate container element.

### Minimap

```ts
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap.esm.js'

ws.registerPlugin(MinimapPlugin.create({
  height: 20,
  waveColor: '#ddd',
  progressColor: '#999',
}))
```

A small overview waveform showing the visible portion of a zoomed-in view.

### Multiple Regions / Markers

The current implementation enforces one region at a time. For DAW features (cue points, loop regions, beat markers), allow multiple regions with distinct IDs:

```ts
regions.addRegion({ id: 'cue-1', start: 5, end: 5, color: 'yellow', drag: true })
regions.addRegion({ id: 'loop-a', start: 10, end: 20, color: 'rgba(0,255,0,0.2)', drag: true, resize: true })
regions.addRegion({ id: 'loop-b', start: 30, end: 40, color: 'rgba(255,0,0,0.2)', drag: true, resize: true })
```

Use `region-clicked` event to select/activate a specific region for editing.

### Spectral Display

```ts
import SpectrogramPlugin from 'wavesurfer.js/dist/plugins/spectrogram.esm.js'

ws.registerPlugin(SpectrogramPlugin.create({
  labels: true,
  height: 256,
  splitChannels: false,
}))
```

Renders a spectrogram view alongside the waveform. Requires decoded audio data (full Float32Array channels), so would need the ffmpeg-based peak generation approach to also return raw PCM data.

### Loading Audio Into wavesurfer (for playback features)

If future features require wavesurfer to handle playback directly (e.g., independent preview playback without the main Player), use the `atom://` protocol:

```ts
ws = WaveSurfer.create({
  container: containerRef,
  peaks: [peaks],          // pre-computed for immediate render
  duration: duration,      // known duration
})
// Load audio for playback only (peaks already rendered)
ws.load(`atom://localfile/${encodeURIComponent(filePath)}`, [peaks], duration)
```

Passing pre-computed peaks with the URL tells wavesurfer to skip decoding and use the provided peaks for rendering, while still setting up the audio element for playback. The `atom://` protocol handles Range requests for seeking.

**Caution**: Test thoroughly — the `atom://` protocol + wavesurfer's internal audio element may have edge cases with seeking, looping, or format support. The main Player already handles these robustly.

### Waveform Caching

Currently, peaks are recomputed each time a modal opens. For a DAW-like experience:

1. Cache peaks in `library.json` under each file's metadata:
   ```json
   { "kick_01.wav": { "tags": [...], "peaks": [0.1, 0.5, 0.8, ...] } }
   ```
2. On first load, compute + cache. On subsequent loads, return cached peaks.
3. Invalidate cache if file modification time changes.

### Multi-Channel Waveforms

wavesurfer supports split-channel rendering:

```ts
WaveSurfer.create({
  splitChannels: [
    { waveColor: '#4da6ff' },  // Channel 1 (Left)
    { waveColor: '#ff4da6' },  // Channel 2 (Right)
  ],
  peaks: [leftChannelPeaks, rightChannelPeaks],
  duration: duration,
})
```

The `generateWavPeaks` function in `electron/main.ts` currently reads only the left channel. To support multi-channel, modify it to return an array of arrays (one per channel).

---

## File Reference

| File | Role |
|---|---|
| `src/components/WaveformTimeline.vue` | Waveform display + region interaction |
| `src/components/AddToSoundboardModal.vue` | Uses WaveformTimeline for partial playback setup |
| `src/components/EditSoundboardItemModal.vue` | Uses WaveformTimeline for editing existing partial settings |
| `electron/main.ts` | `audio:getWaveformPeaks` IPC + `generateWavPeaks()` + `generateBytePeaks()` |
| `electron/preload.ts` | Exposes `getWaveformPeaks` via contextBridge |
| `src/env.d.ts` | TypeScript type for `getWaveformPeaks` on `ElectronAPI` |
| `tests/waveformTimeline.test.ts` | 31 tests with mocked wavesurfer.js |
