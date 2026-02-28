import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLibraryStore, _resetLibraryStore, type AudioFile } from '../src/stores/libraryStore'
import { _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'
import { _resetSoundboardStore } from '../src/stores/soundboardStore'

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
  startDrag: vi.fn(),
  startDragFiles: vi.fn(),
  showBulkContextMenu: vi.fn(),
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

beforeEach(() => {
  _resetLibraryStore()
  _resetTagStore()
  _resetThemeStore()
  _resetSoundboardStore()
  vi.resetAllMocks()
  mockElectronAPI.writeMetadata.mockResolvedValue(undefined)
  mockElectronAPI.deleteFile.mockResolvedValue({ success: true })
  mockElectronAPI.backupCreate.mockResolvedValue({})
  mockElectronAPI.backupList.mockResolvedValue([])
})

describe('multiSelect', () => {
  describe('selectFile', () => {
    it('sets single selection and lastClickedPath', () => {
      const store = useLibraryStore()
      store.selectFile('/sounds/a.wav')
      expect(store.selectedPaths.has('/sounds/a.wav')).toBe(true)
      expect(store.selectedPaths.size).toBe(1)
      expect(store.lastClickedPath).toBe('/sounds/a.wav')
    })

    it('replaces previous selection', () => {
      const store = useLibraryStore()
      store.selectFile('/sounds/a.wav')
      store.selectFile('/sounds/b.wav')
      expect(store.selectedPaths.has('/sounds/a.wav')).toBe(false)
      expect(store.selectedPaths.has('/sounds/b.wav')).toBe(true)
      expect(store.selectedPaths.size).toBe(1)
    })
  })

  describe('shiftSelectFile', () => {
    it('range selects forward from anchor', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/sounds/a.wav', name: 'a.wav' }),
        makeFile({ path: '/sounds/b.wav', name: 'b.wav' }),
        makeFile({ path: '/sounds/c.wav', name: 'c.wav' }),
        makeFile({ path: '/sounds/d.wav', name: 'd.wav' }),
      ]
      store.selectFile('/sounds/a.wav')
      store.shiftSelectFile('/sounds/c.wav')
      expect(store.selectedPaths.size).toBe(3)
      expect(store.selectedPaths.has('/sounds/a.wav')).toBe(true)
      expect(store.selectedPaths.has('/sounds/b.wav')).toBe(true)
      expect(store.selectedPaths.has('/sounds/c.wav')).toBe(true)
      expect(store.selectedPaths.has('/sounds/d.wav')).toBe(false)
    })

    it('range selects backward from anchor', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/sounds/a.wav', name: 'a.wav' }),
        makeFile({ path: '/sounds/b.wav', name: 'b.wav' }),
        makeFile({ path: '/sounds/c.wav', name: 'c.wav' }),
      ]
      store.selectFile('/sounds/c.wav')
      store.shiftSelectFile('/sounds/a.wav')
      expect(store.selectedPaths.size).toBe(3)
    })

    it('does NOT update anchor (consecutive shift-clicks)', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/sounds/a.wav', name: 'a.wav' }),
        makeFile({ path: '/sounds/b.wav', name: 'b.wav' }),
        makeFile({ path: '/sounds/c.wav', name: 'c.wav' }),
        makeFile({ path: '/sounds/d.wav', name: 'd.wav' }),
      ]
      store.selectFile('/sounds/a.wav')
      store.shiftSelectFile('/sounds/b.wav')
      expect(store.lastClickedPath).toBe('/sounds/a.wav') // anchor unchanged
      store.shiftSelectFile('/sounds/d.wav')
      // Should select from anchor (a) to d, not from b to d
      expect(store.selectedPaths.size).toBe(4)
    })

    it('falls back to single select when no anchor', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/sounds/a.wav', name: 'a.wav' }),
      ]
      store.shiftSelectFile('/sounds/a.wav')
      expect(store.selectedPaths.size).toBe(1)
      expect(store.lastClickedPath).toBe('/sounds/a.wav')
    })
  })

  describe('toggleSelectFile', () => {
    it('adds file to selection', () => {
      const store = useLibraryStore()
      store.selectFile('/sounds/a.wav')
      store.toggleSelectFile('/sounds/b.wav')
      expect(store.selectedPaths.size).toBe(2)
      expect(store.selectedPaths.has('/sounds/a.wav')).toBe(true)
      expect(store.selectedPaths.has('/sounds/b.wav')).toBe(true)
    })

    it('removes file from selection if already selected', () => {
      const store = useLibraryStore()
      store.selectFile('/sounds/a.wav')
      store.toggleSelectFile('/sounds/a.wav')
      expect(store.selectedPaths.size).toBe(0)
    })

    it('updates anchor to toggled file', () => {
      const store = useLibraryStore()
      store.selectFile('/sounds/a.wav')
      store.toggleSelectFile('/sounds/b.wav')
      expect(store.lastClickedPath).toBe('/sounds/b.wav')
    })
  })

  describe('clearSelection', () => {
    it('empties selection and nulls anchor', () => {
      const store = useLibraryStore()
      store.selectFile('/sounds/a.wav')
      store.clearSelection()
      expect(store.selectedPaths.size).toBe(0)
      expect(store.lastClickedPath).toBe(null)
    })
  })

  describe('isSelected', () => {
    it('returns true for selected file', () => {
      const store = useLibraryStore()
      store.selectFile('/sounds/a.wav')
      expect(store.isSelected('/sounds/a.wav')).toBe(true)
    })

    it('returns false for unselected file', () => {
      const store = useLibraryStore()
      expect(store.isSelected('/sounds/a.wav')).toBe(false)
    })
  })

  describe('deleteFiles', () => {
    it('deletes multiple files and clears selection for deleted', async () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/sounds/a.wav', name: 'a.wav' }),
        makeFile({ path: '/sounds/b.wav', name: 'b.wav' }),
        makeFile({ path: '/sounds/c.wav', name: 'c.wav' }),
      ]
      store.selectFile('/sounds/a.wav')
      store.toggleSelectFile('/sounds/b.wav')

      const result = await store.deleteFiles(['/sounds/a.wav', '/sounds/b.wav'])
      expect(result.errors).toHaveLength(0)
      expect(store.files).toHaveLength(1)
      expect(store.files[0].path).toBe('/sounds/c.wav')
      expect(store.selectedPaths.has('/sounds/a.wav')).toBe(false)
      expect(store.selectedPaths.has('/sounds/b.wav')).toBe(false)
    })

    it('returns errors for failed deletions', async () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/sounds/a.wav', name: 'a.wav' }),
        makeFile({ path: '/sounds/b.wav', name: 'b.wav' }),
      ]
      mockElectronAPI.deleteFile
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Permission denied' })

      const result = await store.deleteFiles(['/sounds/a.wav', '/sounds/b.wav'])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Permission denied')
      expect(store.files).toHaveLength(1) // a.wav deleted, b.wav remains
    })

    it('stops playback if deleting currently playing file', async () => {
      const store = useLibraryStore()
      const file = makeFile({ path: '/sounds/a.wav', name: 'a.wav' })
      store.files = [file]
      store.currentFile = file
      store.isPlaying = true

      await store.deleteFiles(['/sounds/a.wav'])
      expect(store.currentFile).toBe(null)
      expect(store.isPlaying).toBe(false)
    })

    it('calls saveMetadata once at the end', async () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ path: '/sounds/a.wav', name: 'a.wav' }),
        makeFile({ path: '/sounds/b.wav', name: 'b.wav' }),
      ]
      await store.deleteFiles(['/sounds/a.wav', '/sounds/b.wav'])
      // writeMetadata called once (from saveMetadata at the end of deleteFiles)
      expect(mockElectronAPI.writeMetadata).toHaveBeenCalledTimes(1)
    })
  })

  describe('dragPayload as array', () => {
    it('accepts array format for single file', () => {
      const store = useLibraryStore()
      store.dragPayload = [{ path: '/a.wav', name: 'a.wav', extension: '.wav', duration: 1 }]
      expect(store.dragPayload).toHaveLength(1)
      expect(store.dragPayload![0].path).toBe('/a.wav')
    })

    it('accepts array format for multiple files', () => {
      const store = useLibraryStore()
      store.dragPayload = [
        { path: '/a.wav', name: 'a.wav', extension: '.wav', duration: 1 },
        { path: '/b.wav', name: 'b.wav', extension: '.wav', duration: 2 },
      ]
      expect(store.dragPayload).toHaveLength(2)
    })
  })

  describe('reset clears selection', () => {
    it('_resetLibraryStore clears selection state', () => {
      const store = useLibraryStore()
      store.selectFile('/sounds/a.wav')
      _resetLibraryStore()
      // Re-acquire store after reset
      const store2 = useLibraryStore()
      expect(store2.selectedPaths.size).toBe(0)
      expect(store2.lastClickedPath).toBe(null)
    })
  })
})
