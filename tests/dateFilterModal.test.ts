import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DateFilterModal from '../src/components/DateFilterModal.vue'
import { _resetLibraryStore, useLibraryStore } from '../src/stores/libraryStore'
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
}

vi.stubGlobal('window', { electronAPI: mockElectronAPI })

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

// Helper: set value on an input and trigger v-model update via native event
function setInputValue(el: HTMLInputElement, value: string) {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('DateFilterModal', () => {
  function mountModal(props: { field: 'createdAt' | 'modifiedAt'; operator: 'on' | 'before' | 'after' } = { field: 'createdAt', operator: 'after' }) {
    return mount(DateFilterModal, { props })
  }

  it('renders with correct title for createdAt after', () => {
    const wrapper = mountModal({ field: 'createdAt', operator: 'after' })
    expect(wrapper.find('h3').text()).toBe('Filter: created after')
  })

  it('renders with correct title for modifiedAt before', () => {
    const wrapper = mountModal({ field: 'modifiedAt', operator: 'before' })
    expect(wrapper.find('h3').text()).toBe('Filter: modified before')
  })

  it('renders with correct title for createdAt on', () => {
    const wrapper = mountModal({ field: 'createdAt', operator: 'on' })
    expect(wrapper.find('h3').text()).toBe('Filter: created on')
  })

  it('has month, day, and year inputs', () => {
    const wrapper = mountModal()
    const inputs = wrapper.findAll('.modal-input')
    expect(inputs).toHaveLength(3)
  })

  it('defaults year to current year', () => {
    const wrapper = mountModal()
    const yearInput = wrapper.findAll('.modal-input')[2]
    expect((yearInput.element as HTMLInputElement).value).toBe(String(new Date().getFullYear()))
  })

  it('Apply button is disabled when month is empty', () => {
    const wrapper = mountModal()
    const applyBtn = wrapper.find('.btn-accent')
    expect((applyBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('Apply button is disabled when day is invalid', async () => {
    const wrapper = mountModal()
    const inputs = wrapper.findAll('.modal-input')
    setInputValue(inputs[0].element as HTMLInputElement, 'February')
    setInputValue(inputs[1].element as HTMLInputElement, '30')
    await nextTick()
    const applyBtn = wrapper.find('.btn-accent')
    expect((applyBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('Apply button is enabled when all fields are valid', async () => {
    const wrapper = mountModal()
    const inputs = wrapper.findAll('.modal-input')
    setInputValue(inputs[0].element as HTMLInputElement, 'February')
    setInputValue(inputs[1].element as HTMLInputElement, '14')
    setInputValue(inputs[2].element as HTMLInputElement, '2025')
    await nextTick()
    const applyBtn = wrapper.find('.btn-accent')
    expect((applyBtn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('emits close on Cancel click', async () => {
    const wrapper = mountModal()
    const cancelBtn = wrapper.findAll('.btn').find(b => b.text() === 'Cancel')!
    ;(cancelBtn.element as HTMLButtonElement).click()
    await nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close on Apply click with valid date', async () => {
    const wrapper = mountModal()
    const inputs = wrapper.findAll('.modal-input')
    setInputValue(inputs[0].element as HTMLInputElement, 'March')
    setInputValue(inputs[1].element as HTMLInputElement, '15')
    setInputValue(inputs[2].element as HTMLInputElement, '2025')
    await nextTick()
    const applyBtn = wrapper.find('.btn-accent')
    ;(applyBtn.element as HTMLButtonElement).click()
    await nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('calls addDateFilter on Apply', async () => {
    const store = useLibraryStore()
    const wrapper = mountModal({ field: 'createdAt', operator: 'after' })
    const inputs = wrapper.findAll('.modal-input')
    setInputValue(inputs[0].element as HTMLInputElement, 'March')
    setInputValue(inputs[1].element as HTMLInputElement, '15')
    setInputValue(inputs[2].element as HTMLInputElement, '2025')
    await nextTick()
    ;(wrapper.find('.btn-accent').element as HTMLButtonElement).click()
    await nextTick()
    expect(store.dateFilters).toHaveLength(1)
    expect(store.dateFilters[0].field).toBe('createdAt')
    expect(store.dateFilters[0].operator).toBe('after')
  })

  it('has role="dialog" and aria-modal from BaseModal', () => {
    const wrapper = mountModal()
    const overlay = wrapper.find('.modal-overlay')
    expect(overlay.attributes('role')).toBe('dialog')
    expect(overlay.attributes('aria-modal')).toBe('true')
  })

  it('has a datalist with 12 month options', () => {
    const wrapper = mountModal()
    const datalist = wrapper.find('#month-list')
    expect(datalist.exists()).toBe(true)
    const options = datalist.findAll('option')
    expect(options).toHaveLength(12)
  })
})
