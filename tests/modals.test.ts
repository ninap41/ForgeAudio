import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AddTagModal from '../src/components/AddTagModal.vue'
import EditDescriptionModal from '../src/components/EditDescriptionModal.vue'
import DeleteConfirmModal from '../src/components/DeleteConfirmModal.vue'
import RenameModal from '../src/components/RenameModal.vue'
import EditTagModal from '../src/components/EditTagModal.vue'
import ClearTagModal from '../src/components/ClearTagModal.vue'
import SettingsView from '../src/views/SettingsView.vue'
import { useLibraryStore } from '../src/stores/libraryStore'
import { useTagStore } from '../src/stores/tagStore'

// Mock electronAPI without replacing window (which would strip DOM event constructors)
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
  setActivePinia(createPinia())
  vi.resetAllMocks()
  mockAPI.writeMetadata.mockResolvedValue(undefined)
  mockAPI.deleteFile.mockResolvedValue({ success: true })
  mockAPI.renameFile.mockResolvedValue({ success: true, newPath: '/sounds/new_name.wav' })
  mockAPI.backupCreate.mockResolvedValue({})
  mockAPI.backupList.mockResolvedValue([])
})

describe('AddTagModal', () => {
  it('renders with file name', () => {
    const wrapper = mount(AddTagModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    expect(wrapper.find('.modal-subtitle').text()).toBe('kick.wav')
  })

  it('emits close when cancel is clicked', async () => {
    const wrapper = mount(AddTagModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    await wrapper.findAll('.btn')[0].trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('adds tag to file on submit', async () => {
    const library = useLibraryStore()
    library.files = [{
      path: '/sounds/kick.wav',
      name: 'kick.wav',
      extension: '.wav',
      size: 1024,
      duration: 2.5,
      tags: [],
      description: '',
      lastPlayed: null,
    }]

    const wrapper = mount(AddTagModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    const input = wrapper.find('.modal-input')
    await input.setValue('impact')
    await wrapper.find('.btn-accent').trigger('click')

    expect(library.files[0].tags).toContain('impact')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('creates tag definition if new', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    library.files = [{
      path: '/sounds/kick.wav',
      name: 'kick.wav',
      extension: '.wav',
      size: 1024,
      duration: 2.5,
      tags: [],
      description: '',
      lastPlayed: null,
    }]

    const wrapper = mount(AddTagModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    await wrapper.find('.modal-input').setValue('newtag')
    await wrapper.find('.btn-accent').trigger('click')

    expect(tagStore.tagDefinitions).toHaveProperty('newtag')
  })

  it('disables add button when input is empty', () => {
    const wrapper = mount(AddTagModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    const addBtn = wrapper.find('.btn-accent')
    expect((addBtn.element as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('EditDescriptionModal', () => {
  it('renders with file name', () => {
    const wrapper = mount(EditDescriptionModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    expect(wrapper.find('.modal-subtitle').text()).toBe('kick.wav')
  })

  it('emits close when cancel is clicked', async () => {
    const wrapper = mount(EditDescriptionModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    await wrapper.findAll('.btn')[0].trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('pre-populates with existing description', () => {
    const library = useLibraryStore()
    library.files = [{
      path: '/sounds/kick.wav',
      name: 'kick.wav',
      extension: '.wav',
      size: 1024,
      duration: 2.5,
      tags: [],
      description: 'Existing description',
      lastPlayed: null,
    }]

    const wrapper = mount(EditDescriptionModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    const textarea = wrapper.find('.modal-textarea')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('Existing description')
  })

  it('saves description on submit', async () => {
    const library = useLibraryStore()
    library.files = [{
      path: '/sounds/kick.wav',
      name: 'kick.wav',
      extension: '.wav',
      size: 1024,
      duration: 2.5,
      tags: [],
      description: '',
      lastPlayed: null,
    }]

    const wrapper = mount(EditDescriptionModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    await wrapper.find('.modal-textarea').setValue('A punchy kick drum')
    await wrapper.find('.btn-accent').trigger('click')

    expect(library.files[0].description).toBe('A punchy kick drum')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})

describe('DeleteConfirmModal', () => {
  it('renders filename in subtitle', () => {
    const wrapper = mount(DeleteConfirmModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    expect(wrapper.find('.modal-subtitle').text()).toBe('kick.wav')
  })

  it('emits close when cancel is clicked', async () => {
    const wrapper = mount(DeleteConfirmModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    await wrapper.find('.btn').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('calls deleteFile and emits close on confirm', async () => {
    const library = useLibraryStore()
    const file = {
      path: '/sounds/kick.wav', name: 'kick.wav', extension: '.wav',
      size: 1024, duration: 2.5, tags: [], description: '', lastPlayed: null,
    }
    library.files = [file]

    const wrapper = mount(DeleteConfirmModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    await wrapper.find('.btn-danger').trigger('click')
    await new Promise(r => setTimeout(r, 0)) // flush promise

    expect(library.files).toHaveLength(0)
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('shows error and does not close on failure', async () => {
    const library = useLibraryStore()
    library.files = [{
      path: '/sounds/kick.wav', name: 'kick.wav', extension: '.wav',
      size: 1024, duration: 2.5, tags: [], description: '', lastPlayed: null,
    }]
    mockAPI.deleteFile.mockResolvedValue({ success: false, error: 'Permission denied' })

    const wrapper = mount(DeleteConfirmModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    await wrapper.find('.btn-danger').trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.find('.modal-error').text()).toBe('Permission denied')
    expect(wrapper.emitted('close')).toBeFalsy()
  })
})

describe('RenameModal', () => {
  it('pre-populates input with current filename', () => {
    const wrapper = mount(RenameModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    const input = wrapper.find('.modal-input')
    expect((input.element as HTMLInputElement).value).toBe('kick.wav')
  })

  it('emits close when cancel is clicked', async () => {
    const wrapper = mount(RenameModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    await wrapper.find('.btn').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('renames file, emits renamed with new path and emits close on submit', async () => {
    const library = useLibraryStore()
    library.files = [{
      path: '/sounds/kick.wav', name: 'kick.wav', extension: '.wav',
      size: 1024, duration: 2.5, tags: [], description: '', lastPlayed: null,
    }]
    mockAPI.renameFile.mockResolvedValue({ success: true, newPath: '/sounds/kick_v2.wav' })

    const wrapper = mount(RenameModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    await wrapper.find('.modal-input').setValue('kick_v2.wav')
    await wrapper.find('.btn-accent').trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(library.files[0].name).toBe('kick_v2.wav')
    expect(wrapper.emitted('renamed')?.[0]).toEqual(['/sounds/kick_v2.wav'])
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('shows error and does not close on failure', async () => {
    const library = useLibraryStore()
    library.files = [{
      path: '/sounds/kick.wav', name: 'kick.wav', extension: '.wav',
      size: 1024, duration: 2.5, tags: [], description: '', lastPlayed: null,
    }]
    mockAPI.renameFile.mockResolvedValue({ success: false, error: 'File in use' })

    const wrapper = mount(RenameModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    await wrapper.find('.modal-input').setValue('kick_v2.wav')
    await wrapper.find('.btn-accent').trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.find('.modal-error').text()).toBe('File in use')
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('disables rename button when name is unchanged', () => {
    const wrapper = mount(RenameModal, {
      props: { filePath: '/sounds/kick.wav' },
    })

    const btn = wrapper.find('.btn-accent')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('EditTagModal', () => {
  it('pre-populates name input with current tag name', () => {
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')

    const wrapper = mount(EditTagModal, { props: { tagName: 'impact' } })

    const input = wrapper.find('.modal-input')
    expect((input.element as HTMLInputElement).value).toBe('impact')
  })

  it('pre-populates color picker with current tag color', () => {
    const tagStore = useTagStore()
    tagStore.createTag('ambient', '#4da6ff')

    const wrapper = mount(EditTagModal, { props: { tagName: 'ambient' } })

    const colorInput = wrapper.find('input[type="color"]')
    expect((colorInput.element as HTMLInputElement).value).toBe('#4da6ff')
  })

  it('disables save button when name input is empty', async () => {
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')

    const wrapper = mount(EditTagModal, { props: { tagName: 'impact' } })
    await wrapper.find('.modal-input').setValue('')

    expect((wrapper.find('.btn-accent').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('emits close when cancel is clicked', async () => {
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')

    const wrapper = mount(EditTagModal, { props: { tagName: 'impact' } })
    await wrapper.find('.btn').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('renames tag and emits close on save', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')
    library.files = []

    const wrapper = mount(EditTagModal, { props: { tagName: 'impact' } })
    await wrapper.find('.modal-input').setValue('kick')
    await wrapper.find('.btn-accent').trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(tagStore.tagDefinitions).toHaveProperty('kick')
    expect(tagStore.tagDefinitions).not.toHaveProperty('impact')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('shows error and does not close when new name conflicts', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('impact', '#ff0000')
    tagStore.createTag('metal', '#888888')
    library.files = []

    const wrapper = mount(EditTagModal, { props: { tagName: 'impact' } })
    await wrapper.find('.modal-input').setValue('metal')
    await wrapper.find('.btn-accent').trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.find('.modal-error').exists()).toBe(true)
    expect(wrapper.emitted('close')).toBeFalsy()
  })
})

describe('ClearTagModal', () => {
  it('shows tag name in the prompt', () => {
    const wrapper = mount(ClearTagModal, { props: { tagName: 'impact' } })

    expect(wrapper.text()).toContain('impact')
  })

  it('shows the correct sound count', () => {
    const library = useLibraryStore()
    library.files = [
      { path: '/a.wav', name: 'a.wav', extension: '.wav', size: 0, duration: null,
        tags: ['impact'], description: '', lastPlayed: null, createdAt: null, modifiedAt: null },
      { path: '/b.wav', name: 'b.wav', extension: '.wav', size: 0, duration: null,
        tags: ['impact'], description: '', lastPlayed: null, createdAt: null, modifiedAt: null },
      { path: '/c.wav', name: 'c.wav', extension: '.wav', size: 0, duration: null,
        tags: ['metal'], description: '', lastPlayed: null, createdAt: null, modifiedAt: null },
    ]

    const wrapper = mount(ClearTagModal, { props: { tagName: 'impact' } })

    expect(wrapper.text()).toContain('2 sounds')
  })

  it('emits close when cancel is clicked', async () => {
    const wrapper = mount(ClearTagModal, { props: { tagName: 'impact' } })

    await wrapper.find('.btn').trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('clears tag from all files and emits close on confirm', async () => {
    const library = useLibraryStore()
    library.files = [
      { path: '/a.wav', name: 'a.wav', extension: '.wav', size: 0, duration: null,
        tags: ['impact', 'metal'], description: '', lastPlayed: null, createdAt: null, modifiedAt: null },
      { path: '/b.wav', name: 'b.wav', extension: '.wav', size: 0, duration: null,
        tags: ['impact'], description: '', lastPlayed: null, createdAt: null, modifiedAt: null },
    ]

    const wrapper = mount(ClearTagModal, { props: { tagName: 'impact' } })
    await wrapper.find('.btn-danger').trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(library.files[0].tags).toEqual(['metal'])
    expect(library.files[1].tags).toEqual([])
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})

describe('SettingsView — uncategorized tag', () => {
  it('does not show Edit, Clear, or Delete buttons for uncategorized tag', () => {
    const tagStore = useTagStore()
    // uncategorized exists by default; add another tag for comparison
    tagStore.createTag('impact', '#ff0000')

    const wrapper = mount(SettingsView)

    const rows = wrapper.findAll('.tag-row')
    const uncatRow = rows.find(r => r.find('.tag-name').text() === 'uncategorized')!
    const impactRow = rows.find(r => r.find('.tag-name').text() === 'impact')!

    // uncategorized row should have zero action buttons
    expect(uncatRow.findAll('.btn-subtle')).toHaveLength(0)

    // impact row should have Edit, Clear, and Delete buttons
    const impactBtns = impactRow.findAll('.btn-subtle')
    expect(impactBtns.length).toBe(3)
    expect(impactBtns.map(b => b.text())).toEqual(['Edit', 'Clear', 'Delete'])
  })
})
