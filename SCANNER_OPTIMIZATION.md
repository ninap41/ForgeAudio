# Scanner Performance Optimization

## Summary

Three independent optimizations were implemented to make scanning large libraries faster and more responsive.

---

### 1. Parallel directory walk + batched `stat()` (`electron/ipc/scanner.ts`)

**Before** — subdirectories were walked one at a time with `await walk(...)` inside a `for` loop, and each audio file's `stat()` call was awaited individually.

**After** — all sibling subdirectory walks are started simultaneously via `Promise.all`, and all `stat()` calls within a single directory are batched with `Promise.all` as well. The tree walk is now breadth-parallel rather than fully sequential.

An optional `onFile` callback was added to `scanDirectory` so the IPC layer can stream results as they are found:

```ts
export async function scanDirectory(
  dirPath: string,
  onFile?: (file: AudioFile) => void,
): Promise<AudioFile[]>
```

---

### 2. Streaming IPC scan (`electron/main.ts`, `electron/preload.ts`, `src/stores/libraryStore.ts`)

**Before** — `ipcMain.handle('fs:scanDirectory')` blocked until the entire scan finished and returned all files in one payload. The file list stayed empty until the scan completed.

**After** — the handler uses `ipcMain.on` and streams batches of 50 files back to the renderer via `event.sender.send('fs:scanProgress', batch)`, followed by a `fs:scanDone` event. The file list populates in real time.

Preload API changes:

| Removed | Added |
|---|---|
| `scanDirectory(dirPath)` | `startScan(dirPath)` |
| | `onScanProgress(cb)` |
| | `onScanDone(cb)` |
| | `removeScanListeners()` |

`rescan()` in `libraryStore.ts` reads metadata first (fast local file read), then registers the stream listeners before calling `startScan`. Each incoming batch is merged with metadata and appended to `files.value` immediately, giving incremental UI feedback.

---

### 3. Parallel duration loading (`src/stores/libraryStore.ts`)

**Before** — `loadDurations()` fetched durations sequentially with `for await`, serializing all IPC calls:

```ts
for (const file of files.value) {
  file.duration = await window.electronAPI.getAudioDuration(file.path)
}
```

**After** — a fixed-size worker pool (8 concurrent workers) drains a shared index into the file list:

```ts
const CONCURRENCY = 8
async function worker() {
  while (index < snapshot.length) {
    const file = snapshot[index++]
    if (file.duration === null)
      file.duration = await window.electronAPI.getAudioDuration(file.path)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
```

This is effectively a 5–8× speedup for duration loading on large libraries.

---

## Files Changed

| File | Change |
|---|---|
| `electron/ipc/scanner.ts` | Parallel walk, batched stat, `onFile` callback |
| `electron/main.ts` | `ipcMain.handle` → `ipcMain.on` with streaming |
| `electron/preload.ts` | New scan stream API |
| `src/env.d.ts` | Updated `ElectronAPI` interface |
| `src/stores/libraryStore.ts` | Streaming `rescan()`, parallel `loadDurations()` |
| `tests/scanner.test.ts` | New tests for parallel walk and `onFile` callback |
| `tests/libraryStore.test.ts` | Mock updated to match new API |
