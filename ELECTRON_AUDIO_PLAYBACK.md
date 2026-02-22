# Electron Audio Playback: Lessons & Reference

A reference guide for building local audio playback in Electron + Vue apps. Compiled from the ForgeAudio project.

---

## 1. The Core Problem: Local Files in Chromium

Electron's renderer runs in a Chromium sandbox. You can't just set `<audio src="/Users/me/song.mp3">` — the browser won't load arbitrary filesystem paths. You need a **custom protocol** to bridge the gap.

### Solution: Custom URL Scheme

Register a privileged scheme that maps local file paths to serveable responses.

```typescript
// Before app.whenReady() — must be called at module level
protocol.registerSchemesAsPrivileged([
  { scheme: "atom", privileges: { stream: true, bypassCSP: true } }
])
```

- `stream: true` — allows streaming responses (required for media)
- `bypassCSP` — lets the renderer load from this scheme without CSP violations

Then in the renderer, construct URLs like:

```
atom://localfile/Users/me/Music/kick.wav
```

Where each path segment is `encodeURIComponent()`-encoded to handle spaces and special characters.

---

## 2. Why `net.fetch("file://...")` Breaks M4A/MP4

The first instinct is to delegate to Electron's `net.fetch`:

```typescript
// DON'T DO THIS — breaks M4A seeking
protocol.handle("atom", async (request) => {
  const filePath = decodeURIComponent(request.url.replace("atom://localfile", ""))
  const res = await net.fetch("file://" + filePath)
  return new Response(res.body, { status: res.status, headers: res.headers })
})
```

**This works for MP3, WAV, AIFF, FLAC, and OGG** but **fails for M4A/MP4**.

### Why M4A is different

| Format | Metadata location | Seeking model |
|--------|-------------------|---------------|
| MP3 | ID3 tags at start | Frame-based (streamable) |
| WAV | Header at start | Linear PCM (byte offset = time) |
| AIFF | Header at start | Linear PCM (byte offset = time) |
| FLAC | Header at start | Frame-based with seek table |
| OGG | Header at start | Page-based |
| **M4A/MP4** | **moov atom at END of file** | **Index-based (requires moov)** |

MP4/M4A containers store the **moov atom** (seek index, sample tables, codec info) at the **end** of the file. Chromium's media pipeline needs to read this atom before it can seek. It does this by sending HTTP `Range` requests to jump to the end of the file.

**`net.fetch("file://...")` ignores Range headers entirely.** It always returns the full file with status 200. So:

1. Chromium sends `Range: bytes=8388608-` to read the moov atom
2. `net.fetch` returns the entire file from byte 0
3. Chromium can't parse the moov atom until the whole file arrives
4. Seeking snaps back or stalls

### The fix: Manual Range request handling

Replace `net.fetch` with direct file I/O using `fs/promises`:

```typescript
import { open as fsOpen, readFile as fsReadFile, stat } from "fs/promises"

protocol.handle("atom", async (request) => {
  const filePath = decodeURIComponent(request.url.replace("atom://localfile", ""))
  const ext = extname(filePath).toLowerCase()
  const mime = AUDIO_MIME[ext] || "application/octet-stream"

  let fileSize: number
  try {
    fileSize = (await stat(filePath)).size
  } catch {
    return new Response("Not Found", { status: 404 })
  }

  const rangeHeader = request.headers.get("range")

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
    if (match) {
      const start = parseInt(match[1], 10)
      if (start >= fileSize) {
        return new Response("Range Not Satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        })
      }
      const end = match[2]
        ? Math.min(parseInt(match[2], 10), fileSize - 1)
        : fileSize - 1
      const chunkSize = end - start + 1

      const fh = await fsOpen(filePath, "r")
      const buffer = Buffer.alloc(chunkSize)
      await fh.read(buffer, 0, chunkSize, start)
      await fh.close()

      return new Response(buffer, {
        status: 206,
        statusText: "Partial Content",
        headers: {
          "Content-Type": mime,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": String(chunkSize),
          "Accept-Ranges": "bytes",
        },
      })
    }
  }

  // No Range header — serve full file, advertise Range support
  const data = await fsReadFile(filePath)
  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
    },
  })
})
```

### Key headers that make it work

| Header | Purpose |
|--------|---------|
| `Accept-Ranges: bytes` | Tells Chromium "you can send Range requests" (on 200 response) |
| `Content-Range: bytes start-end/total` | Tells Chromium exactly which slice this is (on 206) |
| `Content-Length` | Must match the chunk size, not the full file size |
| Status `206 Partial Content` | Chromium expects this for Range responses |

### Why Buffer over streams

`Buffer` is simpler and fully compatible with Electron's `Response` constructor. Audio Range chunks are small (typically < 1MB per request), so memory is not a concern. Node 18+ has `Readable.toWeb()` if you ever need streaming for huge files, but it's unnecessary here.

---

## 3. MIME Types Matter

Chromium uses Content-Type to select the right media decoder. Map file extensions explicitly:

```typescript
const AUDIO_MIME: Record<string, string> = {
  ".wav":  "audio/wav",
  ".mp3":  "audio/mpeg",
  ".aiff": "audio/aiff",
  ".aif":  "audio/aiff",
  ".flac": "audio/flac",
  ".ogg":  "audio/ogg",
  ".m4a":  "audio/mp4",    // NOT "audio/m4a" — the MIME type is audio/mp4
}
```

**Common gotcha:** M4A's MIME type is `audio/mp4`, not `audio/m4a`.

---

## 4. Player Architecture (Vue + VueUse)

### useMediaControls composable

`@vueuse/core`'s `useMediaControls` wraps `<audio>` with reactive refs:

```typescript
const audioEl = ref<HTMLAudioElement>()
const { playing, currentTime, duration, buffered, ended, onPlaybackError } =
  useMediaControls(audioEl)
```

**Important:** Omit the `src` option from `useMediaControls`. Let the `:src` binding on `<audio>` handle the custom protocol URL directly. If you pass `src` to the composable, it injects `<source>` children that conflict with the `atom://` protocol.

### Suppressing AbortError during track switching

When the user clicks a new track while one is playing, the browser aborts the current load. This triggers an error event. Suppress it:

```typescript
onPlaybackError(() => {})
```

### Track switching flow

The naive approach of setting `src` and immediately calling `play()` fails because the browser hasn't loaded the new source yet. Use a two-phase approach:

```
watch(audioSrc) → pause + set awaitingPlayback flag
watch(duration) → when duration > 0, resume playback
```

```typescript
let awaitingPlayback = false

watch(audioSrc, () => {
  awaitingPlayback = library.isPlaying
  playing.value = false  // pause while loading
})

watch(duration, (d) => {
  if (d > 0 && awaitingPlayback) {
    awaitingPlayback = false
    playing.value = true
  }
})
```

### Bidirectional playing sync

The store owns the "is playing" state, but the `<audio>` element can also pause organically (end of track, browser policy, etc.). Sync both directions with the `awaitingPlayback` guard to prevent loops:

```typescript
// Store → composable
watch(() => store.isPlaying, (wantPlay) => {
  if (wantPlay) {
    if (awaitingPlayback) return
    if (duration.value > 0) playing.value = true
    else awaitingPlayback = true
  } else {
    awaitingPlayback = false
    playing.value = false
  }
})

// Composable → store
watch(playing, (val) => {
  if (awaitingPlayback) return
  if (store.isPlaying !== val) store.isPlaying = val
})
```

---

## 5. Scrubber Implementation

HTML `<input type="range">` scrubbers in media players have a subtle problem: while the user drags the thumb, the browser's `timeupdate` events keep firing and snapping the scrubber back to the real playback position.

### Solution: Display isolation

```typescript
const isScrubbing = ref(false)
const scrubDisplayTime = ref(0)

const displayCurrentTime = computed(() =>
  isScrubbing.value ? scrubDisplayTime.value : currentTime.value
)
```

Bind the scrubber's `:value` to `displayCurrentTime`, not `currentTime`.

### Event handlers

| Event | Action |
|-------|--------|
| `@pointerdown` | Set `isScrubbing = true`, pause playback, save `wasPlayingBeforeScrub` |
| `@input` | If scrubbing: update `scrubDisplayTime`. If not (click-to-seek): seek directly |
| `@pointerup` / `@pointercancel` / `@pointerleave` | Clamp value, seek via `currentTime.value = clamped`, resume if was playing |
| `@change` | Keyboard arrow keys (only when not pointer-scrubbing) |

### Visual progress

Use CSS custom properties for the played/buffered/unplayed segments:

```css
.scrubber {
  background: linear-gradient(
    to right,
    var(--accent) 0%,
    var(--accent) var(--scrubber-pct, 0%),
    color-mix(in srgb, var(--accent) 30%, var(--border)) var(--scrubber-pct, 0%),
    color-mix(in srgb, var(--accent) 30%, var(--border)) var(--buffered-pct, 0%),
    var(--border) var(--buffered-pct, 0%),
    var(--border) 100%
  );
}
```

Set the custom properties from computed values:

```typescript
:style="{ '--scrubber-pct': pct + '%', '--buffered-pct': buffPct + '%' }"
```

---

## 6. URL Construction

Encode each path segment individually (not the whole path), and handle special characters that `encodeURIComponent` misses:

```typescript
const audioSrc = computed(() => {
  if (!file) return ""
  return "atom://localfile" + file.path
    .split("/")
    .map(s => encodeURIComponent(s)
      .replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase()))
    .join("/")
})
```

Characters like `!`, `'`, `(`, `)`, `*` are not encoded by `encodeURIComponent` but can cause issues in URLs.

---

## 7. Debugging Audio Issues in Electron

### DevTools Network tab

Open DevTools and watch the Network tab while playing audio. You should see:

- Initial request → `200 OK` with `Accept-Ranges: bytes`
- Subsequent seeks → `206 Partial Content` with `Content-Range` headers

If you only see `200` responses, Range handling is broken.

### Common symptoms and causes

| Symptom | Likely cause |
|---------|-------------|
| M4A won't seek, snaps back | No Range support in protocol handler |
| M4A plays but shows wrong duration | moov atom not parsed (same Range issue) |
| Audio loads but won't play | Wrong MIME type |
| AbortError in console on track switch | Normal — suppress with `onPlaybackError(() => {})` |
| Scrubber snaps back during drag | `displayCurrentTime` not isolated from `currentTime` |
| Track switch doesn't auto-play | Missing `awaitingPlayback` → `watch(duration)` resume logic |
| Double-play or play/pause oscillation | Missing `awaitingPlayback` guard in bidirectional sync |

---

## 8. Checklist for New Electron Audio Projects

- [ ] Register custom protocol scheme with `stream: true` at module level (before `app.whenReady()`)
- [ ] Implement protocol handler with manual Range request support (not `net.fetch`)
- [ ] Map file extensions to correct MIME types (M4A = `audio/mp4`)
- [ ] Return `Accept-Ranges: bytes` on all 200 responses
- [ ] Return `206 Partial Content` with `Content-Range` for Range requests
- [ ] Handle `416 Range Not Satisfiable` for out-of-bounds requests
- [ ] Encode URL path segments individually
- [ ] Use `useMediaControls` without the `src` option for custom protocols
- [ ] Suppress `AbortError` during track switching
- [ ] Implement `awaitingPlayback` guard for track switch timing
- [ ] Isolate scrubber display from live `currentTime` during drag
- [ ] Test with M4A files specifically (not just MP3) — they exercise Range handling
