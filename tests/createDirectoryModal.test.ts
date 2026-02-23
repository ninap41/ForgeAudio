import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CreateDirectoryModal from '../src/components/CreateDirectoryModal.vue'
import { useLibraryStore, _resetLibraryStore } from '../src/stores/libraryStore'
import { _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'
import { _resetSettingsStore } from '../src/stores/settingsStore'

const mockAPI = {
  writeMetadata: vi.fn().mockResolvedValue(undefined),
  selectDirectory: vi.fn(),
  startScan: vi.fn(),
  onScanProgress: vi.fn(),
  onScanDone: vi.fn(),
  removeScanListeners: vi.fn(),
  readMetadata: vi.fn().mockResolvedValue('{"version":1,"files":{},"tags":{}}'),
  getAudioDuration: vi.fn(),
  showInFinder: vi.fn(),
  copyPath: vi.fn(),
  showContextMenu: vi.fn(),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
  createDirectory: vi.fn().mockResolvedValue({ path: '/home/user/NewFolder' }),
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
  backupCreate: vi.fn().mockResolvedValue({}),
  backupList: vi.fn().mockResolvedValue([]),
  backupDelete: vi.fn().mockResolvedValue(undefined),
  backupRestore: vi.fn(),
  saveFileDialog: vi.fn(),
  selectFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}
;(window as any).electronAPI = mockAPI

beforeEach(() => {
  _resetLibraryStore()
  _resetTagStore()
  _resetThemeStore()
  _resetSettingsStore()
  vi.resetAllMocks()
  mockAPI.writeMetadata.mockResolvedValue(undefined)
  mockAPI.readMetadata.mockResolvedValue('{"version":1,"files":{},"tags":{}}')
  mockAPI.createDirectory.mockResolvedValue({ path: '/home/user/NewFolder' })
  mockAPI.backupCreate.mockResolvedValue({})
})

describe('CreateDirectoryModal', () => {
  it('renders title and subtitle', () => {
    const wrapper = mount(CreateDirectoryModal)

    expect(wrapper.find('h3').text()).toBe('Create New Folder')
    expect(wrapper.find('.modal-subtitle').text()).toContain('Create a new audio folder')
  })

  it('disables Create button when folder name is empty', () => {
    const wrapper = mount(CreateDirectoryModal)

    const createBtn = wrapper.find('.btn-accent')
    expect((createBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables Create button when parent path is empty', async () => {
    const wrapper = mount(CreateDirectoryModal)

    await wrapper.find('input[placeholder="My Audio Library"]').setValue('TestFolder')

    const createBtn = wrapper.find('.btn-accent')
    expect((createBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('Browse button calls selectDirectory and sets path', async () => {
    mockAPI.selectDirectory.mockResolvedValue('/home/user')

    const wrapper = mount(CreateDirectoryModal)
    const browseBtn = wrapper.findAll('.btn').find(b => b.text() === 'Browse')!
    await browseBtn.trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(mockAPI.selectDirectory).toHaveBeenCalled()
    const pathInput = wrapper.find('.path-input')
    expect((pathInput.element as HTMLInputElement).value).toBe('/home/user')
  })

  it('shows error when directory already exists', async () => {
    mockAPI.selectDirectory.mockResolvedValue('/home/user')
    mockAPI.createDirectory.mockResolvedValue({ error: 'A folder with this name already exists at this location' })

    const wrapper = mount(CreateDirectoryModal)

    // Set folder name
    await wrapper.find('input[placeholder="My Audio Library"]').setValue('ExistingFolder')

    // Browse for parent
    const browseBtn = wrapper.findAll('.btn').find(b => b.text() === 'Browse')!
    await browseBtn.trigger('click')
    await new Promise(r => setTimeout(r, 0))

    // Submit
    await wrapper.find('.btn-accent').trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.find('.modal-error').text()).toContain('already exists')
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('creates directory and sets as root on success', async () => {
    mockAPI.selectDirectory.mockResolvedValue('/home/user')
    mockAPI.createDirectory.mockResolvedValue({ path: '/home/user/NewFolder' })

    // Mock scan flow for rescan
    mockAPI.onScanDone.mockImplementation((cb: () => void) => cb())

    const wrapper = mount(CreateDirectoryModal)

    // Set folder name
    await wrapper.find('input[placeholder="My Audio Library"]').setValue('NewFolder')

    // Browse for parent
    const browseBtn = wrapper.findAll('.btn').find(b => b.text() === 'Browse')!
    await browseBtn.trigger('click')
    await new Promise(r => setTimeout(r, 0))

    // Submit
    await wrapper.find('.btn-accent').trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(mockAPI.createDirectory).toHaveBeenCalledWith('/home/user', 'NewFolder')
    expect(mockAPI.setRootDirectory).toHaveBeenCalledWith('/home/user/NewFolder')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close on Cancel', async () => {
    const wrapper = mount(CreateDirectoryModal)

    const cancelBtn = wrapper.findAll('.btn').find(b => b.text() === 'Cancel')!
    await cancelBtn.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('has ARIA dialog attributes', () => {
    const wrapper = mount(CreateDirectoryModal)

    const overlay = wrapper.find('.modal-overlay')
    expect(overlay.attributes('role')).toBe('dialog')
    expect(overlay.attributes('aria-modal')).toBe('true')
    expect(overlay.attributes('aria-label')).toBe('Create New Folder')
  })
})
