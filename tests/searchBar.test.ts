import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchBar from '../src/components/SearchBar.vue'
import { useLibraryStore, _resetLibraryStore } from '../src/stores/libraryStore'
import { useTagStore, _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'

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
  startDrag: vi.fn(),
  startDragFiles: vi.fn(),
  showBulkContextMenu: vi.fn(),
  showDateContextMenu: vi.fn(),
  backupCreate: vi.fn().mockResolvedValue(undefined),
  backupList: vi.fn().mockResolvedValue([]),
  backupDelete: vi.fn().mockResolvedValue(undefined),
}
;(window as any).electronAPI = mockElectronAPI

beforeEach(() => {
  _resetLibraryStore()
  _resetTagStore()
  _resetThemeStore()
})

describe('SearchBar', () => {
  it('renders the search input', () => {
    const wrapper = mount(SearchBar)
    expect(wrapper.find('.search-input').exists()).toBe(true)
  })

  it('supports typing into the input', async () => {
    const wrapper = mount(SearchBar)
    const input = wrapper.find('.search-input')
    await input.setValue('kick')
    const library = useLibraryStore()
    expect(library.searchQuery).toBe('kick')
  })

  it('supports paste into the search input', async () => {
    const wrapper = mount(SearchBar)
    const input = wrapper.find<HTMLInputElement>('.search-input')

    // Simulate a paste event with clipboard data
    const pasteData = 'pasted text'
    const clipboardData = new DataTransfer()
    clipboardData.setData('text/plain', pasteData)

    // Set value as if pasted (browsers insert text on paste)
    await input.setValue(pasteData)
    input.element.dispatchEvent(new ClipboardEvent('paste', { clipboardData }))

    const library = useLibraryStore()
    expect(library.searchQuery).toBe('pasted text')
  })

  it('supports copy from the search input', async () => {
    const wrapper = mount(SearchBar)
    const library = useLibraryStore()
    library.searchQuery = 'text to copy'
    await wrapper.vm.$nextTick()

    const input = wrapper.find<HTMLInputElement>('.search-input')
    expect(input.element.value).toBe('text to copy')

    // Select all text and trigger copy
    input.element.setSelectionRange(0, input.element.value.length)
    const copyEvent = new ClipboardEvent('copy', { bubbles: true })
    input.element.dispatchEvent(copyEvent)

    // The input value should remain unchanged after copy
    expect(input.element.value).toBe('text to copy')
  })

  it('supports cut from the search input', async () => {
    const wrapper = mount(SearchBar)
    const library = useLibraryStore()
    library.searchQuery = 'cut me'
    await wrapper.vm.$nextTick()

    const input = wrapper.find<HTMLInputElement>('.search-input')
    expect(input.element.value).toBe('cut me')

    // Select all and trigger cut
    input.element.setSelectionRange(0, input.element.value.length)
    const cutEvent = new ClipboardEvent('cut', { bubbles: true })
    input.element.dispatchEvent(cutEvent)

    // Input should not prevent the cut event
    expect(cutEvent.defaultPrevented).toBe(false)
  })

  it('does not block paste, copy, or cut events', async () => {
    const wrapper = mount(SearchBar)
    const input = wrapper.find<HTMLInputElement>('.search-input')

    // Verify none of paste/copy/cut are prevented
    for (const eventType of ['paste', 'copy', 'cut'] as const) {
      const event = new ClipboardEvent(eventType, { bubbles: true, cancelable: true })
      input.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    }
  })

  it('Enter creates a description filter chip', async () => {
    const wrapper = mount(SearchBar)
    const library = useLibraryStore()
    const input = wrapper.find('.search-input')

    await input.setValue('snare')
    await input.trigger('keydown', { key: 'Enter' })

    expect(library.descriptionFilters).toContain('snare')
    expect(library.searchQuery).toBe('')
  })

  it('Escape clears query and filters', async () => {
    const wrapper = mount(SearchBar)
    const library = useLibraryStore()
    library.addDescriptionFilter('bass')
    library.searchQuery = 'test'
    await wrapper.vm.$nextTick()

    const input = wrapper.find('.search-input')
    await input.trigger('keydown', { key: 'Escape' })

    expect(library.searchQuery).toBe('')
    expect(library.descriptionFilters).toHaveLength(0)
  })

  it('shows tag dropdown when typing #', async () => {
    const tagStore = useTagStore()
    tagStore.createTag('drums', '#ff0000')

    const wrapper = mount(SearchBar)
    const input = wrapper.find('.search-input')
    await input.setValue('#')
    await input.trigger('focus')

    expect(wrapper.find('.tag-dropdown').exists()).toBe(true)
    expect(wrapper.text()).toContain('drums')
  })

  it('clears input when × button is clicked', async () => {
    const wrapper = mount(SearchBar)
    const library = useLibraryStore()
    const input = wrapper.find('.search-input')

    await input.setValue('something')
    expect(library.searchQuery).toBe('something')

    const clearBtn = wrapper.find('.action-btn')
    await clearBtn.trigger('click')

    expect(library.searchQuery).toBe('')
  })
})
