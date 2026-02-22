import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useLibraryStore, _resetLibraryStore, type AudioFile } from '../src/stores/libraryStore'
import { useTagStore, _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'
import { _resetSettingsStore } from '../src/stores/settingsStore'
import SettingsView from '../src/views/SettingsView.vue'

// Mock components
const mockElectronAPI = {
  selectDirectory: vi.fn(),
  startScan: vi.fn(),
  onScanProgress: vi.fn(),
  onScanDone: vi.fn(),
  removeScanListeners: vi.fn(),
  readMetadata: vi.fn(),
  writeMetadata: vi.fn(),
  getAudioDuration: vi.fn(),
  getRootDirectory: vi.fn(),
  setRootDirectory: vi.fn(),
  backupCreate: vi.fn().mockResolvedValue({}),
  backupList: vi.fn().mockResolvedValue([]),
  backupDelete: vi.fn().mockResolvedValue(undefined),
  backupRestore: vi.fn(),
  saveFileDialog: vi.fn(),
  selectFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
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
  _resetSettingsStore()
  vi.resetAllMocks()
  mockElectronAPI.writeMetadata.mockResolvedValue(undefined)
  mockElectronAPI.backupCreate.mockResolvedValue({})
  mockElectronAPI.backupList.mockResolvedValue([])
})

describe('SettingsView - Tag Counts', () => {
  it('shows zero uncategorized count when all files have tags', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')

    library.files = [
      makeFile({ path: '/a.wav', name: 'a.wav', tags: ['impact'] }),
      makeFile({ path: '/b.wav', name: 'b.wav', tags: ['impact'] }),
    ]

    const wrapper = mount(SettingsView)
    await wrapper.vm.$nextTick()

    // uncategorized should not appear in tag counts when count is 0
    expect(wrapper.vm.tagCounts['uncategorized']).toBeUndefined()
  })

  it('counts files with no tags as uncategorized', async () => {
    const library = useLibraryStore()

    library.files = [
      makeFile({ path: '/a.wav', name: 'a.wav', tags: [] }),
      makeFile({ path: '/b.wav', name: 'b.wav', tags: [] }),
      makeFile({ path: '/c.wav', name: 'c.wav', tags: [] }),
    ]

    const wrapper = mount(SettingsView)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.tagCounts['uncategorized']).toBe(3)
  })

  it('counts uncategorized alongside tagged files', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')

    library.files = [
      makeFile({ path: '/a.wav', name: 'a.wav', tags: ['impact'] }),
      makeFile({ path: '/b.wav', name: 'b.wav', tags: [] }),
      makeFile({ path: '/c.wav', name: 'c.wav', tags: [] }),
    ]

    const wrapper = mount(SettingsView)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.tagCounts['impact']).toBe(1)
    expect(wrapper.vm.tagCounts['uncategorized']).toBe(2)
  })

  it('updates uncategorized count when files are added', async () => {
    const library = useLibraryStore()

    library.files = [makeFile({ path: '/a.wav', name: 'a.wav', tags: [] })]

    const wrapper = mount(SettingsView)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.tagCounts['uncategorized']).toBe(1)

    // Add another uncategorized file
    library.files.push(makeFile({ path: '/b.wav', name: 'b.wav', tags: [] }))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.tagCounts['uncategorized']).toBe(2)
  })

  it('updates uncategorized count when files are removed', async () => {
    const library = useLibraryStore()

    library.files = [
      makeFile({ path: '/a.wav', name: 'a.wav', tags: [] }),
      makeFile({ path: '/b.wav', name: 'b.wav', tags: [] }),
    ]

    const wrapper = mount(SettingsView)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.tagCounts['uncategorized']).toBe(2)

    // Remove one uncategorized file
    library.files = library.files.slice(1)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.tagCounts['uncategorized']).toBe(1)
  })

  it('removes uncategorized from counts when all files are tagged', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')

    library.files = [makeFile({ path: '/a.wav', name: 'a.wav', tags: [] })]

    const wrapper = mount(SettingsView)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.tagCounts['uncategorized']).toBe(1)

    // Tag the file
    library.files[0].tags.push('impact')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.tagCounts['uncategorized']).toBeUndefined()
  })

  it('accurately counts multiple tags and uncategorized together', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')
    tagStore.createTag('metal', '#888888')

    library.files = [
      makeFile({ path: '/a.wav', name: 'a.wav', tags: ['impact', 'metal'] }),
      makeFile({ path: '/b.wav', name: 'b.wav', tags: ['impact'] }),
      makeFile({ path: '/c.wav', name: 'c.wav', tags: [] }),
      makeFile({ path: '/d.wav', name: 'd.wav', tags: [] }),
    ]

    const wrapper = mount(SettingsView)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.tagCounts['impact']).toBe(2)
    expect(wrapper.vm.tagCounts['metal']).toBe(1)
    expect(wrapper.vm.tagCounts['uncategorized']).toBe(2)
  })
})

describe('SettingsView - Tag Management', () => {
  it('renders tag color picker for each tag', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')
    tagStore.createTag('metal', '#888888')

    library.files = [makeFile()]

    const wrapper = mount(SettingsView)
    await wrapper.vm.$nextTick()

    const colorPickers = wrapper.findAll('input[type="color"]')
    // One for each tag + one for new tag input
    expect(colorPickers.length).toBeGreaterThanOrEqual(2)
  })

  it('allows adding a new tag', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    library.files = []

    const wrapper = mount(SettingsView)
    await wrapper.vm.$nextTick()

    // Set tag name and color
    wrapper.vm.newTagName = 'newTag'
    wrapper.vm.newTagColor = '#00ff00'

    // Call addTag
    wrapper.vm.addTag()

    expect(tagStore.tagDefinitions['newtag']).toBeDefined()
    expect(tagStore.tagDefinitions['newtag'].color).toBe('#00ff00')
    expect(wrapper.vm.newTagName).toBe('')
  })

  it('does not add empty tag', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    library.files = []
    const initialTagCount = Object.keys(tagStore.tagDefinitions).length

    const wrapper = mount(SettingsView)
    await wrapper.vm.$nextTick()

    wrapper.vm.newTagName = '   '
    wrapper.vm.addTag()

    expect(Object.keys(tagStore.tagDefinitions).length).toBe(initialTagCount)
  })
})
