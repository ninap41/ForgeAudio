# ForgeAudio — Roadmap

> From admin dashboard to pro creative tool.

---

## Phase 1: Structural Overhaul — Settings Sidebar Layout

**Goal:** Replace the vertical scroll dump with a two-column control panel.

**Priority:** Highest — this unblocks every other visual improvement by giving each section its own focused panel.

### 1.1 Settings sidebar navigation
- Add a narrow left rail (`180–200px`) inside `SettingsView.vue` with nav items: **Library, Tags, Data, Backups**
- Consolidate Bulk Operations into the Tags section (merge/rename are tag operations)
- Consolidate Import/Export into a single "Data" section
- Active item gets accent left-border highlight
- Sidebar is sticky while content scrolls

### 1.2 Settings content panel
- Right side renders only the active section's component
- Use `v-if` or a dynamic component to swap panels (no scroll-to-section hack)
- Smooth fade/slide transition on section switch (`<Transition>` wrapper)

### 1.3 Reduce vertical spacing globally
- Tighten section title → content gap from `24px` → `16px`
- Tighten card-to-card gap from `16px` → `12px`
- Reduce section bottom margins from `32px` → `20px`

**Files touched:** `SettingsView.vue`, `global.css`, possibly extract a new `SettingsNav.vue` component.

**Tests:** Update `settingsView.test.ts` for new nav interaction, ensure all panel tests still pass.

---

## Phase 2: Tags Section — Make It Powerful

**Goal:** Tags should look and feel like the creative asset they are, not a form list.

### 2.1 Tag rows as colored pills
- Replace square color box + plain text with pill-shaped tag chips (reuse `TagChip.vue` styling at a larger scale)
- File count as secondary text to the right of the pill
- Actions (Edit, Clear, Delete) hidden by default, revealed on row hover via opacity transition

### 2.2 Tag search/filter field
- Add a search input above the tag list: `Search tags...`
- Filters tag list client-side in real-time
- Essential once tag count exceeds ~20

### 2.3 Tag usage heat indicator
- Subtle opacity/vibrancy scaling based on file count relative to max
- High-use tags appear more saturated, low-use tags slightly muted

### 2.4 Fold Bulk Operations into Tags
- Remove `BulkOperationsPanel` as a standalone section
- "Merge Tags" becomes a multi-select action: select 2+ tags → "Merge Selected" button appears
- "Rename Tag" becomes an inline action on each tag row (via `EditTagModal`)
- Add confirmation preview before merge/rename: _"This will update 126 files."_

**Files touched:** `SettingsView.vue`, `TagChip.vue` (or new `TagRow.vue`), `BulkOperationsPanel.vue` (refactor into Tags section), `EditTagModal.vue`.

**Tests:** Update `settingsView.test.ts`, `settingsBulkOps.test.ts` for new interaction patterns.

---

## Phase 3: Library Statistics — Dashboard Feel

**Goal:** Turn flat stat cards into a compact, visual dashboard.

### 3.1 Stat card polish
- Add subtle icons to each stat card (file-stack, disk, tag, bar-chart — inline SVG, no icon library)
- Animated number count-up on mount (requestAnimationFrame counter, ~800ms)
- Accent glow border on hover: `box-shadow: 0 0 12px var(--accent)` at low opacity

### 3.2 Format breakdown bar animations
- Animated fill on mount: bars grow from 0% to final width over 800ms with `ease-out`
- Show percentage text inside bar (visible when bar is wide enough)
- Hover tooltip with exact count + percentage
- Optional: tiny file-type icons per format row

### 3.3 Add Rescan button to Library settings panel
- Duplicate the Library view's Rescan button here: `[Change Directory] [Rescan]`
- Calls the same `library.rescan()` action

**Files touched:** `StatisticsPanel.vue`, `SettingsView.vue` (for rescan button).

**Tests:** Update `settingsStatistics.test.ts` for animated values and new interactions.

---

## Phase 4: Backups — Timeline Layout

**Goal:** Make backup history feel intentional and visual.

### 4.1 Timeline visualization
- Replace stacked cards with a vertical timeline: left-side line with circular nodes
- Each node: timestamp, file size, Restore + Delete actions
- Most recent backup at top, accent-colored node

### 4.2 Auto-backup status badge
- Show `Auto Backup Enabled` badge at top of section
- Display current max backup count setting inline

### 4.3 Backup diff preview (stretch)
- On Restore click, show a summary modal before confirming:
  - `+12 tags added, -2 tags removed, 8 files changed`
- Compare current `library.json` against backup contents
- This is a real diff, not fake data — parse both JSON files and compute deltas

**Files touched:** `BackupPanel.vue`, potentially new `BackupTimeline.vue` and `BackupDiffModal.vue`.

**Tests:** Update `settingsBackup.test.ts` for timeline rendering and diff preview.

---

## Phase 5: Import/Export — Safety & Clarity

**Goal:** Make data operations feel safe and give clear feedback.

### 5.1 Compact card layout
- Two cards side by side (keep grid) but with clearer visual hierarchy
- Export: neutral accent styling, primary action
- Import: subtle warm/warning tint on border — this is a destructive-ish operation
- Warning text under Import: _"This will replace your current metadata."_

### 5.2 Status indicators
- After export: show last export timestamp + file path + brief success checkmark (fade out after 3s)
- After import: show count of files/tags imported

**Files touched:** `ExportImportPanel.vue`.

**Tests:** Update `settingsExportImport.test.ts`.

---

## Phase 6: Micro-Interactions & Visual Polish

**Goal:** Elevate the entire app from functional to polished.

### 6.1 Card depth
- All cards get subtle box-shadow: `0 2px 8px rgba(0,0,0,0.25)`
- Slightly lighter background than `--bg-secondary` for lifted appearance
- `border-radius: 8px` (up from 4px) for softer feel

### 6.2 Button hover gradients
- Primary buttons: subtle `linear-gradient` on hover (accent → accent-hover at 90deg)
- Slight translate or scale on press (`transform: scale(0.98)`)

### 6.3 Animated tab underline
- Library/Settings nav tabs: replace static border with a sliding underline
- CSS transition on a pseudo-element that moves to follow the active tab

### 6.4 Smooth section transitions
- Settings panel switches use `<Transition>` with fade + slight vertical slide
- Duration: 150–200ms, ease-out

**Files touched:** `global.css`, `App.vue` (tab animation), `SettingsView.vue` (transitions).

**Tests:** Visual changes — no new functional tests needed, verify existing tests still pass.

---

## Phase 7: Audio Identity

**Goal:** Inject subtle creative identity that says "this is an audio tool."

### 7.1 Waveform background in stats section
- Faint SVG waveform pattern at 3–5% opacity behind the statistics cards
- Static, decorative only — no animation cost

### 7.2 Format bar shimmer on hover
- CSS `@keyframes` shimmer effect across format breakdown bars on hover
- Subtle left-to-right highlight sweep

### 7.3 Header spectrum line
- Thin (2px) animated gradient line under the header
- Slow color cycling through the accent palette
- Pure CSS animation, no JS cost

**Files touched:** `StatisticsPanel.vue`, `global.css`, `App.vue`.

**Tests:** Visual only — no functional tests needed.

---

## Phase 8: Settings Reset & Quality of Life

### 8.1 "Reset to Defaults" button
- Add to Settings header area
- Resets theme, clears custom settings, confirms before executing
- Does NOT clear library metadata (tags, descriptions)

### 8.2 Keyboard shortcuts
- `Escape` closes any open settings modal
- Consider settings search in future (Phase 9+)

**Files touched:** `SettingsView.vue`, `settingsStore.ts`.

---

## Implementation Priority (Top 5 High-Impact)

If only 5 things get built, build these:

| # | Item | Phase | Impact |
|---|------|-------|--------|
| 1 | Settings sidebar navigation | 1.1–1.2 | Eliminates scroll fatigue, pro layout |
| 2 | Tag rows as colored pills + hover actions | 2.1 | Transforms the biggest visual weak spot |
| 3 | Format bar animations + stat icons | 3.1–3.2 | Dashboard feel with minimal effort |
| 4 | Backup timeline layout | 4.1 | High visual impact, moderate effort |
| 5 | Card depth + button gradients + tab animation | 6.1–6.3 | Polish layer across entire app |

---

## Out of Scope (Future Consideration)

- Tag drag-and-drop reordering
- Settings search bar
- Custom keyboard shortcut configuration
- Plugin/extension system
- Cloud sync for library.json
- Waveform preview in file rows
