import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import EditSoundboardItemModal from '../src/components/EditSoundboardItemModal.vue'
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
const itemId = 'sbi_test_1'

function setupTestData(options: {
  partial?: boolean
  offset?: number
  range?: [number, number]
} = {}) {
  const store = useSoundboardStore()
  const library = useLibraryStore()

  sbId = store.createSoundboard('Test Board', 'desc', 'LIST', 'Default')
  store.addItem(sbId, {
    id: itemId,
    name: 'kick.wav',
    filePath: '/sounds/kick.wav',
    duration: 10,
    partial: options.partial,
    offset: options.offset,
    range: options.range,
  })

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

function createWrapper(soundboardId?: string, itemIdOverride?: string) {
  return mount(EditSoundboardItemModal, {
    props: {
      soundboardId: soundboardId ?? sbId,
      itemId: itemIdOverride ?? itemId,
    },
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

describe('EditSoundboardItemModal', () => {
  describe('rendering', () => {
    it('renders modal with correct title', () => {
      setupTestData()
      const wrapper = createWrapper()
      expect(wrapper.find('h3').text()).toBe('Edit Sound')
    })

    it('shows item name in subtitle', async () => {
      setupTestData()
      const wrapper = createWrapper()
      await nextTick()
      expect(wrapper.find('.modal-subtitle').text()).toBe('kick.wav')
    })

    it('pre-fills name input from item', async () => {
      setupTestData()
      const wrapper = createWrapper()
      await nextTick()
      const input = wrapper.find('input[type="text"]')
      expect(input.element.value).toBe('kick.wav')
    })

    it('pre-fills partial toggle from item with offset', async () => {
      setupTestData({ partial: true, offset: 1.5 })
      const wrapper = createWrapper()
      await nextTick()
      const checkbox = wrapper.find('input[type="checkbox"]')
      expect(checkbox.element.checked).toBe(true)
    })

    it('pre-fills offset mode and value from item', async () => {
      setupTestData({ partial: true, offset: 2.5 })
      const wrapper = createWrapper()
      await nextTick()

      const offsetRadio = wrapper.find('input[type="radio"][value="offset"]')
      expect((offsetRadio.element as HTMLInputElement).checked).toBe(true)

      const numberInput = wrapper.find('input[type="number"]')
      expect(numberInput.element.value).toBe('2.5')
    })

    it('pre-fills range mode and values from item', async () => {
      setupTestData({ partial: true, range: [1.0, 5.0] })
      const wrapper = createWrapper()
      await nextTick()

      const rangeRadio = wrapper.find('input[type="radio"][value="range"]')
      expect((rangeRadio.element as HTMLInputElement).checked).toBe(true)

      const numberInputs = wrapper.findAll('input[type="number"]')
      expect(numberInputs[0].element.value).toBe('1')
      expect(numberInputs[1].element.value).toBe('5')
    })
  })

  describe('close behavior', () => {
    it('has fixed width of 80%', () => {
      setupTestData()
      const wrapper = createWrapper()
      const modal = wrapper.find('.modal')
      expect(modal.attributes('style')).toContain('width: 80%')
    })

    it('renders X close button', () => {
      setupTestData()
      const wrapper = createWrapper()
      expect(wrapper.find('.modal-close-btn').exists()).toBe(true)
    })

    it('emits close when X button is clicked', async () => {
      setupTestData()
      const wrapper = createWrapper()
      await wrapper.find('.modal-close-btn').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('does NOT emit close on overlay click', async () => {
      setupTestData()
      const wrapper = createWrapper()
      await wrapper.find('.modal-overlay').trigger('click')
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('does NOT emit close on Escape', async () => {
      setupTestData()
      const wrapper = createWrapper()
      await wrapper.find('.modal-overlay').trigger('keydown', { key: 'Escape' })
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('emits close when Cancel button is clicked', async () => {
      setupTestData()
      const wrapper = createWrapper()
      const cancelBtn = wrapper.findAll('.btn').find(b => b.text() === 'Cancel')!
      await cancelBtn.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('region caching — offset item', () => {
    it('caches offset when switching to range, restores on switch back', async () => {
      setupTestData({ partial: true, offset: 3.0 })
      const wrapper = createWrapper()
      await nextTick()

      // Verify initial offset value
      let offsetInput = wrapper.find('input[type="number"]')
      expect(offsetInput.element.value).toBe('3')

      // Switch to range
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      // Range inputs should be empty (no cached range)
      const rangeInputs = wrapper.findAll('input[type="number"]')
      expect(rangeInputs[0].element.value).toBe('')
      expect(rangeInputs[1].element.value).toBe('')

      // Set range values
      await rangeInputs[0].setValue(1.0)
      await rangeInputs[1].setValue(4.0)
      await nextTick()

      // Switch back to offset — should restore cached offset of 3.0
      await wrapper.find('input[type="radio"][value="offset"]').setValue(true)
      await nextTick()

      offsetInput = wrapper.find('input[type="number"]')
      expect(offsetInput.element.value).toBe('3')
    })

    it('caches range when switching away, restores on switch back', async () => {
      setupTestData({ partial: true, offset: 3.0 })
      const wrapper = createWrapper()
      await nextTick()

      // Switch to range, fill in values
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      let rangeInputs = wrapper.findAll('input[type="number"]')
      await rangeInputs[0].setValue(2.0)
      await rangeInputs[1].setValue(6.0)
      await nextTick()

      // Switch to offset
      await wrapper.find('input[type="radio"][value="offset"]').setValue(true)
      await nextTick()

      // Switch back to range — should restore 2.0 and 6.0
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      rangeInputs = wrapper.findAll('input[type="number"]')
      expect(rangeInputs[0].element.value).toBe('2')
      expect(rangeInputs[1].element.value).toBe('6')
    })
  })

  describe('region caching — range item', () => {
    it('caches range when switching to offset, restores on switch back', async () => {
      setupTestData({ partial: true, range: [1.5, 7.0] })
      const wrapper = createWrapper()
      await nextTick()

      // Verify initial range values
      let rangeInputs = wrapper.findAll('input[type="number"]')
      expect(rangeInputs[0].element.value).toBe('1.5')
      expect(rangeInputs[1].element.value).toBe('7')

      // Switch to offset
      await wrapper.find('input[type="radio"][value="offset"]').setValue(true)
      await nextTick()

      // Offset should be empty (no cached offset)
      let offsetInput = wrapper.find('input[type="number"]')
      expect(offsetInput.element.value).toBe('')

      // Set an offset
      await offsetInput.setValue(5.0)
      await nextTick()

      // Switch back to range — should restore 1.5 and 7.0
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      rangeInputs = wrapper.findAll('input[type="number"]')
      expect(rangeInputs[0].element.value).toBe('1.5')
      expect(rangeInputs[1].element.value).toBe('7')
    })

    it('caches offset set during edit, restores on switch back', async () => {
      setupTestData({ partial: true, range: [1.0, 5.0] })
      const wrapper = createWrapper()
      await nextTick()

      // Switch to offset, set a value
      await wrapper.find('input[type="radio"][value="offset"]').setValue(true)
      await nextTick()

      const offsetInput = wrapper.find('input[type="number"]')
      await offsetInput.setValue(4.0)
      await nextTick()

      // Switch to range
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      // Switch back to offset — should restore 4.0
      await wrapper.find('input[type="radio"][value="offset"]').setValue(true)
      await nextTick()

      const restoredInput = wrapper.find('input[type="number"]')
      expect(restoredInput.element.value).toBe('4')
    })
  })

  describe('region caching — no partial item', () => {
    it('starts with empty values when item has no partial data', async () => {
      setupTestData()
      const wrapper = createWrapper()
      await nextTick()

      // Enable partial
      await wrapper.find('input[type="checkbox"]').setValue(true)
      await nextTick()

      // Default mode is offset, value should be empty
      const offsetInput = wrapper.find('input[type="number"]')
      expect(offsetInput.element.value).toBe('')

      // Switch to range — also empty
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      const rangeInputs = wrapper.findAll('input[type="number"]')
      expect(rangeInputs[0].element.value).toBe('')
      expect(rangeInputs[1].element.value).toBe('')
    })

    it('caches values entered in each mode during new partial setup', async () => {
      setupTestData()
      const wrapper = createWrapper()
      await nextTick()

      // Enable partial
      await wrapper.find('input[type="checkbox"]').setValue(true)
      await nextTick()

      // Set offset
      const offsetInput = wrapper.find('input[type="number"]')
      await offsetInput.setValue(2.0)
      await nextTick()

      // Switch to range, set values
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      const rangeInputs = wrapper.findAll('input[type="number"]')
      await rangeInputs[0].setValue(1.0)
      await rangeInputs[1].setValue(8.0)
      await nextTick()

      // Switch back to offset — should restore 2.0
      await wrapper.find('input[type="radio"][value="offset"]').setValue(true)
      await nextTick()

      const restoredOffset = wrapper.find('input[type="number"]')
      expect(restoredOffset.element.value).toBe('2')

      // Switch to range again — should restore 1.0 and 8.0
      await wrapper.find('input[type="radio"][value="range"]').setValue(true)
      await nextTick()

      const restoredRange = wrapper.findAll('input[type="number"]')
      expect(restoredRange[0].element.value).toBe('1')
      expect(restoredRange[1].element.value).toBe('8')
    })
  })

  describe('stem file preview playback', () => {
    const stemItemId = 'sbi_stem_1'

    function setupStemItem(options: { partial?: boolean; offset?: number; range?: [number, number] } = {}) {
      const store = useSoundboardStore()
      sbId = store.createSoundboard('Test Board', 'desc', 'LIST', 'Default')
      store.addItem(sbId, {
        id: stemItemId,
        name: 'mysong_drums.wav',
        filePath: '/sounds/.forgeaudio/stems/htdemucs/mysong/drums.wav',
        duration: 10,
        partial: options.partial,
        offset: options.offset,
        range: options.range,
      })
      // Note: NO file added to library.files — stem paths are not in the library
    }

    it('pre-fills name from stem soundboard item', async () => {
      setupStemItem()
      const wrapper = createWrapper(sbId, stemItemId)
      await nextTick()
      const input = wrapper.find('input[type="text"]')
      expect(input.element.value).toBe('mysong_drums.wav')
    })

    it('preview button exists when partial is enabled for stem item', async () => {
      setupStemItem({ partial: true, offset: 1.0 })
      const wrapper = createWrapper(sbId, stemItemId)
      await nextTick()
      expect(wrapper.find('.btn-preview').exists()).toBe(true)
    })

    it('preview offset playback works for stem item not in library.files', async () => {
      setupStemItem({ partial: true, offset: 2.0 })
      const library = useLibraryStore()
      const wrapper = createWrapper(sbId, stemItemId)
      await nextTick()

      await wrapper.find('.btn-preview').trigger('click')
      await nextTick()

      // Verify playback was triggered with virtual file from stem path
      expect(library.currentFile).not.toBeNull()
      expect(library.currentFile!.path).toBe('/sounds/.forgeaudio/stems/htdemucs/mysong/drums.wav')
      expect(library.playbackOffset).toBe(2.0)
    })

    it('preview range playback works for stem item not in library.files', async () => {
      setupStemItem({ partial: true, range: [1.0, 5.0] })
      const library = useLibraryStore()
      const wrapper = createWrapper(sbId, stemItemId)
      await nextTick()

      await wrapper.find('.btn-preview').trigger('click')
      await nextTick()

      expect(library.currentFile).not.toBeNull()
      expect(library.currentFile!.path).toBe('/sounds/.forgeaudio/stems/htdemucs/mysong/drums.wav')
      expect(library.playbackRange).toEqual([1.0, 5.0])
    })
  })

  describe('submission', () => {
    it('Save button is disabled when name is empty', async () => {
      setupTestData()
      const wrapper = createWrapper()
      await nextTick()

      const nameInput = wrapper.find('input[type="text"]')
      await nameInput.setValue('')
      await nextTick()

      const saveBtn = wrapper.findAll('.btn').find(b => b.text() === 'Save')!
      expect(saveBtn.attributes('disabled')).toBeDefined()
    })

    it('Save button is enabled when name is filled', async () => {
      setupTestData()
      const wrapper = createWrapper()
      await nextTick()
      const saveBtn = wrapper.findAll('.btn').find(b => b.text() === 'Save')!
      expect(saveBtn.attributes('disabled')).toBeUndefined()
    })
  })
})
