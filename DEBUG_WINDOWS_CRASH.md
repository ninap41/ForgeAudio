# Windows Crash Post-Mortem — ForgeAudio

**Date**: February 28, 2026 **Severity**: Critical — app completely unusable on Windows **Resolution**: Removed `electronLanguages` from `package.json` build config

---

## Symptoms

The Windows build of ForgeAudio would immediately crash on startup, showing a gray/white screen before the renderer process died. The app never reached the UI.

Terminal output from the crash:

```
"Uncaught (in promise) RangeError: First argument to Intl.Locale constructor can't be empty or missing"
source: devtools://devtools/bundled/core/i18n/i18n.js (1)
[crash] Renderer process gone: crashed -36861
```

---

## Root Cause

Commit `26ca894` ("updated build settings", Feb 22 at 22:23) added the following to `package.json` under `build.mac`:

```json
"electronLanguages": ["en"]
```

This `electron-builder` option strips Chromium locale `.pak` files from the build output, keeping only the specified languages. However, `"en"` does not match any actual Chromium locale file — Chromium uses `en-US.pak` and `en-GB.pak`, not `en.pak`.

The result: **all 55 locale files were removed from the build**, including `en-US.pak`.

Without locale files, Chromium's internal i18n module attempts to initialize `new Intl.Locale("")` with an empty string, which throws a `RangeError`. This crashes the renderer process before any application code runs.

---

## Why It Wasn't Caught Immediately

1. **macOS was unaffected** — macOS Electron apps load locale data differently and can fall back to the system locale. The crash only manifested on Windows.
2. **The broken commit was made 1 hour after the last working build** — The working build (`af6b146`, Feb 22 at 21:34) was already distributed. The broken build wasn't tested on Windows until days later.
3. **Build size reduction looked intentional** — The installer shrank from 466MB to 141MB, which could appear to be a successful optimization rather than a sign of missing files.

---

## Investigation Timeline

### 1. Initial Red Herrings

**Audio path encoding** — Windows uses backslashes (`\`) in file paths. The custom `atom://` protocol handler wasn't normalizing these. Fixed, but this wasn't the crash cause — the app was crashing before any audio playback.

**Protocol handler errors** — The `atom://` handler had no try/catch around filesystem operations (`fsOpen`, `fh.read`). Any failure would crash the main process via unhandled promise rejection. Fixed for resilience, but not the startup crash.

**GPU acceleration** — Tried `app.disableHardwareAcceleration()` thinking the crash might be graphics-related. No effect. Removed after finding real cause.

**Locale switch** — Added `app.commandLine.appendSwitch("lang", "en-US")` to force the English locale. This tells Chromium which locale to _use_, but the `.pak` files must still exist on disk. No effect.

### 2. The Breakthrough — Binary Comparison

Compared the working installer (466MB) with the broken installer (141MB) using `7z l` to list archive contents:

```bash
# Extract the inner app archives
7z x "ForgeAudio Setup 0.1.0_workingOnWindows.exe" -o/tmp/working
7z x "ForgeAudio Setup 0.1.0_notWorkingOnWindows.exe" -o/tmp/broken

# List contents
7z l /tmp/working/\$PLUGINSDIR/app-64.7z > /tmp/working-files.txt   # 161MB
7z l /tmp/broken/\$PLUGINSDIR/app-64.7z > /tmp/broken-files.txt     # 72MB
```

**Working build**: 70 files including 55 `locales/*.pak` files **Broken build**: 15 files — zero locale files

The 89MB difference was entirely the missing locale files.

### 3. Git Bisect

```bash
git log --oneline --all | grep -i "build\|lang\|locale\|electron"
```

Found commit `26ca894` which added `"electronLanguages": ["en"]` to `package.json`. This commit was made at 22:23 on Feb 22 — exactly one hour after the last working build at 21:34.

---

## The Fix

Removed `electronLanguages` entirely from `package.json`:

```diff
  "mac": {
-   "icon": "build/icon.icns",
-   "electronLanguages": ["en"]
+   "icon": "build/icon.icns"
  },
```

Kept `app.commandLine.appendSwitch("lang", "en-US")` as a safety measure (harmless when locale files are present).

Rebuilt — installer is now 154MB with all 55 locale files included. App launches and runs correctly on Windows.

---

## Safeguards Added

1. **CLAUDE.md Architecture Rule**: "NEVER add `electronLanguages` to the build config in `package.json` — stripping Chromium locale `.pak` files causes `Intl.Locale` crashes on Windows."

2. **Crash recovery handler** added to `electron/main.ts`:

   ```ts
   mainWindow.webContents.on("render-process-gone", (_event, details) => {
   	console.error("[crash] Renderer process gone:", details.reason, details.exitCode)
   	// auto-reload
   })
   ```

   This handler is what produced the diagnostic `[crash] Renderer process gone: crashed -36861` output that confirmed the renderer was crashing on startup.

3. **Global error handlers** added:
   ```ts
   process.on("uncaughtException", (err) => { ... })
   process.on("unhandledRejection", (reason) => { ... })
   ```

---

## Lessons Learned

1. **Always test Windows builds on Windows** — macOS doesn't reproduce all Chromium-specific crashes.
2. **Suspicious build size changes deserve investigation** — a 3x reduction (466MB → 141MB) should raise immediate questions.
3. **`electronLanguages` is dangerous** — the locale code `"en"` doesn't match Chromium's `en-US.pak` filename. If you must restrict locales, use exact Chromium locale codes like `["en-US", "en-GB"]`, but it's safest to include all locales (the total overhead is ~90MB).
4. **Chromium locale files are not optional** — they're required for the `Intl` API, DevTools, and internal i18n. Without them, the renderer process crashes before any application code executes.
5. **Add crash recovery handlers early** — the `render-process-gone` listener was added as a defensive measure during audio debugging, but it ended up being the key diagnostic tool for the locale crash.
