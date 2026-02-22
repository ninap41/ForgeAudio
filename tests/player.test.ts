import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import Player from '../src/components/Player.vue'
import { useLibraryStore, type AudioFile } from '../src/stores/libraryStore'

// Preserve DOM constructors — assign only electronAPI
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
    ...overrides,
  }
}

/**
 * Attach mocks to the <audio> DOM element returned by the component.
 * Returns helpers to inspect and drive the mock.
 */
function mockAudio(audio: HTMLAudioElement, durationValue = 60) {
  let _currentTime = 0
  const seekedHandlers: Array<() => void> = []

  Object.defineProperty(audio, 'duration', { get: () => durationValue, configurable: true })
  Object.defineProperty(audio, 'currentTime', {
    get: () => _currentTime,
    set: (v: number) => { _currentTime = v },
    configurable: true,
  })

  audio.play = vi.fn().mockResolvedValue(undefined)
  audio.pause = vi.fn()
  audio.load = vi.fn()

  // Intercept addEventListener to capture 'seeked' listeners so tests can fire them
  const original = audio.addEventListener.bind(audio)
  vi.spyOn(audio, 'addEventListener').mockImplementation((type, listener, opts?) => {
    if (type === 'seeked') {
      seekedHandlers.push(listener as () => void)
    } else {
      original(type, listener as EventListener, opts as AddEventListenerOptions)
    }
  })

  return {
    get currentTime() { return _currentTime },
    /** Fire all pending seeked listeners (simulates seek completing). */
    fireSeek() { seekedHandlers.splice(0).forEach(h => h()) },
    seekedHandlers,
  }
}

function mountPlayer() {
  setActivePinia(createPinia())
  const library = useLibraryStore()
  library.currentFile = makeFile()
  library.isPlaying = false

  const wrapper = mount(Player)
  const audioEl = wrapper.find('audio').element as HTMLAudioElement
  const mock = mockAudio(audioEl)
  const scrubber = wrapper.find('.scrubber')

  return { wrapper, library, audioEl, mock, scrubber }
}

// ─── formatTime ──────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats seconds correctly', async () => {
    const { wrapper } = mountPlayer()
    // fire loadedmetadata to set duration (the component reads audioEl.duration via onLoaded)
    const audio = wrapper.find('audio').element as HTMLAudioElement
    mockAudio(audio, 125)
    await audio.dispatchEvent(new Event('loadedmetadata'))
    await wrapper.vm.$nextTick()

    // Duration span shows 2:05 for 125s
    const timeSpans = wrapper.findAll('.time')
    expect(timeSpans[1].text()).toBe('2:05')
  })

  it('shows 0:00 for 0', () => {
    setActivePinia(createPinia())
    const library = useLibraryStore()
    library.currentFile = makeFile()
    const wrapper = mount(Player)
    // Both time spans default to 0:00 before audio loads
    const timeSpans = wrapper.findAll('.time')
    expect(timeSpans[0].text()).toBe('0:00')
    expect(timeSpans[1].text()).toBe('0:00')
  })
})

// ─── scrub start (pointerdown) ────────────────────────────────────────────────

describe('scrub start', () => {
  it('pauses audio on pointerdown when playing', async () => {
    const { library, audioEl, mock, scrubber } = mountPlayer()
    library.isPlaying = true
    await scrubber.trigger('pointerdown')
    expect(audioEl.pause).toHaveBeenCalled()
  })

  it('does not throw on pointerdown when paused', async () => {
    const { scrubber } = mountPlayer()
    await expect(scrubber.trigger('pointerdown')).resolves.not.toThrow()
  })
})

// ─── scrub input (live drag) ──────────────────────────────────────────────────

describe('scrub input', () => {
  it('updates the current-time display as scrubber moves', async () => {
    const { audioEl, mock, scrubber, wrapper } = mountPlayer()
    // Set duration so the scrubber max is valid
    mockAudio(audioEl, 60)
    await audioEl.dispatchEvent(new Event('loadedmetadata'))

    await scrubber.trigger('pointerdown')
    // Simulate moving to 30s
    ;(scrubber.element as HTMLInputElement).value = '30'
    await scrubber.trigger('input')
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.time')[0].text()).toBe('0:30')
  })
})

// ─── scrub end (pointerup) ────────────────────────────────────────────────────

describe('scrub end', () => {
  it('seeks audio to the scrubber position on pointerup', async () => {
    const { audioEl, mock, scrubber } = mountPlayer()
    mockAudio(audioEl, 60)
    await audioEl.dispatchEvent(new Event('loadedmetadata'))

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '45'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    expect(audioEl.currentTime).toBe(45)
  })

  it('resumes playback after seek if audio was playing before scrub', async () => {
    const { library, audioEl, mock, scrubber } = mountPlayer()
    library.isPlaying = true
    const freshMock = mockAudio(audioEl, 60)
    await audioEl.dispatchEvent(new Event('loadedmetadata'))

    await scrubber.trigger('pointerdown')   // pauses + stores wasPlayingBeforeScrub
    ;(scrubber.element as HTMLInputElement).value = '20'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')     // calls seekTo, adds seeked listener
    freshMock.fireSeek()                    // simulate audio seeked event

    expect(audioEl.play).toHaveBeenCalled()
  })

  it('does not resume playback if audio was paused before scrub', async () => {
    const { library, audioEl, mock, scrubber } = mountPlayer()
    library.isPlaying = false
    const freshMock = mockAudio(audioEl, 60)
    await audioEl.dispatchEvent(new Event('loadedmetadata'))

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '20'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')
    freshMock.fireSeek()

    expect(audioEl.play).not.toHaveBeenCalled()
  })

  it('clamps seek value to 0 when scrubber value would be negative', async () => {
    const { audioEl, mock, scrubber } = mountPlayer()
    mockAudio(audioEl, 60)
    await audioEl.dispatchEvent(new Event('loadedmetadata'))

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '-5'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    expect(audioEl.currentTime).toBe(0)
  })

  it('clamps seek value to duration when scrubber value exceeds it', async () => {
    const { audioEl, mock, scrubber } = mountPlayer()
    mockAudio(audioEl, 60)
    await audioEl.dispatchEvent(new Event('loadedmetadata'))

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '999'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    expect(audioEl.currentTime).toBe(60)
  })
})

// ─── isScrubbing guard (timeupdate) ──────────────────────────────────────────

describe('timeupdate guard during scrub', () => {
  it('does not snap currentTime back when timeupdate fires during scrub', async () => {
    const { audioEl, mock, scrubber, wrapper } = mountPlayer()
    const freshMock = mockAudio(audioEl, 60)
    await audioEl.dispatchEvent(new Event('loadedmetadata'))

    // Drag to 40s
    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '40'
    await scrubber.trigger('input')
    await wrapper.vm.$nextTick()

    // Simulate a timeupdate while still scrubbing; audio position is still at 0
    // (freshMock.currentTime is 0 until we explicitly set it)
    await audioEl.dispatchEvent(new Event('timeupdate'))
    await wrapper.vm.$nextTick()

    // The displayed time should still be 40, not snapped back to 0
    expect(wrapper.findAll('.time')[0].text()).toBe('0:40')
  })

  it('resumes timeupdate updates after seeked fires', async () => {
    const { audioEl, mock, scrubber, wrapper } = mountPlayer()
    const freshMock = mockAudio(audioEl, 60)
    await audioEl.dispatchEvent(new Event('loadedmetadata'))

    await scrubber.trigger('pointerdown')
    ;(scrubber.element as HTMLInputElement).value = '40'
    await scrubber.trigger('input')
    await scrubber.trigger('pointerup')

    // Seek completes — isScrubbing clears
    freshMock.fireSeek()
    await wrapper.vm.$nextTick()

    // Now update the mock audio position to 41 and fire timeupdate
    ;(audioEl as any).__currentTime = 41
    Object.defineProperty(audioEl, 'currentTime', {
      get: () => 41,
      configurable: true,
    })
    await audioEl.dispatchEvent(new Event('timeupdate'))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.time')[0].text()).toBe('0:41')
  })
})

// ─── keyboard scrubbing (@change) ────────────────────────────────────────────

describe('keyboard scrubbing', () => {
  it('seeks when change fires without a prior pointerdown (keyboard arrows)', async () => {
    const { audioEl, mock, scrubber } = mountPlayer()
    const freshMock = mockAudio(audioEl, 60)
    await audioEl.dispatchEvent(new Event('loadedmetadata'))

    // No pointerdown — simulate keyboard arrow key changing the value
    ;(scrubber.element as HTMLInputElement).value = '15'
    await scrubber.trigger('change')

    expect(audioEl.currentTime).toBe(15)
  })
})
