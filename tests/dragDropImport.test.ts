import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ImportConflictModal from '../src/components/ImportConflictModal.vue'
import AudioList from '../src/components/AudioList.vue'
import { _resetLibraryStore, useLibraryStore } from '../src/stores/libraryStore'
import { _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'
import { _resetSettingsStore } from '../src/stores/settingsStore'

const mockAPI = {
  writeMetadata: vi.fn().mockResolvedValue(undefined),
  selectDirectory: vi.fn(),
  scanDirectory: vi.fn(),
  readMetadata: vi.fn(),
  getAudioDuration: vi.fn(),
  showInFinder: vi.fn(),
  copyPath: vi.fn(),
  showContextMenu: vi.fn(),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
  createDirectory: vi.fn().mockResolvedValue({ path: '/mock' }),
  resolveDroppedPaths: vi.fn().mockResolvedValue({ readyToCopy: [], conflicts: [], skippedCount: 0 }),
  copyFileToLibrary: vi.fn().mockResolvedValue({ success: true, destPath: '/lib/file.wav', finalName: 'file.wav' }),
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
})

describe('ImportConflictModal', () => {
  const conflicts = [
    { sourcePath: '/src/kick.wav', destPath: '/lib/kick.wav', fileName: 'kick.wav' },
    { sourcePath: '/src/snare.wav', destPath: '/lib/snare.wav', fileName: 'snare.wav' },
    { sourcePath: '/src/hat.wav', destPath: '/lib/hat.wav', fileName: 'hat.wav' },
  ]

  it('renders with conflict count and first filename', () => {
    const wrapper = mount(ImportConflictModal, { props: { conflicts } })

    expect(wrapper.text()).toContain('3 files already exist')
    expect(wrapper.text()).toContain('File 1 of 3')
    expect(wrapper.find('.conflict-filename').text()).toBe('kick.wav')
  })

  it('clicking Overwrite advances to next conflict', async () => {
    const wrapper = mount(ImportConflictModal, { props: { conflicts } })

    await wrapper.find('.btn-accent').trigger('click')

    expect(wrapper.text()).toContain('File 2 of 3')
    expect(wrapper.find('.conflict-filename').text()).toBe('snare.wav')
  })

  it('clicking Keep Both advances to next conflict', async () => {
    const wrapper = mount(ImportConflictModal, { props: { conflicts } })

    // Keep Both is the button before Overwrite
    const buttons = wrapper.findAll('.btn')
    const keepBothBtn = buttons.find(b => b.text() === 'Keep Both')!
    await keepBothBtn.trigger('click')

    expect(wrapper.text()).toContain('File 2 of 3')
    expect(wrapper.find('.conflict-filename').text()).toBe('snare.wav')
  })

  it('emits resolved after last conflict processed', async () => {
    const wrapper = mount(ImportConflictModal, { props: { conflicts } })

    // Resolve all three: overwrite, rename, overwrite
    await wrapper.find('.btn-accent').trigger('click') // overwrite kick
    const keepBothBtn = wrapper.findAll('.btn').find(b => b.text() === 'Keep Both')!
    await keepBothBtn.trigger('click') // rename snare
    await wrapper.find('.btn-accent').trigger('click') // overwrite hat

    const resolved = wrapper.emitted('resolved')
    expect(resolved).toBeTruthy()
    expect(resolved![0][0]).toEqual([
      { sourcePath: '/src/kick.wav', fileName: 'kick.wav', resolution: 'overwrite' },
      { sourcePath: '/src/snare.wav', fileName: 'snare.wav', resolution: 'rename' },
      { sourcePath: '/src/hat.wav', fileName: 'hat.wav', resolution: 'overwrite' },
    ])
  })

  it('apply-to-all checkbox resolves all remaining at once', async () => {
    const wrapper = mount(ImportConflictModal, { props: { conflicts } })

    // Resolve first one
    await wrapper.find('.btn-accent').trigger('click') // overwrite kick

    // Check apply-to-all
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)

    // Click Keep Both — should resolve snare and hat with rename
    const keepBothBtn = wrapper.findAll('.btn').find(b => b.text() === 'Keep Both')!
    await keepBothBtn.trigger('click')

    const resolved = wrapper.emitted('resolved')
    expect(resolved).toBeTruthy()
    expect(resolved![0][0]).toEqual([
      { sourcePath: '/src/kick.wav', fileName: 'kick.wav', resolution: 'overwrite' },
      { sourcePath: '/src/snare.wav', fileName: 'snare.wav', resolution: 'rename' },
      { sourcePath: '/src/hat.wav', fileName: 'hat.wav', resolution: 'rename' },
    ])
  })

  it('emits cancelled on Cancel', async () => {
    const wrapper = mount(ImportConflictModal, { props: { conflicts } })

    const cancelBtn = wrapper.findAll('.btn').find(b => b.text() === 'Cancel Import')!
    await cancelBtn.trigger('click')

    expect(wrapper.emitted('cancelled')).toBeTruthy()
  })

  it('has ARIA dialog attributes', () => {
    const wrapper = mount(ImportConflictModal, { props: { conflicts } })

    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('aria-modal')).toBe('true')
  })

  it('handles single conflict', async () => {
    const singleConflict = [conflicts[0]]
    const wrapper = mount(ImportConflictModal, { props: { conflicts: singleConflict } })

    expect(wrapper.text()).toContain('1 file already exist')
    expect(wrapper.text()).toContain('File 1 of 1')

    await wrapper.find('.btn-accent').trigger('click')

    const resolved = wrapper.emitted('resolved')
    expect(resolved).toBeTruthy()
    expect(resolved![0][0]).toEqual([
      { sourcePath: '/src/kick.wav', fileName: 'kick.wav', resolution: 'overwrite' },
    ])
  })
})

describe('AudioList drop zone', () => {
  function makeFile(name: string) {
    return {
      path: `/sounds/${name}`,
      name,
      extension: '.wav',
      size: 1024,
      duration: 2.5,
      tags: [] as string[],
      description: '',
      lastPlayed: null,
      createdAt: null,
      modifiedAt: null,
    }
  }

  it('emits filesDropped with correct paths on drop event', async () => {
    const library = useLibraryStore()
    library.files = [makeFile('kick.wav')]

    const wrapper = mount(AudioList)
    const listBody = wrapper.find('.list-body')

    const dropEvent = new Event('drop', { bubbles: true }) as any
    dropEvent.preventDefault = vi.fn()
    dropEvent.dataTransfer = {
      files: [
        { path: '/external/snare.wav' },
        { path: '/external/hat.wav' },
      ],
    }

    await listBody.trigger('drop', dropEvent)

    // The filesDropped event should have been emitted
    const emitted = wrapper.emitted('filesDropped')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual(['/external/snare.wav', '/external/hat.wav'])
  })

  it('shows drop-active class on dragenter', async () => {
    const library = useLibraryStore()
    library.files = [makeFile('kick.wav')]

    const wrapper = mount(AudioList)
    const listBody = wrapper.find('.list-body')

    await listBody.trigger('dragenter')

    expect(listBody.classes()).toContain('drop-active')
  })

  it('removes drop-active class on drop', async () => {
    const library = useLibraryStore()
    library.files = [makeFile('kick.wav')]

    const wrapper = mount(AudioList)
    const listBody = wrapper.find('.list-body')

    await listBody.trigger('dragenter')
    expect(listBody.classes()).toContain('drop-active')

    const dropEvent = new Event('drop', { bubbles: true }) as any
    dropEvent.preventDefault = vi.fn()
    dropEvent.dataTransfer = { files: [] }
    await listBody.trigger('drop', dropEvent)

    expect(listBody.classes()).not.toContain('drop-active')
  })
})
