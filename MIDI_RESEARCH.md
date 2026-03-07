# Feature Build: Local Instrument Separation for ForgeAudio

You are working inside **ForgeAudio**, a local-first **Electron + Vue 3 + Vite** audio library manager.

Working directory: `/Users/ninapalumbo/Desktop/FuckTheFinder`  
**Do not rename this directory.**

Read and obey `CLAUDE.md` in this repository. Its architecture and rules take priority.

---

## Goal

Implement a new feature that allows the user to:

1. Select an audio file from the library
2. Run **local instrument separation** on that file
3. Generate separated stems such as:
   - drums
   - vocals
   - bass
   - other
4. Surface those stems back in the app in a way that fits the current ForgeAudio architecture
5. Preserve responsiveness for large libraries and long files
6. Keep all processing local and offline

This feature is the foundation for future work like:

- drum detection
- drum-to-MIDI conversion
- stem preview/editing
- soundboard use of isolated stems

---

## Important Context

This app already exists and has a mature architecture.

You must work **with** the existing design, not around it.

Key architectural constraints from `CLAUDE.md`:

- **Electron main handles all filesystem access**
- Renderer communicates through IPC only
- App must handle **thousands of files**
- No blocking UI operations
- Vue 3 Composition API only
- TypeScript throughout
- No external UI component libraries
- Existing scan flow is streaming and intentional
- Metadata is stored in `library.json`
- Do not introduce unnecessary watchers
- Do not regress current behavior
- Preserve testability and existing store patterns

---

## Feature Scope

Build the first practical version of **instrument separation**.

Start with **offline separation of a single selected audio file**.

Do **not** attempt:

- real-time separation
- cloud APIs
- multi-file batch separation in v1
- full audio-to-MIDI in this task

A clean v1 is better than a broad unstable implementation.

---

## Technical Requirement: Evaluate Integration Approaches First

Before coding, determine the **best implementation strategy** for source separation in this specific app.

You must evaluate these possible approaches:

### Option A — Pure JavaScript / Node

Examples:

- ONNX Runtime in Node
- TensorFlow.js
- WebAssembly/WebGPU/browser-side inference

### Option B — Electron main / worker-based JS

Heavy processing from Electron main or worker threads

### Option C — Python background process launched from Electron

Electron main launches Python via `child_process.spawn` or equivalent  
Python performs source separation and returns output stem paths  
Communication happens through IPC-safe boundaries

You must consider that **Python integration is allowed**, even if Python runs in the background from an IPC handler.

---

## What I Need From You First

Before making code changes, produce a **short implementation design brief** tailored to this repository.

That brief must include:

1. **Recommended stack**
   - which library/model to use for source separation
   - whether to use JS-only or Python integration
   - why that choice is best for ForgeAudio

2. **Architecture fit**
   - where separation should run
   - how renderer → main → background processing should work
   - how results should return to the renderer

3. **Data model**
   - how separated stems should be represented
   - whether they should be imported into the library as files, attached as derived assets, or both
   - how metadata should be stored in `library.json`

4. **UI integration**
   - where the user triggers separation
   - how progress/errors are shown
   - how results are surfaced without disrupting the current library UX

5. **Packaging implications**
   - what will be required for dev
   - what will be required for production builds on Electron
   - likely complexity/risk of bundling the chosen stack

6. **Test plan**
   - what unit/integration tests should be added
   - how to design the feature so it is testable without requiring real heavy model inference in tests

Do not skip the design brief.

---

## Preferred Product Behavior

Unless you find a better repo-aligned solution, aim for this v1 UX:

- User right-clicks an audio file or uses a file action button
- User chooses something like **“Separate Stems”**
- App begins offline processing
- UI shows progress/loading state
- Output stems are written to a deterministic local output directory
- App can reveal, preview, and optionally import/use those stems

The feature should feel like a natural extension of the existing ForgeAudio architecture.

---

## Strong Architecture Preferences

These are preferences, not absolute rules, but follow them unless you have a strong reason not to:

### 1. Keep heavy processing out of the renderer

The Vue renderer should not do model inference directly if it risks freezing the UI.

### 2. Prefer a background separation pipeline

A background Python process or worker-driven architecture is acceptable if it integrates cleanly.

### 3. Make file flow explicit

I want a clear, deterministic output directory strategy for separated stems.

Example shape:

- original file
- derived assets folder
- generated stem files

### 4. Design for future drum-to-MIDI

The result should make it easy to later feed the **drum stem** into a drum detection pipeline.

### 5. Keep testability high

Inference should be wrapped behind an adapter/service boundary so tests can mock it cleanly.

---

## Deliverables

Proceed in this order:

### Phase 1 — Repository-aware design brief

Give a concise but concrete implementation plan for this repo.

### Phase 2 — File-by-file change plan

Identify which files should be added or changed.

Be explicit. For example:

- `electron/main.ts`
- `electron/preload.ts`
- `electron/ipc/...`
- `src/stores/libraryStore.ts`
- `src/components/...`
- `tests/...`

### Phase 3 — Implement the feature

Then begin making the code changes.

When implementing:

- follow the repo’s composition/store conventions
- keep types strict
- avoid `any`
- preserve existing architecture
- do not refactor unrelated areas

### Phase 4 — Tests

Add or update focused tests for the new behavior.

---

## Expectations for Implementation Quality

Your solution should:

- be practical, not academic
- minimize risk to existing features
- degrade gracefully on failure
- support long-running tasks without blocking the UI
- be honest about cross-platform packaging challenges
- isolate the model/inference layer from UI/state logic

---

## Likely Areas You May Need to Add

You may need to introduce some or all of the following, if appropriate:

- a new Electron IPC module for source separation
- preload bridge additions
- a separation service interface
- a Python process adapter
- metadata shape for derived stem assets
- context menu action(s)
- progress UI / modal / banner
- result handling in the library store
- tests with mocked separation results

Do this only where it fits naturally.

---

## Constraints

- Local-only processing
- No cloud API dependency
- No unnecessary new UI framework
- No architectural regression
- No blocking renderer work
- No casual rewriting of established patterns
- Do not switch the intentional streaming scan design
- Do not introduce a database

---

## Decision Standard

Optimize for the best balance of:

- separation quality
- integration feasibility
- maintainability
- packaging realism
- performance on consumer machines

If the best answer is **Python in the background via Electron orchestration**, say so and build the feature around that cleanly.

---

## Important Implementation Guidance

If you choose Python integration:

- keep Python execution behind a well-defined service boundary
- do not entangle Python process management directly with Vue UI code
- ensure Electron main owns filesystem/process orchestration
- expose only minimal safe APIs to renderer through preload
- provide a graceful error path if Python/runtime/model is unavailable

If you choose a JS-only path instead, justify why it is better for this repo than Python.

---

## Output Format

Start with:

1. **Recommendation**
2. **Why this is the best fit for ForgeAudio**
3. **Implementation design brief**
4. **File-by-file plan**
5. **Then code changes**

Do not give a vague brainstorm.  
Make concrete repo-aware decisions and implement them.
