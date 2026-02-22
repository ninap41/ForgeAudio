import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref, type Ref } from 'vue'
import Player from '../src/components/Player.vue'
import { useLibraryStore, type AudioFile } from '../src/stores/libraryStore'

// ─── Mock @vueuse/core ──────────────────────────────────────────────────────

let mockPlaying: Ref<boolean>
let mockCurrentTime: Ref<number>
let mockDuration: Ref<number>
let mockBuffered: Ref<[number, number][]>
let mockEnded: Ref<boolean>
let mockOnPlaybackError: ReturnType<typeof vi.fn>

vi.mock('@vueuse/core', () => ({
  useMediaControls: vi.fn(() => ({
    playing: mockPlaying,
    currentTime: mockCurrentTime,
    duration: mockDuration,
    buffered: mockBuffered,
    ended: mockEnded,
    waiting: ref(false),
    seeking: ref(false),
    onPlaybackError: mockOnPlaybackError,
  })),
}))

// ─── electronAPI stub ───────────────────────────────────────────────────────

;(window as any).electronAPI = {
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
  getStorePath: vi.fn(),
  getStoreData: vi.fn(),
  clearTagData: vi.fn(),
  toggleDevTools: vi.fn(),
}

// ─── helpers ────────────────────────────────────────────────────────────────

function makeFile(overrides: Partial<AudioFile> = {}): AudioFile {
  return {
    path: '/sounds/test.wav',
    name: 'test.wav',
    extension: '.wav',
    size: 1024,
    duration: 60,
    tags: [],
    description: '',
    lastPlayed: null,
    createdAt: null,
    modifiedAt: null,
    ...overrides,
  }
}

/** Real audio files in tests/mocks + synthetic entries for missing formats */
const MOCK_AUDIO_FILES: AudioFile[] = [
  makeFile({
    path: '/Users/ninapalumbo/Desktop/FuckTheFinder/tests/mocks/Music - Being Different.mp3',
    name: 'Music - Being Different.mp3',
    extension: '.mp3',
    size: 6478922,
  }),
  makeFile({
    path: '/Users/ninapalumbo/Desktop/FuckTheFinder/tests/mocks/Shire Oak - Thimblewinter - 02 Thimblewinter copy.mp3',
    name: 'Shire Oak - Thimblewinter - 02 Thimblewinter copy.mp3',
    extension: '.mp3',
    size: 10454137,
  }),
  makeFile({
    path: '/Users/ninapalumbo/Desktop/FuckTheFinder/tests/mocks/Magazine.m4a',
    name: 'Magazine.m4a',
    extension: '.m4a',
    size: 1177452,
  }),
  makeFile({
    path: '/Users/ninapalumbo/Desktop/FuckTheFinder/tests/mocks/Alert copy.aiff',
    name: 'Alert copy.aiff',
    extension: '.aiff',
    size: 44740,
  }),
  // Synthetic entries for formats not in mocks/ — the component never reads the
  // file from disk (useMediaControls is mocked), so these still exercise the full
  // URL-encoding + scrubber path for each extension.
  makeFile({
    path: '/sounds/kick_01.wav',
    name: 'kick_01.wav',
    extension: '.wav',
    size: 2048,
  }),
  makeFile({
    path: '/sounds/pad with spaces.flac',
    name: 'pad with spaces.flac',
    extension: '.flac',
    size: 4096,
  }),
  makeFile({
    path: '/sounds/texture_loop.ogg',
    name: 'texture_loop.ogg',
    extension: '.ogg',
    size: 8192,
  }),
]

function mountPlayer(file?: AudioFile) {
  // Fresh refs for each test
  mockPlaying = ref(false)
  mockCurrentTime = ref(0)
  mockDuration = ref(0)
  mockBuffered = ref([])
  mockEnded = ref(false)
  mockOnPlaybackError = vi.fn()

  setActivePinia(createPinia())
  const library = useLibraryStore()
  library.currentFile = file ?? makeFile()
  library.isPlaying = false

  const wrapper = mount(Player)
  const scrubber = wrapper.find('.scrubber')

  return { wrapper, library, scrubber }
}

// ─── formatTime ──────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats seconds correctly', async () => {
    const { wrapper } = mountPlayer()
    mockDuration.value = 125
    await wrapper.vm.$nextTick()

    const timeSpans = wrapper.findAll('.time')
    expect(timeSpans[1].text()).toBe('2:05')
  })

  it('shows 0:00 for 0', () => {
    const { wrapper } = mountPlayer()
    const timeSpans = wrapper.findAll('.time')
    expect(timeSpans[0].text()).toBe('0:00')
    expect(timeSpans[1].text()).toBe('0:00')
  })
})

// ─── scrub start (pointerdown) ────────────────────────────────────────────────

describe('scrub start', () => {
  it('pauses audio on pointerdown when playing', async () => {
    const { library, scrubber } = mountPlayer()
    library.isPlaying = true
    mockPlaying.value = true
    await scrubber.trigger('pointerdown')
    expect(mockPlaying.value).toBe(false)
  })

  it('does not throw on pointerdown when paused', async () => {
    const { scrubber } = mountPlayer()
    await expect(scrubber.trigger('pointerdown')).resolves.not.toThrow()
  })
})

// ─── scrub input (live drag) ──────────────────────────────────────────────────

describe('scrub input', () => {
  it('updates the current-time display as scrubber moves', async () => {
    const { scrubber, wrapper } = mountPlayer()
    mockDuration.value = 60
    await wrapper.vm.$nextTick()

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '30'
    await scrubber.trigger('input')
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.time')[0].text()).toBe('0:30')
  })
})

// ─── scrub end (pointerup) ────────────────────────────────────────────────────

describe('scrub end', () => {
  it('seeks audio to the scrubber position on pointerup', async () => {
    const { scrubber } = mountPlayer()
    mockDuration.value = 60

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '45'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    expect(mockCurrentTime.value).toBe(45)
  })

  it('resumes playback after seek if audio was playing before scrub', async () => {
    const { library, scrubber } = mountPlayer()
    library.isPlaying = true
    mockPlaying.value = true
    mockDuration.value = 60

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '20'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    expect(mockPlaying.value).toBe(true)
  })

  it('does not resume playback if audio was paused before scrub', async () => {
    const { scrubber } = mountPlayer()
    mockDuration.value = 60

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '20'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    expect(mockPlaying.value).toBe(false)
  })

  it('clamps seek value to 0 when scrubber value would be negative', async () => {
    const { scrubber } = mountPlayer()
    mockDuration.value = 60

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '-5'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    expect(mockCurrentTime.value).toBe(0)
  })

  it('clamps seek value to duration when scrubber value exceeds it', async () => {
    const { scrubber } = mountPlayer()
    mockDuration.value = 60

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '999'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    expect(mockCurrentTime.value).toBe(60)
  })
})

// ─── isScrubbing guard (timeupdate) ──────────────────────────────────────────

describe('timeupdate guard during scrub', () => {
  it('does not snap currentTime back when timeupdate fires during scrub', async () => {
    const { scrubber, wrapper } = mountPlayer()
    mockDuration.value = 60
    await wrapper.vm.$nextTick()

    // Drag to 40s
    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '40'
    await scrubber.trigger('input')
    await wrapper.vm.$nextTick()

    // Simulate composable updating currentTime (as if timeupdate fired)
    mockCurrentTime.value = 5
    await wrapper.vm.$nextTick()

    // The displayed time should still be 40, not snapped back to 5
    expect(wrapper.findAll('.time')[0].text()).toBe('0:40')
  })

  it('resumes timeupdate updates after scrub ends', async () => {
    const { scrubber, wrapper } = mountPlayer()
    mockDuration.value = 60
    await wrapper.vm.$nextTick()

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '40'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')
    await wrapper.vm.$nextTick()

    // Now update currentTime (simulating timeupdate after scrub ended)
    mockCurrentTime.value = 41
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.time')[0].text()).toBe('0:41')
  })
})

// ─── keyboard scrubbing (@change) ────────────────────────────────────────────

describe('keyboard scrubbing', () => {
  it('seeks when change fires without a prior pointerdown (keyboard arrows)', async () => {
    const { scrubber, wrapper } = mountPlayer()
    mockDuration.value = 60
    await wrapper.vm.$nextTick()

    ;(scrubber.element as HTMLInputElement).value = '15'
    await scrubber.trigger('change')

    expect(mockCurrentTime.value).toBe(15)
  })

  it('clamps negative values to 0 via change', async () => {
    const { scrubber, wrapper } = mountPlayer()
    mockDuration.value = 60
    await wrapper.vm.$nextTick()

    ;(scrubber.element as HTMLInputElement).value = '-5'
    await scrubber.trigger('change')

    expect(mockCurrentTime.value).toBe(0)
  })

  it('clamps over-duration values to duration via change', async () => {
    const { scrubber, wrapper } = mountPlayer()
    mockDuration.value = 60
    await wrapper.vm.$nextTick()

    ;(scrubber.element as HTMLInputElement).value = '999'
    await scrubber.trigger('change')

    expect(mockCurrentTime.value).toBe(60)
  })
})

// ─── pointercancel / pointerleave ────────────────────────────────────────────

describe('pointer escape during scrub', () => {
  it('pointercancel ends scrubbing state', async () => {
    const { scrubber, wrapper } = mountPlayer()
    mockDuration.value = 60
    await wrapper.vm.$nextTick()

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '30'
    await scrubber.trigger('input')
    await scrubber.trigger('pointercancel')
    await wrapper.vm.$nextTick()

    // Scrubbing cleared — display follows currentTime, not scrub position
    mockCurrentTime.value = 35
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.time')[0].text()).toBe('0:35')
  })

  it('pointerleave ends scrubbing state', async () => {
    const { scrubber, wrapper } = mountPlayer()
    mockDuration.value = 60
    await wrapper.vm.$nextTick()

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '25'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerleave')
    await wrapper.vm.$nextTick()

    // Scrubbing cleared — display follows currentTime
    mockCurrentTime.value = 42
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.time')[0].text()).toBe('0:42')
  })
})

// ─── click-to-seek (input without pointerdown) ──────────────────────────────

describe('click-to-seek', () => {
  it('seeks on input without prior pointerdown', async () => {
    const { scrubber, wrapper } = mountPlayer()
    mockDuration.value = 60
    await wrapper.vm.$nextTick()

    ;(scrubber.element as HTMLInputElement).value = '15'
    await scrubber.trigger('input')

    expect(mockCurrentTime.value).toBe(15)
  })
})

// ─── buffered indicator ──────────────────────────────────────────────────────

describe('buffered indicator', () => {
  it('renders correct --buffered-pct style', async () => {
    const { scrubber, wrapper } = mountPlayer()
    mockDuration.value = 100
    mockBuffered.value = [[0, 40]]
    await wrapper.vm.$nextTick()

    expect(scrubber.attributes('style')).toContain('--buffered-pct: 40%')
  })
})

// ─── per-format scrubbing coverage ──────────────────────────────────────────
// Runs the full scrubbing test suite against every supported audio format
// using real mock files where available (.mp3, .m4a, .aiff) and synthetic
// entries for the rest (.wav, .flac, .ogg).

describe.each(MOCK_AUDIO_FILES)('scrubbing: $name ($extension)', (file) => {
  it('renders the correct filename', () => {
    const { wrapper } = mountPlayer(file)
    expect(wrapper.find('.player-filename').text()).toBe(file.name)
  })

  it('generates a valid atom:// src with encoded path', () => {
    const { wrapper } = mountPlayer(file)
    const audio = wrapper.find('audio')
    expect(audio.attributes('src')).toBe('atom://localfile' + encodeURI(file.path))
  })

  it('scrub drag seeks to correct position', async () => {
    const { scrubber, wrapper } = mountPlayer(file)
    mockDuration.value = 120
    await wrapper.vm.$nextTick()

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '55'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    expect(mockCurrentTime.value).toBe(55)
  })

  it('scrub display isolation during drag', async () => {
    const { scrubber, wrapper } = mountPlayer(file)
    mockDuration.value = 120
    await wrapper.vm.$nextTick()

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '80'
    await scrubber.trigger('input')
    await wrapper.vm.$nextTick()

    // Simulate composable currentTime lagging behind
    mockCurrentTime.value = 2
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.time')[0].text()).toBe('1:20')
  })

  it('pointercancel clears scrubbing state', async () => {
    const { scrubber, wrapper } = mountPlayer(file)
    mockDuration.value = 90
    await wrapper.vm.$nextTick()

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '30'
    await scrubber.trigger('input')
    await scrubber.trigger('pointercancel')
    await wrapper.vm.$nextTick()

    mockCurrentTime.value = 50
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.time')[0].text()).toBe('0:50')
  })

  it('pointerleave clears scrubbing state', async () => {
    const { scrubber, wrapper } = mountPlayer(file)
    mockDuration.value = 90
    await wrapper.vm.$nextTick()

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '25'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerleave')
    await wrapper.vm.$nextTick()

    mockCurrentTime.value = 60
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.time')[0].text()).toBe('1:00')
  })

  it('click-to-seek via input without pointerdown', async () => {
    const { scrubber, wrapper } = mountPlayer(file)
    mockDuration.value = 200
    await wrapper.vm.$nextTick()

    ;(scrubber.element as HTMLInputElement).value = '100'
    await scrubber.trigger('input')

    expect(mockCurrentTime.value).toBe(100)
  })

  it('keyboard seek via change', async () => {
    const { scrubber, wrapper } = mountPlayer(file)
    mockDuration.value = 180
    await wrapper.vm.$nextTick()

    ;(scrubber.element as HTMLInputElement).value = '90'
    await scrubber.trigger('change')

    expect(mockCurrentTime.value).toBe(90)
  })

  it('clamps over-duration scrub to duration', async () => {
    const { scrubber, wrapper } = mountPlayer(file)
    mockDuration.value = 45
    await wrapper.vm.$nextTick()

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '999'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    expect(mockCurrentTime.value).toBe(45)
  })

  it('clamps negative scrub to 0', async () => {
    const { scrubber, wrapper } = mountPlayer(file)
    mockDuration.value = 45
    await wrapper.vm.$nextTick()

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '-10'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    expect(mockCurrentTime.value).toBe(0)
  })

  it('resumes playback after scrub if was playing', async () => {
    const { library, scrubber, wrapper } = mountPlayer(file)
    library.isPlaying = true
    mockPlaying.value = true
    mockDuration.value = 60

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '30'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    expect(mockPlaying.value).toBe(true)
  })

  it('buffered indicator renders correctly', async () => {
    const { scrubber, wrapper } = mountPlayer(file)
    mockDuration.value = 200
    mockBuffered.value = [[0, 120]]
    await wrapper.vm.$nextTick()

    expect(scrubber.attributes('style')).toContain('--buffered-pct: 60%')
  })
})
