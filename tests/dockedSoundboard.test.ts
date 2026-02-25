import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DockedSoundboardContainer from '../src/components/DockedSoundboardContainer.vue'
import { _resetSoundboardStore, useSoundboardStore } from '../src/stores/soundboardStore'
import { _resetLibraryStore } from '../src/stores/libraryStore'
import { _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'

// Mock window.electronAPI
const mockElectronAPI = {
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
  backupCreate: vi.fn().mockResolvedValue({ filename: 'backup.json' }),
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

;(window as any).electronAPI = mockElectronAPI

function createWrapper() {
  return mount(DockedSoundboardContainer)
}

describe('DockedSoundboardContainer', () => {
  beforeEach(() => {
    _resetSoundboardStore()
    _resetLibraryStore()
    _resetTagStore()
    _resetThemeStore()
    vi.clearAllMocks()
  })

  it('renders nothing when no enabled soundboards', () => {
    const store = useSoundboardStore()
    store.createSoundboard('X', '', 'LIST', 'Default')
    const wrapper = createWrapper()
    expect(wrapper.find('.docked-container').exists()).toBe(false)
  })

  it('renders container when soundboards are enabled', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'LIST', 'Default')
    store.toggleEnabled(id)
    const wrapper = createWrapper()
    expect(wrapper.find('.docked-container').exists()).toBe(true)
  })

  it('renders a DockPanel for each enabled soundboard', () => {
    const store = useSoundboardStore()
    const id1 = store.createSoundboard('A', '', 'LIST', 'Default')
    const id2 = store.createSoundboard('B', '', 'LIST', 'Default')
    store.createSoundboard('C', '', 'LIST', 'Default') // not enabled
    store.toggleEnabled(id1)
    store.toggleEnabled(id2)
    const wrapper = createWrapper()
    const panels = wrapper.findAll('.dock-panel')
    expect(panels).toHaveLength(2)
  })

  it('passes correct title to DockPanel', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('My Board', '', 'LIST', 'Default')
    store.toggleEnabled(id)
    const wrapper = createWrapper()
    expect(wrapper.find('.dock-panel-title').text()).toBe('My Board')
  })

  it('shows SoundboardListView for LIST layout', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'LIST', 'Default')
    store.toggleEnabled(id)
    const wrapper = createWrapper()
    expect(wrapper.find('.sb-list-view').exists()).toBe(true)
    expect(wrapper.find('.sb-grid-view').exists()).toBe(false)
  })

  it('shows SoundboardGridView for GRID layout', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'GRID', 'Default')
    store.toggleEnabled(id)
    const wrapper = createWrapper()
    expect(wrapper.find('.sb-grid-view').exists()).toBe(true)
    expect(wrapper.find('.sb-list-view').exists()).toBe(false)
  })

  it('shows empty state text in list view when no items', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'LIST', 'Default')
    store.toggleEnabled(id)
    const wrapper = createWrapper()
    expect(wrapper.find('.sb-empty-text').text()).toContain('Drag files here')
  })

  it('shows empty state text in grid view when no items', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'GRID', 'Default')
    store.toggleEnabled(id)
    const wrapper = createWrapper()
    expect(wrapper.find('.sb-empty-text').text()).toContain('Drag files here')
  })

  it('renders items in list view', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'LIST', 'Default')
    store.addItem(id, { id: 'i1', name: 'kick.wav', filePath: '/kick.wav', duration: 1.5 })
    store.addItem(id, { id: 'i2', name: 'snare.wav', filePath: '/snare.wav', duration: 2 })
    store.toggleEnabled(id)
    const wrapper = createWrapper()
    const items = wrapper.findAll('.sb-item-name')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toBe('kick.wav')
    expect(items[1].text()).toBe('snare.wav')
  })

  it('renders items in grid view', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'GRID', 'Default')
    store.addItem(id, { id: 'i1', name: 'kick.wav', filePath: '/kick.wav', duration: 1.5 })
    store.toggleEnabled(id)
    const wrapper = createWrapper()
    const pads = wrapper.findAll('.sb-pad')
    expect(pads).toHaveLength(1)
    expect(wrapper.find('.sb-pad-name').text()).toBe('kick.wav')
  })

  it('shows duration in list view items', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'LIST', 'Default')
    store.addItem(id, { id: 'i1', name: 'kick.wav', filePath: '/kick.wav', duration: 65 })
    store.toggleEnabled(id)
    const wrapper = createWrapper()
    expect(wrapper.find('.sb-item-duration').text()).toBe('1:05')
  })

  it('panel collapses when state is minimized', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'LIST', 'Default')
    store.toggleEnabled(id)
    store.toggleState(id) // → minimized
    const wrapper = createWrapper()
    expect(wrapper.find('.dock-panel--collapsed').exists()).toBe(true)
    expect(wrapper.find('.dock-panel-body').exists()).toBe(false)
  })

  it('shows SoundboardTableView for TABLE layout', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'TABLE', 'Default')
    store.toggleEnabled(id)
    const wrapper = createWrapper()
    expect(wrapper.find('.sb-table-view').exists()).toBe(true)
    expect(wrapper.find('.sb-list-view').exists()).toBe(false)
    expect(wrapper.find('.sb-grid-view').exists()).toBe(false)
  })

  it('renders view toggle buttons in panel header', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'LIST', 'Default')
    store.toggleEnabled(id)
    const wrapper = createWrapper()
    const toggleBtns = wrapper.findAll('.view-toggle-btn')
    expect(toggleBtns).toHaveLength(3)
  })

  it('highlights active layout toggle button', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'GRID', 'Default')
    store.toggleEnabled(id)
    const wrapper = createWrapper()
    const activeBtns = wrapper.findAll('.view-toggle-btn--active')
    expect(activeBtns).toHaveLength(1)
  })

  it('registers onSbItemViewData IPC listener on mount', () => {
    const store = useSoundboardStore()
    const id = store.createSoundboard('X', '', 'LIST', 'Default')
    store.toggleEnabled(id)
    createWrapper()
    expect(mockElectronAPI.onSbItemViewData).toHaveBeenCalledTimes(1)
    expect(typeof mockElectronAPI.onSbItemViewData.mock.calls[0][0]).toBe('function')
  })
})
