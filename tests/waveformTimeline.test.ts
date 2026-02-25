import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// --- Mock wavesurfer region ---
function createMockRegion(opts: Record<string, any> = {}) {
  return {
    id: opts.id || 'test-region',
    start: opts.start ?? 0,
    end: opts.end ?? 0,
    setOptions: vi.fn(function (this: any, newOpts: any) {
      if (newOpts.start !== undefined) this.start = newOpts.start
      if (newOpts.end !== undefined) this.end = newOpts.end
    }),
    remove: vi.fn(),
    on: vi.fn(),
  }
}

// --- Mock regions plugin ---
let regionsList: ReturnType<typeof createMockRegion>[] = []
let regionEventHandlers: Record<string, Function[]> = {}

const mockRegionsPlugin = {
  addRegion: vi.fn((opts: any) => {
    const region = createMockRegion(opts)
    regionsList.push(region)
    const handlers = regionEventHandlers['region-created'] || []
    handlers.forEach(h => h(region))
    return region
  }),
  clearRegions: vi.fn(() => {
    regionsList = []
  }),
  getRegions: vi.fn(() => regionsList),
  enableDragSelection: vi.fn(() => vi.fn()),
  on: vi.fn((event: string, handler: Function) => {
    if (!regionEventHandlers[event]) regionEventHandlers[event] = []
    regionEventHandlers[event].push(handler)
  }),
  destroy: vi.fn(),
}

// --- Mock wavesurfer instance ---
let wsEventHandlers: Record<string, Function[]> = {}

const mockWaveSurfer = {
  registerPlugin: vi.fn(() => mockRegionsPlugin),
  on: vi.fn((event: string, handler: Function) => {
    if (!wsEventHandlers[event]) wsEventHandlers[event] = []
    wsEventHandlers[event].push(handler)
  }),
  destroy: vi.fn(),
  getDuration: vi.fn(() => 5),
  getCurrentTime: vi.fn(() => 0),
  setOptions: vi.fn(),
}

vi.mock('wavesurfer.js', () => ({
  default: {
    create: vi.fn(() => mockWaveSurfer),
  },
}))

vi.mock('wavesurfer.js/dist/plugins/regions.esm.js', () => ({
  default: {
    create: vi.fn(() => mockRegionsPlugin),
  },
}))

// --- Mock electronAPI ---
const mockGetWaveformPeaks = vi.fn().mockResolvedValue(new Array(800).fill(0.5))

const mockElectronAPI = {
  selectDirectory: vi.fn(),
  startScan: vi.fn(),
  onScanProgress: vi.fn(),
  onScanDone: vi.fn(),
  removeScanListeners: vi.fn(),
  readMetadata: vi.fn(),
  writeMetadata: vi.fn().mockResolvedValue(undefined),
  getAudioDuration: vi.fn().mockResolvedValue(5),
  showInFinder: vi.fn(),
  copyPath: vi.fn(),
  showContextMenu: vi.fn(),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
  createDirectory: vi.fn(),
  resolveDroppedPaths: vi.fn(),
  copyFileToLibrary: vi.fn(),
  onContextMenuPlay: vi.fn(),
  onContextMenuAddTag: vi.fn(),
  onContextMenuEditDescription: vi.fn(),
  onContextMenuDelete: vi.fn(),
  onContextMenuRename: vi.fn(),
  onContextMenuAddToSoundboard: vi.fn(),
  onContextMenuQuickAddToSoundboard: vi.fn(),
  onContextMenuQuickTag: vi.fn(),
  showSoundboardItemMenu: vi.fn(),
  onSbItemPlay: vi.fn(),
  onSbItemEdit: vi.fn(),
  onSbItemRemove: vi.fn(),
  onSbItemViewData: vi.fn(),
  startDrag: vi.fn(),
  readFile: vi.fn(),
  readFileBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
  writeFile: vi.fn(),
  saveFileDialog: vi.fn(),
  selectFile: vi.fn(),
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
  getWaveformPeaks: mockGetWaveformPeaks,
}

;(window as any).electronAPI = mockElectronAPI

// --- Mock getComputedStyle ---
const originalGetComputedStyle = window.getComputedStyle
vi.stubGlobal('getComputedStyle', (el: Element) => {
  const orig = originalGetComputedStyle(el)
  return new Proxy(orig, {
    get(target, prop) {
      if (prop === 'getPropertyValue') {
        return (p: string) => {
          const vars: Record<string, string> = {
            '--bg-primary': '#1e1e1e',
            '--bg-secondary': '#252525',
            '--text-muted': '#666666',
            '--accent': '#4da6ff',
            '--border': '#3a3a3a',
            '--danger': '#ff4d4d',
          }
          return vars[p] || ''
        }
      }
      return (target as any)[prop]
    },
  })
})

// ---- Import component AFTER mocks are set up ----
import WaveformTimeline from '../src/components/WaveformTimeline.vue'

function resetMocks() {
  regionsList = []
  regionEventHandlers = {}
  wsEventHandlers = {}
  vi.clearAllMocks()
  mockGetWaveformPeaks.mockResolvedValue(new Array(800).fill(0.5))
  mockWaveSurfer.getDuration.mockReturnValue(5)
}

function createWrapper(propsOverride: Record<string, any> = {}) {
  return mount(WaveformTimeline, {
    props: {
      filePath: '/test/sound.wav',
      duration: 5,
      mode: 'offset' as const,
      offset: undefined,
      rangeStart: undefined,
      rangeEnd: undefined,
      ...propsOverride,
    },
    attachTo: document.body,
  })
}

async function flushPromises() {
  await new Promise(r => setTimeout(r, 0))
  await nextTick()
}

describe('WaveformTimeline', () => {
  beforeEach(() => {
    resetMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---- Component rendering ----

  it('renders container with waveform-timeline class', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.waveform-timeline').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows loading state initially', () => {
    mockGetWaveformPeaks.mockReturnValue(new Promise(() => {})) // never resolves
    const wrapper = createWrapper()
    expect(wrapper.find('.waveform-overlay').exists()).toBe(true)
    expect(wrapper.find('.waveform-overlay').text()).toBe('Loading waveform...')
    wrapper.unmount()
  })

  it('shows error when getWaveformPeaks fails', async () => {
    mockGetWaveformPeaks.mockRejectedValue(new Error('File not found'))
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('.waveform-error').exists()).toBe(true)
    expect(wrapper.find('.waveform-error').text()).toBe('File not found')
    wrapper.unmount()
  })

  it('creates wavesurfer instance on mount with pre-computed peaks', async () => {
    const WaveSurfer = (await import('wavesurfer.js')).default
    const wrapper = createWrapper()
    await flushPromises()
    expect(WaveSurfer.create).toHaveBeenCalledTimes(1)
    const createOpts = (WaveSurfer.create as any).mock.calls[0][0]
    expect(createOpts.height).toBe(98)
    expect(createOpts.barWidth).toBe(2)
    expect(createOpts.interact).toBe(true)
    expect(createOpts.normalize).toBe(true)
    expect(createOpts.peaks).toEqual([new Array(800).fill(0.5)])
    expect(createOpts.duration).toBe(5)
    wrapper.unmount()
  })

  it('destroys wavesurfer on unmount', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.unmount()
    expect(mockWaveSurfer.destroy).toHaveBeenCalled()
  })

  it('calls getWaveformPeaks IPC with correct path and width', async () => {
    const wrapper = createWrapper({ filePath: '/Users/test/sounds/kick.wav' })
    await flushPromises()
    expect(mockGetWaveformPeaks).toHaveBeenCalledWith('/Users/test/sounds/kick.wav', 800)
    wrapper.unmount()
  })

  it('loading state clears after successful load', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('.waveform-overlay').exists()).toBe(false)
    expect(wrapper.find('.waveform-container').exists()).toBe(true)
    wrapper.unmount()
  })

  it('does not call loadBlob or readFileBuffer (no AudioContext decoding)', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(mockElectronAPI.readFileBuffer).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  // ---- Offset mode ----

  it('creates marker region when mode is offset', async () => {
    const wrapper = createWrapper({ mode: 'offset', offset: 1.5 })
    await flushPromises()
    expect(mockRegionsPlugin.addRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'offset-marker',
        start: 1.5,
        end: 1.5,
        drag: true,
        resize: false,
      })
    )
    wrapper.unmount()
  })

  it('emits update:offset on region drag (region-updated)', async () => {
    const wrapper = createWrapper({ mode: 'offset', offset: 0 })
    await flushPromises()

    const regionUpdatedHandler = regionEventHandlers['region-updated']?.[0]
    expect(regionUpdatedHandler).toBeDefined()
    regionUpdatedHandler({ id: 'offset-marker', start: 2.3, end: 2.3 })

    expect(wrapper.emitted('update:offset')).toBeTruthy()
    expect(wrapper.emitted('update:offset')![0][0]).toBe(2.3)
    wrapper.unmount()
  })

  it('updates marker position when offset prop changes', async () => {
    const wrapper = createWrapper({ mode: 'offset', offset: 1 })
    await flushPromises()

    const marker = regionsList.find(r => r.id === 'offset-marker')
    expect(marker).toBeDefined()

    await wrapper.setProps({ offset: 3 })
    await nextTick()

    expect(marker!.setOptions).toHaveBeenCalledWith({ start: 3, end: 3 })
    wrapper.unmount()
  })

  it('offset clamped to [0, duration]', async () => {
    const wrapper = createWrapper({ mode: 'offset', offset: 0 })
    await flushPromises()

    const clickHandler = wsEventHandlers['click']?.[0]
    expect(clickHandler).toBeDefined()
    // relativeX of 1.5 → 7.5s which exceeds duration 5
    clickHandler(1.5)

    const emitted = wrapper.emitted('update:offset')
    expect(emitted).toBeTruthy()
    const val = emitted![0][0] as number
    expect(val).toBeLessThanOrEqual(5)
    expect(val).toBeGreaterThanOrEqual(0)
    wrapper.unmount()
  })

  it('click on waveform moves offset marker', async () => {
    const wrapper = createWrapper({ mode: 'offset', offset: 0 })
    await flushPromises()

    const clickHandler = wsEventHandlers['click']?.[0]
    clickHandler(0.5) // 50% of 5s = 2.5s

    const emitted = wrapper.emitted('update:offset')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe(2.5)
    wrapper.unmount()
  })

  // ---- Range mode ----

  it('creates range region when mode is range', async () => {
    const wrapper = createWrapper({ mode: 'range', rangeStart: 1, rangeEnd: 3 })
    await flushPromises()
    expect(mockRegionsPlugin.addRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'range-region',
        start: 1,
        end: 3,
        drag: true,
        resize: true,
      })
    )
    wrapper.unmount()
  })

  it('emits update:rangeStart and update:rangeEnd on region resize', async () => {
    const wrapper = createWrapper({ mode: 'range', rangeStart: 1, rangeEnd: 3 })
    await flushPromises()

    const regionUpdatedHandler = regionEventHandlers['region-updated']?.[0]
    regionUpdatedHandler({ id: 'range-region', start: 0.5, end: 4.0 })

    expect(wrapper.emitted('update:rangeStart')).toBeTruthy()
    expect(wrapper.emitted('update:rangeEnd')).toBeTruthy()
    expect(wrapper.emitted('update:rangeStart')![0][0]).toBe(0.5)
    expect(wrapper.emitted('update:rangeEnd')![0][0]).toBe(4.0)
    wrapper.unmount()
  })

  it('updates region when range props change', async () => {
    const wrapper = createWrapper({ mode: 'range', rangeStart: 1, rangeEnd: 3 })
    await flushPromises()

    const region = regionsList.find(r => r.id === 'range-region')
    expect(region).toBeDefined()

    await wrapper.setProps({ rangeStart: 0.5, rangeEnd: 4 })
    await nextTick()

    expect(region!.setOptions).toHaveBeenCalledWith({ start: 0.5, end: 4 })
    wrapper.unmount()
  })

  it('enables drag selection in range mode', async () => {
    const wrapper = createWrapper({ mode: 'range', rangeStart: 0, rangeEnd: 5 })
    await flushPromises()
    expect(mockRegionsPlugin.enableDragSelection).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  // ---- Mode switching ----

  it('clears regions on mode change', async () => {
    const wrapper = createWrapper({ mode: 'offset', offset: 1 })
    await flushPromises()
    vi.clearAllMocks()

    await wrapper.setProps({ mode: 'range', rangeStart: 0, rangeEnd: 5 })
    await nextTick()

    expect(mockRegionsPlugin.clearRegions).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('creates appropriate region type for new mode after switch', async () => {
    const wrapper = createWrapper({ mode: 'offset', offset: 1 })
    await flushPromises()
    vi.clearAllMocks()

    await wrapper.setProps({ mode: 'range', rangeStart: 1, rangeEnd: 4 })
    await nextTick()

    expect(mockRegionsPlugin.addRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'range-region',
        start: 1,
        end: 4,
      })
    )
    wrapper.unmount()
  })

  it('switches from range to offset mode correctly', async () => {
    const wrapper = createWrapper({ mode: 'range', rangeStart: 1, rangeEnd: 3 })
    await flushPromises()
    vi.clearAllMocks()

    await wrapper.setProps({ mode: 'offset', offset: 2 })
    await nextTick()

    expect(mockRegionsPlugin.clearRegions).toHaveBeenCalled()
    expect(mockRegionsPlugin.addRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'offset-marker',
        start: 2,
        end: 2,
      })
    )
    wrapper.unmount()
  })

  // ---- Edge cases ----

  it('zero duration does not crash', async () => {
    expect(() => createWrapper({ duration: 0 })).not.toThrow()
    const wrapper = createWrapper({ duration: 0 })
    await flushPromises()
    wrapper.unmount()
  })

  it('missing filePath shows error gracefully', async () => {
    const wrapper = createWrapper({ filePath: '' })
    await flushPromises()
    expect(wrapper.find('.waveform-error').exists()).toBe(true)
    expect(wrapper.find('.waveform-error').text()).toBe('No file path provided')
    wrapper.unmount()
  })

  it('loading state transitions correctly (loading → loaded)', async () => {
    let resolveLoad!: (v: number[]) => void
    mockGetWaveformPeaks.mockReturnValue(new Promise(r => { resolveLoad = r }))

    const wrapper = createWrapper()
    await nextTick()
    expect(wrapper.find('.waveform-overlay').exists()).toBe(true)

    resolveLoad(new Array(800).fill(0.5))
    await flushPromises()
    expect(wrapper.find('.waveform-overlay').exists()).toBe(false)
    wrapper.unmount()
  })

  it('error state renders message text', async () => {
    mockGetWaveformPeaks.mockRejectedValue(new Error('Custom error message'))
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('.waveform-error').text()).toBe('Custom error message')
    wrapper.unmount()
  })

  it('non-Error rejection shows fallback message', async () => {
    mockGetWaveformPeaks.mockRejectedValue('string error')
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('.waveform-error').text()).toBe('Failed to load waveform')
    wrapper.unmount()
  })

  it('registers regions plugin', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(mockWaveSurfer.registerPlugin).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('offset defaults to 0 when undefined', async () => {
    const wrapper = createWrapper({ mode: 'offset', offset: undefined })
    await flushPromises()
    expect(mockRegionsPlugin.addRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'offset-marker',
        start: 0,
        end: 0,
      })
    )
    wrapper.unmount()
  })

  it('range defaults to full duration when undefined', async () => {
    const wrapper = createWrapper({ mode: 'range', rangeStart: undefined, rangeEnd: undefined })
    await flushPromises()
    expect(mockRegionsPlugin.addRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'range-region',
        start: 0,
        end: 5,
      })
    )
    wrapper.unmount()
  })

  it('does not emit during prop-driven region updates (no feedback loop)', async () => {
    const wrapper = createWrapper({ mode: 'offset', offset: 1 })
    await flushPromises()

    await wrapper.setProps({ offset: 3 })
    await nextTick()

    expect(wrapper.emitted('update:offset')).toBeFalsy()
    wrapper.unmount()
  })

  it('does not enable drag selection in offset mode', async () => {
    const wrapper = createWrapper({ mode: 'offset', offset: 0 })
    await flushPromises()
    expect(mockRegionsPlugin.enableDragSelection).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('container is always in DOM (not hidden by v-if)', async () => {
    // Container uses v-show-less approach — always visible so wavesurfer has dimensions
    const wrapper = createWrapper()
    expect(wrapper.find('.waveform-container').exists()).toBe(true)
    wrapper.unmount()
  })
})
