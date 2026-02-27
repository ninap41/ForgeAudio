import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLibraryStore, _resetLibraryStore, type AudioFile, type DateFilter, type ProfileSnapshot } from '../src/stores/libraryStore'
import { useTagStore, _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'
import { _resetSoundboardStore } from '../src/stores/soundboardStore'

// Mock window.electronAPI
const mockElectronAPI = {
  selectDirectory: vi.fn(),
  startScan: vi.fn(),
  onScanProgress: vi.fn(),
  onScanDone: vi.fn(),
  removeScanListeners: vi.fn(),
  readMetadata: vi.fn(),
  writeMetadata: vi.fn(),
  getAudioDuration: vi.fn(),
  showInFinder: vi.fn(),
  copyPath: vi.fn(),
  showContextMenu: vi.fn(),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
  onContextMenuPlay: vi.fn(),
  onContextMenuAddTag: vi.fn(),
  onContextMenuEditDescription: vi.fn(),
  onContextMenuDelete: vi.fn(),
  onContextMenuRename: vi.fn(),
  getRootDirectory: vi.fn(),
  setRootDirectory: vi.fn(),
  getStorePath: vi.fn(),
  getStoreData: vi.fn(),
  clearTagData: vi.fn(),
  toggleDevTools: vi.fn(),
  backupCreate: vi.fn(),
  backupList: vi.fn(),
  backupDelete: vi.fn(),
  backupRestore: vi.fn(),
  saveFileDialog: vi.fn(),
  selectFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}

vi.stubGlobal('window', { electronAPI: mockElectronAPI })

function makeFile(overrides: Partial<AudioFile> = {}): AudioFile {
  return {
    path: '/sounds/test.wav',
    name: 'test.wav',
    extension: '.wav',
    size: 1024,
    duration: 2.5,
    tags: [],
    description: '',
    lastPlayed: null,
    createdAt: null,
    modifiedAt: null,
    ...overrides,
  }
}

function makeDateFilter(overrides: Partial<DateFilter> = {}): DateFilter {
  return {
    id: 'df_test_1',
    field: 'createdAt',
    operator: 'after',
    date: '2025-02-03T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  _resetLibraryStore()
  _resetTagStore()
  _resetThemeStore()
  _resetSoundboardStore()
  vi.resetAllMocks()
  mockElectronAPI.writeMetadata.mockResolvedValue(undefined)
  mockElectronAPI.backupCreate.mockResolvedValue({})
  mockElectronAPI.backupList.mockResolvedValue([])
})

describe('dateFilters', () => {
  describe('addDateFilter', () => {
    it('adds a date filter', () => {
      const store = useLibraryStore()
      const filter = makeDateFilter()
      store.addDateFilter(filter)
      expect(store.dateFilters).toHaveLength(1)
      expect(store.dateFilters[0]).toEqual(filter)
    })

    it('deduplicates on field+operator+date', () => {
      const store = useLibraryStore()
      const filter1 = makeDateFilter({ id: 'df_1' })
      const filter2 = makeDateFilter({ id: 'df_2' }) // same field, operator, date
      store.addDateFilter(filter1)
      store.addDateFilter(filter2)
      expect(store.dateFilters).toHaveLength(1)
    })

    it('allows different field+operator combinations', () => {
      const store = useLibraryStore()
      store.addDateFilter(makeDateFilter({ id: 'df_1', field: 'createdAt', operator: 'after' }))
      store.addDateFilter(makeDateFilter({ id: 'df_2', field: 'createdAt', operator: 'before' }))
      store.addDateFilter(makeDateFilter({ id: 'df_3', field: 'modifiedAt', operator: 'after' }))
      expect(store.dateFilters).toHaveLength(3)
    })
  })

  describe('removeDateFilter', () => {
    it('removes a date filter by id', () => {
      const store = useLibraryStore()
      store.addDateFilter(makeDateFilter({ id: 'df_1' }))
      store.addDateFilter(makeDateFilter({ id: 'df_2', operator: 'before' }))
      store.removeDateFilter('df_1')
      expect(store.dateFilters).toHaveLength(1)
      expect(store.dateFilters[0].id).toBe('df_2')
    })

    it('no-op for missing id', () => {
      const store = useLibraryStore()
      store.addDateFilter(makeDateFilter({ id: 'df_1' }))
      store.removeDateFilter('df_nonexistent')
      expect(store.dateFilters).toHaveLength(1)
    })
  })

  describe('clearAllFilters', () => {
    it('clears dateFilters along with other filters', () => {
      const store = useLibraryStore()
      store.addDateFilter(makeDateFilter())
      store.addTagFilter('percussion')
      store.addDescriptionFilter('kick')
      store.clearAllFilters()
      expect(store.dateFilters).toHaveLength(0)
      expect(store.selectedTags).toHaveLength(0)
      expect(store.descriptionFilters).toHaveLength(0)
    })
  })

  describe('filteredFiles with date filters', () => {
    it('filters files created after a date', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/a.wav', name: 'a.wav', createdAt: '2025-02-01T00:00:00Z' }),
        makeFile({ path: '/b.wav', name: 'b.wav', createdAt: '2025-02-05T00:00:00Z' }),
        makeFile({ path: '/c.wav', name: 'c.wav', createdAt: '2025-02-10T00:00:00Z' }),
      ]
      store.addDateFilter(makeDateFilter({
        id: 'df_1',
        field: 'createdAt',
        operator: 'after',
        date: '2025-02-03T00:00:00Z',
      }))
      expect(store.filteredFiles.map(f => f.name)).toEqual(['b.wav', 'c.wav'])
    })

    it('filters files created before a date', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/a.wav', name: 'a.wav', createdAt: '2025-02-01T00:00:00Z' }),
        makeFile({ path: '/b.wav', name: 'b.wav', createdAt: '2025-02-05T00:00:00Z' }),
        makeFile({ path: '/c.wav', name: 'c.wav', createdAt: '2025-02-10T00:00:00Z' }),
      ]
      store.addDateFilter(makeDateFilter({
        id: 'df_1',
        field: 'createdAt',
        operator: 'before',
        date: '2025-02-05T00:00:00Z',
      }))
      expect(store.filteredFiles.map(f => f.name)).toEqual(['a.wav'])
    })

    it('filters files created on a specific date', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/a.wav', name: 'a.wav', createdAt: '2025-02-05T10:30:00Z' }),
        makeFile({ path: '/b.wav', name: 'b.wav', createdAt: '2025-02-05T22:00:00Z' }),
        makeFile({ path: '/c.wav', name: 'c.wav', createdAt: '2025-02-06T00:00:00Z' }),
      ]
      store.addDateFilter(makeDateFilter({
        id: 'df_1',
        field: 'createdAt',
        operator: 'on',
        date: '2025-02-05T00:00:00Z',
      }))
      expect(store.filteredFiles.map(f => f.name)).toEqual(['a.wav', 'b.wav'])
    })

    it('filters files modified after a date', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/a.wav', name: 'a.wav', modifiedAt: '2025-01-15T00:00:00Z' }),
        makeFile({ path: '/b.wav', name: 'b.wav', modifiedAt: '2025-03-20T00:00:00Z' }),
      ]
      store.addDateFilter(makeDateFilter({
        id: 'df_1',
        field: 'modifiedAt',
        operator: 'after',
        date: '2025-02-01T00:00:00Z',
      }))
      expect(store.filteredFiles.map(f => f.name)).toEqual(['b.wav'])
    })

    it('excludes files with null date field', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/a.wav', name: 'a.wav', createdAt: '2025-02-10T00:00:00Z' }),
        makeFile({ path: '/b.wav', name: 'b.wav', createdAt: null }),
      ]
      store.addDateFilter(makeDateFilter({
        id: 'df_1',
        field: 'createdAt',
        operator: 'after',
        date: '2025-02-01T00:00:00Z',
      }))
      expect(store.filteredFiles.map(f => f.name)).toEqual(['a.wav'])
    })

    it('applies multiple date filters with AND logic', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/a.wav', name: 'a.wav', createdAt: '2025-01-15T00:00:00Z' }),
        makeFile({ path: '/b.wav', name: 'b.wav', createdAt: '2025-02-15T00:00:00Z' }),
        makeFile({ path: '/c.wav', name: 'c.wav', createdAt: '2025-03-15T00:00:00Z' }),
      ]
      // After Jan 31 AND before Mar 1 → only Feb 15
      store.addDateFilter(makeDateFilter({
        id: 'df_1',
        field: 'createdAt',
        operator: 'after',
        date: '2025-01-31T00:00:00Z',
      }))
      store.addDateFilter(makeDateFilter({
        id: 'df_2',
        field: 'createdAt',
        operator: 'before',
        date: '2025-03-01T00:00:00Z',
      }))
      expect(store.filteredFiles.map(f => f.name)).toEqual(['b.wav'])
    })

    it('combines date filters with tag filters', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/a.wav', name: 'a.wav', createdAt: '2025-02-10T00:00:00Z', tags: ['percussion'] }),
        makeFile({ path: '/b.wav', name: 'b.wav', createdAt: '2025-02-10T00:00:00Z', tags: [] }),
        makeFile({ path: '/c.wav', name: 'c.wav', createdAt: '2025-01-01T00:00:00Z', tags: ['percussion'] }),
      ]
      store.addDateFilter(makeDateFilter({
        id: 'df_1',
        field: 'createdAt',
        operator: 'after',
        date: '2025-02-01T00:00:00Z',
      }))
      store.addTagFilter('percussion')
      expect(store.filteredFiles.map(f => f.name)).toEqual(['a.wav'])
    })

    it('combines date filters with description filters', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/kick.wav', name: 'kick.wav', createdAt: '2025-02-10T00:00:00Z' }),
        makeFile({ path: '/snare.wav', name: 'snare.wav', createdAt: '2025-02-10T00:00:00Z' }),
        makeFile({ path: '/kick2.wav', name: 'kick2.wav', createdAt: '2025-01-01T00:00:00Z' }),
      ]
      store.addDateFilter(makeDateFilter({
        id: 'df_1',
        field: 'createdAt',
        operator: 'after',
        date: '2025-02-01T00:00:00Z',
      }))
      store.addDescriptionFilter('kick')
      expect(store.filteredFiles.map(f => f.name)).toEqual(['kick.wav'])
    })
  })

  describe('profile persistence', () => {
    it('getProfileSnapshot captures dateFilters', () => {
      const store = useLibraryStore()
      const filter = makeDateFilter()
      store.addDateFilter(filter)
      store.addTagFilter('bass')

      const snapshot = store.getProfileSnapshot()
      expect(snapshot.filters).toBeDefined()
      expect(snapshot.filters!.dateFilters).toHaveLength(1)
      expect(snapshot.filters!.dateFilters[0].field).toBe('createdAt')
      expect(snapshot.filters!.selectedTags).toEqual(['bass'])
    })

    it('getProfileSnapshot captures all filter types', () => {
      const store = useLibraryStore()
      store.addDateFilter(makeDateFilter())
      store.addTagFilter('bass')
      store.addExcludeTagFilter('noise')
      store.addDescriptionFilter('kick')
      store.addExcludeDescriptionFilter('bad')
      store.filterExtension = ['.wav']
      store.filterTagged = 'tagged'

      const snapshot = store.getProfileSnapshot()
      expect(snapshot.filters!.selectedTags).toEqual(['bass'])
      expect(snapshot.filters!.excludedTags).toEqual(['noise'])
      expect(snapshot.filters!.descriptionFilters).toEqual(['kick'])
      expect(snapshot.filters!.excludedDescriptionFilters).toEqual(['bad'])
      expect(snapshot.filters!.dateFilters).toHaveLength(1)
      expect(snapshot.filters!.filterExtension).toEqual(['.wav'])
      expect(snapshot.filters!.filterTagged).toBe('tagged')
    })

    it('applyProfileData restores filters from snapshot', () => {
      const store = useLibraryStore()
      const filter = makeDateFilter()

      const snapshot: ProfileSnapshot = {
        files: {},
        tags: {},
        filters: {
          selectedTags: ['perc'],
          excludedTags: ['noise'],
          descriptionFilters: ['kick'],
          excludedDescriptionFilters: ['bad'],
          dateFilters: [filter],
          filterExtension: ['.wav', '.mp3'],
          filterTagged: 'tagged',
        },
      }

      store.applyProfileData(snapshot)
      expect(store.selectedTags).toEqual(['perc'])
      expect(store.excludedTags).toEqual(['noise'])
      expect(store.descriptionFilters).toEqual(['kick'])
      expect(store.excludedDescriptionFilters).toEqual(['bad'])
      expect(store.dateFilters).toHaveLength(1)
      expect(store.dateFilters[0].field).toBe('createdAt')
      expect(store.filterExtension).toEqual(['.wav', '.mp3'])
      expect(store.filterTagged).toBe('tagged')
    })

    it('applyProfileData clears filters when filters field absent (backward compat)', () => {
      const store = useLibraryStore()
      store.addDateFilter(makeDateFilter())
      store.addTagFilter('bass')
      store.filterExtension = ['.wav']

      const snapshot: ProfileSnapshot = {
        files: {},
        tags: {},
        // no filters field
      }

      store.applyProfileData(snapshot)
      expect(store.dateFilters).toHaveLength(0)
      expect(store.selectedTags).toHaveLength(0)
      expect(store.filterExtension).toHaveLength(0)
      expect(store.filterTagged).toBe('all')
    })

    it('getProfileSnapshot captures sort state', () => {
      const store = useLibraryStore()
      store.setSort('duration')
      store.setSort('duration') // toggle to desc

      const snapshot = store.getProfileSnapshot()
      expect(snapshot.sortColumn).toBe('duration')
      expect(snapshot.sortDirection).toBe('desc')
    })

    it('applyProfileData restores sort state from snapshot', () => {
      const store = useLibraryStore()
      expect(store.sortColumn).toBe('name')
      expect(store.sortDirection).toBe('asc')

      const snapshot: ProfileSnapshot = {
        files: {},
        tags: {},
        sortColumn: 'modifiedAt',
        sortDirection: 'desc',
      }

      store.applyProfileData(snapshot)
      expect(store.sortColumn).toBe('modifiedAt')
      expect(store.sortDirection).toBe('desc')
    })

    it('applyProfileData resets sort state when absent (backward compat)', () => {
      const store = useLibraryStore()
      store.setSort('duration')

      const snapshot: ProfileSnapshot = {
        files: {},
        tags: {},
        // no sortColumn/sortDirection
      }

      store.applyProfileData(snapshot)
      expect(store.sortColumn).toBe('name')
      expect(store.sortDirection).toBe('asc')
    })
  })

  describe('reset', () => {
    it('_resetLibraryStore clears dateFilters', () => {
      const store = useLibraryStore()
      store.addDateFilter(makeDateFilter())
      expect(store.dateFilters).toHaveLength(1)
      _resetLibraryStore()
      const store2 = useLibraryStore()
      expect(store2.dateFilters).toHaveLength(0)
    })
  })
})
