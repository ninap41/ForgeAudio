import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AudioRow from '../src/components/AudioRow.vue'
import { useLibraryStore, type AudioFile } from '../src/stores/libraryStore'

// Mock electronAPI without replacing window (preserves DOM constructors)
;(window as any).electronAPI = {
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
}

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
  setActivePinia(createPinia())
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

    expect(wrapper.find('.audio-row').attributes('data-path')).toBe('/lib/kick.wav')
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
})
