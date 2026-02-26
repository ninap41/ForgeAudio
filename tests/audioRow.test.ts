import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AudioRow from '../src/components/AudioRow.vue'
import { useLibraryStore, _resetLibraryStore, type AudioFile } from '../src/stores/libraryStore'
import { _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'

// Mock electronAPI without replacing window (preserves DOM constructors)
const mockElectronAPI = {
  showContextMenu: vi.fn(),
  writeMetadata: vi.fn().mockResolvedValue(undefined),
  selectDirectory: vi.fn(),
  scanDirectory: vi.fn(),
  readMetadata: vi.fn(),
  getAudioDuration: vi.fn(),
  showInFinder: vi.fn(),
  copyPath: vi.fn(),
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
}
;(window as any).electronAPI = mockElectronAPI

const DEFAULT_WIDTHS = { play: 36, name: 280, tags: 200, duration: 80, type: 70, createdAt: 130, modifiedAt: 130 }

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
})

describe('AudioRow', () => {
  it('renders filename', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile({ name: 'kick_hard.wav' }), widths: DEFAULT_WIDTHS },
    })

    expect(wrapper.find('.file-name').text()).toBe('kick_hard.wav')
  })

  it('shows description when present', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile({ description: 'A deep bass hit' }), widths: DEFAULT_WIDTHS },
    })

    expect(wrapper.find('.file-description').exists()).toBe(true)
    expect(wrapper.find('.file-description').text()).toBe('A deep bass hit')
  })

  it('hides description when empty', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile({ description: '' }), widths: DEFAULT_WIDTHS },
    })

    expect(wrapper.find('.file-description').exists()).toBe(false)
  })

  it('shows duration formatted', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile({ duration: 125 }), widths: DEFAULT_WIDTHS },
    })

    expect(wrapper.find('.col-duration').text()).toBe('2:05')
  })

  it('shows --:-- for null duration', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile({ duration: null }), widths: DEFAULT_WIDTHS },
    })

    expect(wrapper.find('.col-duration').text()).toBe('--:--')
  })

  it('shows file extension', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile({ extension: '.flac' }), widths: DEFAULT_WIDTHS },
    })

    expect(wrapper.find('.col-type').text()).toBe('.flac')
  })

  it('sets data-path attribute on root element', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile({ path: '/lib/kick.wav' }), widths: DEFAULT_WIDTHS },
    })

    expect(wrapper.find('.audio-row-wrapper').attributes('data-path')).toBe('/lib/kick.wav')
  })

  it('shows formatted createdAt date', () => {
    const wrapper = mount(AudioRow, {
      props: {
        file: makeFile({ createdAt: '2024-06-15T12:00:00Z' }),
        widths: DEFAULT_WIDTHS,
      },
    })

    const dateCols = wrapper.findAll('.col-date')
    expect(dateCols[0].text()).toContain('2024')
  })

  it('shows formatted modifiedAt date', () => {
    const wrapper = mount(AudioRow, {
      props: {
        file: makeFile({ modifiedAt: '2026-01-20T08:30:00Z' }),
        widths: DEFAULT_WIDTHS,
      },
    })

    const dateCols = wrapper.findAll('.col-date')
    expect(dateCols[1].text()).toContain('2026')
  })

  it('shows dash for null createdAt', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile({ createdAt: null }), widths: DEFAULT_WIDTHS },
    })

    expect(wrapper.findAll('.col-date')[0].text()).toBe('—')
  })

  it('shows dash for null modifiedAt', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile({ modifiedAt: null }), widths: DEFAULT_WIDTHS },
    })

    expect(wrapper.findAll('.col-date')[1].text()).toBe('—')
  })

  it('onDragStart sets dragPayload and calls startDrag', () => {
    const file = makeFile({ path: '/sounds/kick.wav', name: 'kick.wav', extension: '.wav', duration: 1.5 })
    const wrapper = mount(AudioRow, {
      props: { file, widths: DEFAULT_WIDTHS },
    })
    const library = useLibraryStore()

    const dragEvent = new DragEvent('dragstart', { bubbles: true, cancelable: true })
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: { effectAllowed: '', setData: vi.fn() },
    })
    wrapper.find('.audio-row').element.dispatchEvent(dragEvent)

    expect(library.dragPayload).toEqual({
      path: '/sounds/kick.wav',
      name: 'kick.wav',
      extension: '.wav',
      duration: 1.5,
    })
    expect(mockElectronAPI.startDrag).toHaveBeenCalledWith('/sounds/kick.wav')
  })

  it('onDragEnd clears dragPayload', () => {
    const file = makeFile({ path: '/sounds/snare.wav' })
    const wrapper = mount(AudioRow, {
      props: { file, widths: DEFAULT_WIDTHS },
    })
    const library = useLibraryStore()
    library.dragPayload = { path: '/sounds/snare.wav', name: 'snare.wav', extension: '.wav', duration: 0 }

    wrapper.find('.audio-row').element.dispatchEvent(new DragEvent('dragend', { bubbles: true }))

    expect(library.dragPayload).toBeNull()
  })

  it('renders expand button', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile(), widths: DEFAULT_WIDTHS },
    })
    expect(wrapper.find('.expand-btn').exists()).toBe(true)
  })

  it('does not show detail panel when not expanded', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile(), widths: DEFAULT_WIDTHS, expanded: false },
    })
    expect(wrapper.find('.row-detail').exists()).toBe(false)
  })

  it('shows detail panel when expanded', () => {
    const file = makeFile({
      path: '/sounds/test.wav',
      name: 'test.wav',
      extension: '.wav',
      size: 2048,
      duration: 65,
      tags: ['percussion'],
      description: 'A test file',
    })
    const wrapper = mount(AudioRow, {
      props: { file, widths: DEFAULT_WIDTHS, expanded: true },
    })
    expect(wrapper.find('.row-detail').exists()).toBe(true)
    expect(wrapper.find('.detail-path').text()).toBe('/sounds/test.wav')
  })

  it('emits toggle-expand on expand button click', async () => {
    const file = makeFile({ path: '/sounds/test.wav' })
    const wrapper = mount(AudioRow, {
      props: { file, widths: DEFAULT_WIDTHS },
    })
    await wrapper.find('.expand-btn').trigger('click')
    expect(wrapper.emitted('toggle-expand')).toBeTruthy()
    expect(wrapper.emitted('toggle-expand')![0]).toEqual(['/sounds/test.wav'])
  })

  it('shows formatted duration in detail panel', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile({ duration: 125 }), widths: DEFAULT_WIDTHS, expanded: true },
    })
    const detailRows = wrapper.findAll('.detail-row')
    const durationRow = detailRows.find(r => r.find('dt').text() === 'Duration')
    expect(durationRow?.find('dd').text()).toBe('2:05')
  })

  it('shows formatted size in detail panel', () => {
    const wrapper = mount(AudioRow, {
      props: { file: makeFile({ size: 1048576 }), widths: DEFAULT_WIDTHS, expanded: true },
    })
    const detailRows = wrapper.findAll('.detail-row')
    const sizeRow = detailRows.find(r => r.find('dt').text() === 'Size')
    expect(sizeRow?.find('dd').text()).toBe('1.00 MB')
  })
})
