import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SoundboardItemDataModal from '../src/components/SoundboardItemDataModal.vue'
import { _resetSoundboardStore, useSoundboardStore } from '../src/stores/soundboardStore'
import { _resetLibraryStore, useLibraryStore } from '../src/stores/libraryStore'
import { _resetTagStore, useTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'

// Mock electronAPI
;(window as any).electronAPI = {
  selectDirectory: vi.fn(),
  startScan: vi.fn(),
  onScanProgress: vi.fn(),
  onScanDone: vi.fn(),
  removeScanListeners: vi.fn(),
  readMetadata: vi.fn(),
  writeMetadata: vi.fn().mockResolvedValue(undefined),
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
  createDirectory: vi.fn(),
  resolveDroppedPaths: vi.fn(),
  copyFileToLibrary: vi.fn(),
  onContextMenuAddToSoundboard: vi.fn(),
  onContextMenuQuickAddToSoundboard: vi.fn(),
  onContextMenuQuickTag: vi.fn(),
  showSoundboardItemMenu: vi.fn(),
  onSbItemPlay: vi.fn(),
  onSbItemEdit: vi.fn(),
  onSbItemRemove: vi.fn(),
  onSbItemViewData: vi.fn(),
  startDrag: vi.fn(),
}

let sbId: string
let itemId: string

function setupTestData(options: {
  partial?: boolean
  offset?: number
  range?: [number, number]
  fileOverrides?: Record<string, any>
} = {}) {
  const store = useSoundboardStore()
  const library = useLibraryStore()

  sbId = store.createSoundboard('Test Board', 'A test soundboard', 'LIST', 'Default')
  itemId = `sbi_test_1`
  store.addItem(sbId, {
    id: itemId,
    name: 'kick.wav',
    filePath: '/sounds/kick.wav',
    duration: 2.5,
    partial: options.partial,
    offset: options.offset,
    range: options.range,
  })

  // Add a matching file to the library
  library.files.push({
    path: '/sounds/kick.wav',
    name: 'kick.wav',
    extension: '.wav',
    size: 48000,
    duration: 2.5,
    tags: [],
    description: '',
    lastPlayed: null,
    createdAt: null,
    modifiedAt: null,
    ...options.fileOverrides,
  })
}

function createWrapper(soundboardId?: string, itemIdOverride?: string) {
  return mount(SoundboardItemDataModal, {
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
  vi.clearAllMocks()
})

describe('SoundboardItemDataModal', () => {
  it('renders modal with correct title', () => {
    setupTestData()
    const wrapper = createWrapper()
    expect(wrapper.find('h3').text()).toBe('Soundboard Item Data')
  })

  it('shows audio file metadata (name, path, extension)', () => {
    setupTestData()
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 0: Filename, Row 1: Path, Row 2: Format
    expect(rows[0].text()).toBe('kick.wav')
    expect(rows[1].text()).toBe('/sounds/kick.wav')
    expect(rows[2].text()).toBe('.wav')
  })

  it('shows formatted file size using formatBytes', () => {
    setupTestData({ fileOverrides: { size: 1048576 } })
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 3: Size
    expect(rows[3].text()).toBe('1.00 MB')
  })

  it('shows formatted duration (mm:ss)', () => {
    setupTestData({ fileOverrides: { duration: 125 } })
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 4: Duration
    expect(rows[4].text()).toBe('2:05')
  })

  it('shows tags as TagChip components', () => {
    setupTestData({ fileOverrides: { tags: ['percussion', 'bass'] } })
    const tagStore = useTagStore()
    tagStore.createTag('percussion', '#ff0000')
    tagStore.createTag('bass', '#00ff00')
    const wrapper = createWrapper()
    const tagChips = wrapper.findAll('.tag-chip')
    expect(tagChips.length).toBe(2)
  })

  it('shows dash when description is empty', () => {
    setupTestData({ fileOverrides: { description: '' } })
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 6: Description
    expect(rows[6].text()).toBe('—')
  })

  it('shows description when present', () => {
    setupTestData({ fileOverrides: { description: 'A punchy kick drum' } })
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    expect(rows[6].text()).toBe('A punchy kick drum')
  })

  it('shows formatted created date', () => {
    setupTestData({ fileOverrides: { createdAt: '2024-06-15T12:00:00Z' } })
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 7: Created
    expect(rows[7].text()).toContain('2024')
  })

  it('shows formatted modified date', () => {
    setupTestData({ fileOverrides: { modifiedAt: '2026-01-20T08:30:00Z' } })
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 8: Modified
    expect(rows[8].text()).toContain('2026')
  })

  it('shows dash when lastPlayed is null', () => {
    setupTestData({ fileOverrides: { lastPlayed: null } })
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 9: Last Played
    expect(rows[9].text()).toBe('—')
  })

  it('shows last played when set', () => {
    setupTestData({ fileOverrides: { lastPlayed: '2026-02-24T10:00:00Z' } })
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    expect(rows[9].text()).toContain('2026')
  })

  it('shows soundboard item display name', () => {
    setupTestData()
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 10: Display Name (in soundboard item section)
    expect(rows[10].text()).toBe('kick.wav')
  })

  it('shows parent soundboard name', () => {
    setupTestData()
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 11: Soundboard
    expect(rows[11].text()).toBe('Test Board')
  })

  it('shows "Partial: Enabled" when item.partial is true', () => {
    setupTestData({ partial: true, offset: 0.5 })
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 12: Partial Playback
    expect(rows[12].text()).toBe('Enabled')
  })

  it('shows "Partial: Disabled" when item.partial is false', () => {
    setupTestData({ partial: false })
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    expect(rows[12].text()).toBe('Disabled')
  })

  it('shows offset value when set', () => {
    setupTestData({ partial: true, offset: 1.5 })
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 13: Offset
    expect(rows[13].text()).toBe('1.5s')
  })

  it('shows dash for offset when not set', () => {
    setupTestData()
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    expect(rows[13].text()).toBe('—')
  })

  it('shows range values when set', () => {
    setupTestData({ partial: true, range: [0.5, 2.0] })
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 14: Range
    expect(rows[14].text()).toBe('[0.5s, 2s]')
  })

  it('shows dash for range when not set', () => {
    setupTestData()
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    expect(rows[14].text()).toBe('—')
  })

  it('shows item duration formatted', () => {
    setupTestData()
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.data-row dd')
    // Row 15: Item Duration
    expect(rows[15].text()).toBe('0:02')
  })

  it('emits close when BaseModal emits close', async () => {
    setupTestData()
    const wrapper = createWrapper()
    await wrapper.find('.modal-overlay').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
