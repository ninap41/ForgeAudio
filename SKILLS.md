# ForgeAudio – Project Skills & Architecture Guide

This document defines architectural rules, patterns, and conventions for working in this repository.  
When making changes, follow these constraints strictly.

---

## High-Level Architecture

- Desktop app built with **Electron + Vue 3 + Vite**
- Fully local-first (no network requests)
- Main/renderer separation enforced
- Secure IPC via preload contextBridge
- State managed with composable singletons (module-scope refs + `reactive()` return)
- TypeScript everywhere

---

## Core Principles

1. Never block the UI thread during file scans.
2. All file system access happens in the Electron main process.
3. Renderer communicates via IPC only.
4. Keep business logic in stores (composable singletons), not components.
5. Components are UI-only whenever possible.
6. Filtering is pure and derived (computed), not imperative.
7. Avoid unnecessary watchers.
8. Do not introduce global mutable state outside stores.

---

## File Scanning

- Implemented in `electron/ipc/scanner.ts`
- Parallel breadth-style directory traversal
- Batched `fs.stat()` calls
- Results streamed incrementally to renderer
- Never refactor to synchronous recursion

If modifying scanning:

- Preserve streaming behavior
- Preserve performance characteristics
- Do not load all files into memory before emitting

---

## Metadata

- Stored in `library.json` in Electron userData directory
- Schema:

```ts
{
  version: number
  files: {
    [filename: string]: {
      tags: string[]
      description: string
      lastPlayed?: string
    }
  }
  tags: {
    [tagName: string]: { color: string }
  }
  theme: Record<string, string>
}
```
