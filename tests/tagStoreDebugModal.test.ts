import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TagStoreDebugModal from '../src/components/TagStoreDebugModal.vue'
import { useLibraryStore } from '../src/stores/libraryStore'

const mockAPI = {
  writeMetadata: vi.fn().mockResolvedValue(undefined),
  selectDirectory: vi.fn(),
  startScan: vi.fn(),
  onScanProgress: vi.fn(),
  onScanDone: vi.fn(),
  removeScanListeners: vi.fn(),
  readMetadata: vi.fn(),
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
  getStorePath: vi.fn().mockResolvedValue('/Users/test/Library/Application Support/ForgeAudio/library.json'),
  getStoreData: vi.fn().mockResolvedValue(JSON.stringify({
    version: 1,
    files: { 'kick.wav': { tags: ['impact'], description: '', lastPlayed: null } },
    tags: { impact: { color: '#ff0000' } },
  })),
  clearTagData: vi.fn().mockResolvedValue(undefined),
  toggleDevTools: vi.fn(),
}
;(window as any).electronAPI = mockAPI

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  mockAPI.writeMetadata.mockResolvedValue(undefined)
  mockAPI.getStorePath.mockResolvedValue('/Users/test/Library/Application Support/ForgeAudio/library.json')
  mockAPI.getStoreData.mockResolvedValue(JSON.stringify({
    version: 1,
    files: { 'kick.wav': { tags: ['impact'], description: '', lastPlayed: null } },
    tags: { impact: { color: '#ff0000' } },
  }))
  mockAPI.clearTagData.mockResolvedValue(undefined)
})

describe('TagStoreDebugModal', () => {
  it('renders title and close button', async () => {
    const wrapper = mount(TagStoreDebugModal)
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.find('h3').text()).toBe('Tag Store Debug Viewer')
    expect(wrapper.find('.btn').exists()).toBe(true)
  })

  it('displays store file path from IPC', async () => {
    const wrapper = mount(TagStoreDebugModal)
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.path-value').text()).toContain('library.json')
  })

  it('displays formatted JSON from IPC', async () => {
    const wrapper = mount(TagStoreDebugModal)
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    const pre = wrapper.find('pre')
    expect(pre.exists()).toBe(true)
    expect(pre.text()).toContain('kick.wav')
    expect(pre.text()).toContain('impact')
  })

  it('close button emits close', async () => {
    const wrapper = mount(TagStoreDebugModal)
    await new Promise(r => setTimeout(r, 0))

    // The first .btn (non-danger) is the Close button
    const closeBtn = wrapper.findAll('.btn').find(b => b.text() === 'Close')
    expect(closeBtn).toBeTruthy()
    await closeBtn!.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('delete button shows confirmation', async () => {
    const wrapper = mount(TagStoreDebugModal)
    await new Promise(r => setTimeout(r, 0))

    await wrapper.find('.btn-danger').trigger('click')

    expect(wrapper.find('.confirm-text').exists()).toBe(true)
    expect(wrapper.text()).toContain('Are you sure')
  })

  it('cancel hides confirmation', async () => {
    const wrapper = mount(TagStoreDebugModal)
    await new Promise(r => setTimeout(r, 0))

    // Show confirmation
    await wrapper.find('.btn-danger').trigger('click')
    expect(wrapper.find('.confirm-text').exists()).toBe(true)

    // Click Cancel
    const cancelBtn = wrapper.findAll('.btn').find(b => b.text() === 'Cancel')
    await cancelBtn!.trigger('click')

    expect(wrapper.find('.confirm-text').exists()).toBe(false)
  })

  it('confirm calls clearTagData IPC', async () => {
    // Also mock getStoreData for the refresh after clear
    mockAPI.getStoreData.mockResolvedValue(JSON.stringify({
      version: 1,
      files: { 'kick.wav': { tags: [], description: '', lastPlayed: null } },
      tags: { uncategorized: { color: '#888888' } },
    }))

    const wrapper = mount(TagStoreDebugModal)
    await new Promise(r => setTimeout(r, 0))

    // Show confirmation
    await wrapper.find('.btn-danger').trigger('click')

    // Click Continue
    const continueBtn = wrapper.findAll('.btn-danger').find(b => b.text() === 'Continue')
    await continueBtn!.trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(mockAPI.clearTagData).toHaveBeenCalled()
  })

  it('JSON is in a <pre> element', async () => {
    const wrapper = mount(TagStoreDebugModal)
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    const pre = wrapper.find('pre')
    expect(pre.exists()).toBe(true)
    const code = pre.find('code')
    expect(code.exists()).toBe(true)
  })
})
