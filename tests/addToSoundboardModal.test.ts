import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AddToSoundboardModal from '../src/components/AddToSoundboardModal.vue'
import { _resetSoundboardStore, useSoundboardStore } from '../src/stores/soundboardStore'
import { _resetLibraryStore, useLibraryStore } from '../src/stores/libraryStore'
import { _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'
import { _resetSettingsStore } from '../src/stores/settingsStore'

// Mock wavesurfer
vi.mock('wavesurfer.js', () => ({
  default: {
    create: vi.fn(() => ({
      registerPlugin: vi.fn(() => ({
        addRegion: vi.fn(),
        clearRegions: vi.fn(),
        getRegions: vi.fn(() => []),
        enableDragSelection: vi.fn(() => vi.fn()),
        on: vi.fn(),
        destroy: vi.fn(),
      })),
      on: vi.fn(),
      destroy: vi.fn(),
      getDuration: vi.fn(() => 10),
      getCurrentTime: vi.fn(() => 0),
      setOptions: vi.fn(),
    })),
  },
}))

vi.mock('wavesurfer.js/dist/plugins/regions.esm.js', () => ({
  default: {
    create: vi.fn(() => ({})),
  },
}))

;(window as any).electronAPI = {
  selectDirectory: vi.fn(),
  startScan: vi.fn(),
  onScanProgress: vi.fn(),
  onScanDone: vi.fn(),
  removeScanListeners: vi.fn(),
  readMetadata: vi.fn(),
  writeMetadata: vi.fn().mockResolvedValue(undefined),
  getAudioDuration: vi.fn().mockResolvedValue(10),
  showInFinder: vi.fn(),
  copyPath: vi.fn(),
  showContextMenu: vi.fn(),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
  createDirectory: vi.fn(),
  resolveDroppedPaths: vi.fn(),
  copyFileToLibrary: vi.fn(),
  onContextMenuPlay: vi.fn(),
  onContextMenuAddTag: vi.fn(),
  onContextMenuEditDescription: vi.fn(),
  onContextMenuDelete: vi.fn(),
  onContextMenuRename: vi.fn(),
  onContextMenuAddToSoundboard: vi.fn(),
  onContextMenuQuickAddToSoundboard: vi.fn(),
  onContextMenuQuickTag: vi.fn(),
  getRootDirectory: vi.fn(),
  setRootDirectory: vi.fn(),
  getStorePath: vi.fn(),
  getStoreData: vi.fn(),
  clearTagData: vi.fn(),
  toggleDevTools: vi.fn(),
  backupCreate: vi.fn().mockResolvedValue({}),
  backupList: vi.fn().mockResolvedValue([]),
  backupDelete: vi.fn(),
  backupRestore: vi.fn(),
  saveFileDialog: vi.fn(),
  selectFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  showSoundboardItemMenu: vi.fn(),
  onSbItemPlay: vi.fn(),
  onSbItemEdit: vi.fn(),
  onSbItemRemove: vi.fn(),
  onSbItemViewData: vi.fn(),
  startDrag: vi.fn(),
  getWaveformPeaks: vi.fn().mockResolvedValue(new Array(800).fill(0.5)),
}

let sbId: string

function setupSoundboard() {
  const store = useSoundboardStore()
  const library = useLibraryStore()
  sbId = store.createSoundboard('Test Board', 'desc', 'LIST', 'Default')
  library.files.push({
    path: '/sounds/kick.wav',
    name: 'kick.wav',
    extension: '.wav',
    size: 48000,
    duration: 10,
    tags: [],
    description: '',
    lastPlayed: null,
    createdAt: null,
    modifiedAt: null,
  })
}

function createWrapper() {
  return mount(AddToSoundboardModal, {
    props: { filePath: '/sounds/kick.wav' },
  })
}

beforeEach(() => {
  _resetSoundboardStore()
  _resetLibraryStore()
  _resetTagStore()
  _resetThemeStore()
  _resetSettingsStore()
  vi.clearAllMocks()
})

describe('AddToSoundboardModal', () => {
  describe('rendering', () => {
    it('renders modal with correct title', () => {
      setupSoundboard()
      const wrapper = createWrapper()
      expect(wrapper.find('h3').text()).toBe('Add to Soundboard')
    })

    it('shows file name in subtitle', () => {
      setupSoundboard()
      const wrapper = createWrapper()
      expect(wrapper.find('.modal-subtitle').text()).toBe('kick.wav')
    })

    it('shows empty state when no soundboards exist', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.modal-body').text()).toContain('No soundboards')
    })

    it('shows soundboard select when soundboards exist', () => {
      setupSoundboard()
      const wrapper = createWrapper()
      expect(wrapper.find('select').exists()).toBe(true)
      expect(wrapper.findAll('option').length).toBe(2) // disabled + Test Board
    })
  })

  describe('close behavior', () => {
    it('has fixed width of 80%', () => {
      setupSoundboard()
      const wrapper = createWrapper()
      const modal = wrapper.find('.modal')
      expect(modal.attributes('style')).toContain('width: 80%')
    })

    it('renders X close button', () => {
      setupSoundboard()
      const wrapper = createWrapper()
      expect(wrapper.find('.modal-close-btn').exists()).toBe(true)
    })

    it('emits close when X button is clicked', async () => {
      setupSoundboard()
      const wrapper = createWrapper()
      await wrapper.find('.modal-close-btn').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('does NOT emit close on overlay click', async () => {
      setupSoundboard()
      const wrapper = createWrapper()
      await wrapper.find('.modal-overlay').trigger('click')
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('does NOT emit close on Escape', async () => {
      setupSoundboard()
      const wrapper = createWrapper()
      await wrapper.find('.modal-overlay').trigger('keydown', { key: 'Escape' })
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('emits close when Cancel button is clicked', async () => {
      setupSoundboard()
      const wrapper = createWrapper()
      const cancelBtn = wrapper.findAll('.btn').find(b => b.text() === 'Cancel')!
      await cancelBtn.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('partialMode reset', () => {
    it('clears range values when switching to offset mode', async () => {
      setupSoundboard()
      const wrapper = createWrapper()

      // Enable partial
      await wrapper.find('input[type="checkbox"]').setValue(true)
      await nextTick()

      // Switch to range and set values
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      const rangeInputs = wrapper.findAll('input[type="number"]')
      await rangeInputs[0].setValue(1.5)
      await rangeInputs[1].setValue(3.0)
      await nextTick()

      // Switch back to offset
      await wrapper.find('input[type="radio"][value="offset"]').setValue(true)
      await nextTick()

      // Range fields should not be visible (mode is offset)
      expect(wrapper.find('.range-row').exists()).toBe(false)

      // Switch back to range — values should be reset (not cached)
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      const newRangeInputs = wrapper.findAll('input[type="number"]')
      // Values should be empty/reset (no caching in Add modal)
      expect(newRangeInputs[0].element.value).toBe('')
      expect(newRangeInputs[1].element.value).toBe('')
    })

    it('clears offset when switching to range mode', async () => {
      setupSoundboard()
      const wrapper = createWrapper()

      // Enable partial
      await wrapper.find('input[type="checkbox"]').setValue(true)
      await nextTick()

      // Set offset value
      const offsetInput = wrapper.find('input[type="number"]')
      await offsetInput.setValue(2.5)
      await nextTick()

      // Switch to range
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      // Switch back to offset — value should be reset
      await wrapper.find('input[type="radio"][value="offset"]').setValue(true)
      await nextTick()

      const newOffsetInput = wrapper.find('input[type="number"]')
      expect(newOffsetInput.element.value).toBe('')
    })

    it('offset input is only visible in offset mode', async () => {
      setupSoundboard()
      const wrapper = createWrapper()

      await wrapper.find('input[type="checkbox"]').setValue(true)
      await nextTick()

      // Default mode is offset
      expect(wrapper.find('.input-grow').exists()).toBe(true)
      expect(wrapper.find('.range-row').exists()).toBe(false)

      // Switch to range
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      expect(wrapper.find('.range-row').exists()).toBe(true)
      expect(wrapper.find('.input-grow').exists()).toBe(false)
    })
  })

  describe('stem file preview playback', () => {
    function setupStemSoundboard() {
      const store = useSoundboardStore()
      sbId = store.createSoundboard('Test Board', 'desc', 'LIST', 'Default')
      // Note: no file added to library.files — stem paths are NOT in the file list
    }

    function createStemWrapper() {
      return mount(AddToSoundboardModal, {
        props: { filePath: '/sounds/.forgeaudio/stems/htdemucs/mysong/drums.wav' },
      })
    }

    it('renders modal for a stem file path', () => {
      setupStemSoundboard()
      const wrapper = createStemWrapper()
      expect(wrapper.find('.modal-subtitle').text()).toBe('drums.wav')
    })

    it('shows soundboard select for stem files', () => {
      setupStemSoundboard()
      const wrapper = createStemWrapper()
      expect(wrapper.find('select').exists()).toBe(true)
    })

    it('preview button exists when partial is enabled for stem file', async () => {
      setupStemSoundboard()
      const wrapper = createStemWrapper()
      await wrapper.find('input[type="checkbox"]').setValue(true)
      await nextTick()
      expect(wrapper.find('.btn-preview').exists()).toBe(true)
    })

    it('preview playback works for stem file not in library.files', async () => {
      setupStemSoundboard()
      const library = useLibraryStore()
      const wrapper = createStemWrapper()

      // Enable partial with offset
      await wrapper.find('input[type="checkbox"]').setValue(true)
      await nextTick()
      const offsetInput = wrapper.find('input[type="number"]')
      await offsetInput.setValue(1.5)
      await nextTick()

      // Click preview
      await wrapper.find('.btn-preview').trigger('click')
      await nextTick()

      // Verify playback was triggered with virtual file from stem path
      expect(library.currentFile).not.toBeNull()
      expect(library.currentFile!.path).toBe('/sounds/.forgeaudio/stems/htdemucs/mysong/drums.wav')
      expect(library.playbackOffset).toBe(1.5)
    })

    it('preview range playback works for stem file', async () => {
      setupStemSoundboard()
      const library = useLibraryStore()
      const wrapper = createStemWrapper()

      // Enable partial with range
      await wrapper.find('input[type="checkbox"]').setValue(true)
      await nextTick()
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      const rangeInputs = wrapper.findAll('input[type="number"]')
      await rangeInputs[0].setValue(0.5)
      await rangeInputs[1].setValue(2.0)
      await nextTick()

      await wrapper.find('.btn-preview').trigger('click')
      await nextTick()

      expect(library.currentFile).not.toBeNull()
      expect(library.currentFile!.path).toBe('/sounds/.forgeaudio/stems/htdemucs/mysong/drums.wav')
      expect(library.playbackRange).toEqual([0.5, 2.0])
    })
  })

  describe('submission', () => {
    it('Add button is disabled when no soundboard selected', () => {
      setupSoundboard()
      const wrapper = createWrapper()
      const addBtn = wrapper.findAll('.btn').find(b => b.text() === 'Add')!
      expect(addBtn.attributes('disabled')).toBeDefined()
    })

    it('Add button is enabled when soundboard is selected', async () => {
      setupSoundboard()
      const wrapper = createWrapper()
      await wrapper.find('select').setValue(sbId)
      await nextTick()
      const addBtn = wrapper.findAll('.btn').find(b => b.text() === 'Add')!
      expect(addBtn.attributes('disabled')).toBeUndefined()
    })
  })
})
