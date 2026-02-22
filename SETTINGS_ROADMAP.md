# Settings & Features Roadmap

## Current Implementation ✅

### Already Implemented
- **Root Directory Management** — select, display, change folder
- **Tag Management** — CRUD operations (create, edit, delete, clear)
- **Tag Colors** — inline color picker for each tag
- **Uncategorized Count** — shows files with no tags

### Current Test Coverage
- 10 tests in `settingsView.test.ts` covering:
  - Uncategorized file counting (empty, mixed, updates)
  - Tag rendering and management
  - Add/empty tag validation

---

## Phase 1: Settings Enhancement (Core UX)

### Features to Implement
1. **Library Statistics Panel**
   - Total files in library
   - Average tags per file
   - Distribution by format (.wav, .mp3, etc.)
   - Untagged file percentage
   - Total library size (GB)

2. **Bulk Tag Operations**
   - Merge tags (combine duplicate/related tags)
   - Batch rename tags
   - Move all files from one tag to another
   - Find & replace tag names

3. **Settings Export/Import**
   - Export library.json with all metadata
   - Export tag definitions as CSV
   - Import tags from backup
   - Import settings from another library

4. **Backup Management**
   - Auto-backup on every save
   - Manual backup trigger
   - Backup history with timestamps
   - One-click restore to previous state
   - Purge old backups

### Implied Tests Needed
```
tests/settingsView.test.ts (expand to 40+ tests)
├── Tag Statistics
│   ├── Count files by format
│   ├── Calculate average tags per file
│   └── Show untagged percentage
├── Bulk Operations
│   ├── Merge tag A into tag B
│   ├── Rename tag globally
│   └── Move files between tags
├── Export/Import
│   ├── Export to JSON
│   ├── Export to CSV
│   └── Import validation
└── Backup Management
    ├── Auto-backup creation
    ├── Restore from backup
    └── Backup history cleanup
```

---

## Phase 2: Library Organization (Automation)

### Features to Implement
1. **Smart Auto-Tagging**
   - Suggest tags based on filename patterns
   - Apply tags by file type
   - Create regex rules for auto-tagging
   - Preview before applying

2. **Tag Recommendations**
   - Show unused tags
   - Suggest tags based on similarity
   - Highlight potentially duplicate tags (e.g., "Impact" vs "impact")
   - Recommend consolidation

3. **Batch Operations on Files**
   - Apply tag to multiple untagged files
   - Remove tag from multiple files
   - Change descriptions in bulk

### Implied Tests Needed
```
tests/settingsView.test.ts
├── Auto-Tagging Rules
│   ├── Apply filename patterns
│   ├── Apply file type rules
│   └── Preview results
├── Tag Recommendations
│   ├── Find unused tags
│   ├── Detect similar tags
│   └── Show consolidation suggestions
└── Batch File Operations
    ├── Tag multiple files
    ├── Remove tag from batch
    └── Update descriptions
```

---

## Phase 3: Advanced Features (Power User)

### Features to Implement
1. **Danger Zone**
   - Clear all files from library (not disk)
   - Reset all metadata
   - Clear all tags
   - Requires double-confirmation

2. **Advanced Settings**
   - Scanner settings (batch size, concurrency)
   - Metadata compression
   - Cache settings
   - Developer mode (verbose logging)

3. **Settings Profile**
   - Save/load multiple settings profiles
   - Share settings (export as .forgerc file)
   - Import community settings

4. **Analytics & Insights**
   - Last modified files
   - Most tagged files
   - Tag usage distribution (pie chart)
   - Library growth over time

### Implied Tests Needed
```
tests/settingsView.test.ts
├── Danger Zone
│   ├── Confirm clear library
│   ├── Confirm reset metadata
│   └── Verify double-confirmation
├── Advanced Settings
│   ├── Scanner configuration
│   ├── Persistence of settings
│   └── Validation of values
├── Settings Profile
│   ├── Save/load profiles
│   ├── Export format validation
│   └── Import error handling
└── Analytics
    ├── Calculate last modified
    ├── Find most tagged
    └── Generate distribution chart
```

---

## Phase 4: Integration & Polish (Ecosystem)

### Features to Implement
1. **Settings Sync**
   - iCloud/cloud storage sync option (optional)
   - Settings version control
   - Conflict resolution

2. **Keyboard Shortcuts**
   - Settings page hotkey (Cmd+,)
   - Jump to sections
   - Quick actions

3. **Accessibility**
   - Focus management in modals
   - Keyboard navigation for tag list
   - Screen reader support
   - High contrast mode

### Test Structure Summary
```
tests/
├── settingsView.test.ts (core settings UI)
├── settingsStatistics.test.ts (analytics & insights)
├── settingsBulkOps.test.ts (bulk operations)
├── settingsBackup.test.ts (backup/restore)
├── settingsProfiles.test.ts (profile management)
└── settingsAccessibility.test.ts (a11y features)
```

---

## Implementation Order (Recommended)

### 🔴 High Priority (P1)
1. Library Statistics Panel → **1 test file, 8-10 tests**
2. Bulk Tag Operations (merge, rename) → **1 test file, 12-15 tests**
3. Settings Export/Import → **1 test file, 10-12 tests**

### 🟡 Medium Priority (P2)
4. Backup Management → **1 test file, 10-12 tests**
5. Auto-Tagging Rules → **1 test file, 12-15 tests**
6. Tag Recommendations → **1 test file, 8-10 tests**

### 🟢 Low Priority (P3)
7. Danger Zone → **1 test file, 6-8 tests**
8. Advanced Settings → **1 test file, 8-10 tests**
9. Settings Profiles → **1 test file, 10-12 tests**
10. Analytics Visualizations → **1 test file, 10-12 tests**

---

## Test Growth Projection

| Phase | Current Tests | New Tests | Total | Files |
|-------|--------------|-----------|-------|-------|
| **Current** | 189 | 0 | 189 | 13 |
| **Phase 1** | 189 | 50-60 | 240-250 | 16 |
| **Phase 2** | 240 | 35-40 | 275-285 | 18 |
| **Phase 3** | 275 | 45-55 | 320-330 | 20 |
| **Phase 4** | 320 | 30-40 | 350-370 | 21 |

---

## Design Decisions for Future Implementation

### File Organization
- Use `src/views/settings/` subfolder for settings sub-pages:
  ```
  src/views/settings/
  ├── SettingsView.vue (main shell)
  ├── StatisticsPanel.vue
  ├── TagManagementPanel.vue
  ├── BackupPanel.vue
  └── DangerZonePanel.vue
  ```

### State Management
- Extend `tagStore` with bulk operations
- Create new `settingsStore` for:
  - Backup history
  - Settings profiles
  - Statistics cache
  - Auto-tag rules

### Component Structure
- Keep each panel self-contained
- Pass `library` and `tagStore` as props
- Emit changes to parent (`SettingsView.vue`)
- Confirm all destructive operations with modal

### Error Handling
- Wrap all file I/O in try/catch
- Show toast notifications for user feedback
- Validate imports before applying
- Implement rollback for failed operations

---

## Current Status

✅ **Implemented**: Uncategorized file counting with 10 comprehensive tests
📋 **Ready for Phase 1**: Library Statistics Panel
🎯 **Projected Completion**: All phases by 2026-Q4
