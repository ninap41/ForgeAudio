import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SoundboardDrawer from '../src/components/SoundboardDrawer.vue'
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
}

;(window as any).electronAPI = mockElectronAPI

function createWrapper() {
  return mount(SoundboardDrawer)
}

describe('SoundboardDrawer', () => {
  beforeEach(() => {
    _resetSoundboardStore()
    _resetLibraryStore()
    _resetTagStore()
    _resetThemeStore()
    vi.clearAllMocks()
  })

  describe('create form', () => {
    it('renders name input', () => {
      const wrapper = createWrapper()
      const inputs = wrapper.findAll('.drawer-input')
      expect(inputs.length).toBeGreaterThanOrEqual(1)
      expect(inputs[0].attributes('placeholder')).toBe('Name *')
    })

    it('renders description input', () => {
      const wrapper = createWrapper()
      const inputs = wrapper.findAll('.drawer-input')
      expect(inputs[1].attributes('placeholder')).toBe('Description (optional)')
    })

    it('renders layout select with LIST and GRID options', () => {
      const wrapper = createWrapper()
      const select = wrapper.find('.drawer-select')
      expect(select.exists()).toBe(true)
      const options = select.findAll('option')
      expect(options.map(o => o.text())).toEqual(['List', 'Grid'])
    })

    it('renders Create button', () => {
      const wrapper = createWrapper()
      const btn = wrapper.find('.btn-accent')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toBe('Create')
    })

    it('Create button is disabled when name is empty', () => {
      const wrapper = createWrapper()
      const btn = wrapper.find('.btn-accent')
      expect(btn.attributes('disabled')).toBeDefined()
    })

    it('Create button is enabled when name is filled', async () => {
      const wrapper = createWrapper()
      const input = wrapper.findAll('.drawer-input')[0]
      await input.setValue('My Board')
      const btn = wrapper.find('.btn-accent')
      expect(btn.attributes('disabled')).toBeUndefined()
    })

    it('creates soundboard on Create click', async () => {
      const wrapper = createWrapper()
      await wrapper.findAll('.drawer-input')[0].setValue('New Board')
      await wrapper.find('.btn-accent').trigger('click')
      // Wait for async saveMetadata
      await vi.dynamicImportSettled()
      const store = useSoundboardStore()
      expect(store.allSoundboards).toHaveLength(1)
      expect(store.allSoundboards[0].name).toBe('New Board')
    })

    it('creates soundboard on Enter key', async () => {
      const wrapper = createWrapper()
      await wrapper.findAll('.drawer-input')[0].setValue('Enter Board')
      await wrapper.findAll('.drawer-input')[0].trigger('keydown.enter')
      await vi.dynamicImportSettled()
      const store = useSoundboardStore()
      expect(store.allSoundboards).toHaveLength(1)
      expect(store.allSoundboards[0].name).toBe('Enter Board')
    })

    it('clears form after creation', async () => {
      const wrapper = createWrapper()
      await wrapper.findAll('.drawer-input')[0].setValue('Board')
      await wrapper.findAll('.drawer-input')[1].setValue('Desc')
      await wrapper.find('.btn-accent').trigger('click')
      await vi.dynamicImportSettled()
      expect((wrapper.findAll('.drawer-input')[0].element as HTMLInputElement).value).toBe('')
      expect((wrapper.findAll('.drawer-input')[1].element as HTMLInputElement).value).toBe('')
    })

    it('does not create with empty name', async () => {
      const wrapper = createWrapper()
      await wrapper.findAll('.drawer-input')[0].setValue('   ')
      await wrapper.findAll('.drawer-input')[0].trigger('keydown.enter')
      await vi.dynamicImportSettled()
      const store = useSoundboardStore()
      expect(store.allSoundboards).toHaveLength(0)
    })
  })

  describe('soundboard list', () => {
    it('shows empty message when no soundboards for profile', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.empty-msg').text()).toBe('No soundboards for this profile')
    })

    it('renders existing soundboards', async () => {
      const store = useSoundboardStore()
      store.createSoundboard('Board A', 'desc A', 'LIST', 'Default')
      store.createSoundboard('Board B', '', 'GRID', 'Default')
      const wrapper = createWrapper()
      const names = wrapper.findAll('.sb-name').map(n => n.text())
      expect(names).toEqual(['Board A', 'Board B'])
    })

    it('shows description when present', () => {
      const store = useSoundboardStore()
      store.createSoundboard('X', 'My desc', 'LIST', 'Default')
      const wrapper = createWrapper()
      expect(wrapper.find('.sb-description').text()).toBe('My desc')
    })

    it('shows layout indicator', () => {
      const store = useSoundboardStore()
      store.createSoundboard('X', '', 'GRID', 'Default')
      const wrapper = createWrapper()
      expect(wrapper.find('.sb-layout-badge').text()).toBe('GRID')
    })

    it('shows item count', () => {
      const store = useSoundboardStore()
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.addItem(id, { id: 'i1', name: 'a.wav', filePath: '/a.wav', duration: 1 })
      store.addItem(id, { id: 'i2', name: 'b.wav', filePath: '/b.wav', duration: 2 })
      const wrapper = createWrapper()
      expect(wrapper.find('.sb-item-count').text()).toBe('2 items')
    })

    it('shows singular "item" for count of 1', () => {
      const store = useSoundboardStore()
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.addItem(id, { id: 'i1', name: 'a.wav', filePath: '/a.wav', duration: 1 })
      const wrapper = createWrapper()
      expect(wrapper.find('.sb-item-count').text()).toBe('1 item')
    })
  })

  describe('enable toggle', () => {
    it('calls toggleSoundboardEnabled on click', async () => {
      const store = useSoundboardStore()
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      const wrapper = createWrapper()
      const dockBtn = wrapper.find('.sb-action-btn')
      await dockBtn.trigger('click')
      await vi.dynamicImportSettled()
      // After toggle, the soundboard should be enabled
      expect(store.allSoundboards[0].enabled).toBe(true)
    })

    it('shows active class when enabled', () => {
      const store = useSoundboardStore()
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.toggleEnabled(id)
      const wrapper = createWrapper()
      expect(wrapper.find('.sb-action-btn--active').exists()).toBe(true)
    })
  })

  describe('delete', () => {
    it('deletes soundboard on delete button click', async () => {
      const store = useSoundboardStore()
      store.createSoundboard('X', '', 'LIST', 'Default')
      const wrapper = createWrapper()
      const deleteBtn = wrapper.find('.sb-action-btn--danger')
      await deleteBtn.trigger('click')
      await vi.dynamicImportSettled()
      expect(store.allSoundboards).toHaveLength(0)
    })
  })

  describe('close', () => {
    it('emits close on backdrop click', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.drawer-backdrop').trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('emits close on close button click', async () => {
      const wrapper = createWrapper()
      await wrapper.find('.drawer-close-btn').trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })
})
