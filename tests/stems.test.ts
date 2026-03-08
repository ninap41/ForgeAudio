import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLibraryStore, _resetLibraryStore, type AudioFile, type StemInfo, type StemFile, type StemGroup } from '../src/stores/libraryStore'
import { _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'
import { _resetSoundboardStore } from '../src/stores/soundboardStore'

const mockElectronAPI = {
  selectDirectory: vi.fn(),
  startScan: vi.fn(),
  onScanProgress: vi.fn(),
  onScanDone: vi.fn(),
  removeScanListeners: vi.fn(),
  readMetadata: vi.fn(),
  writeMetadata: vi.fn(),
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
  backupCreate: vi.fn(),
  backupList: vi.fn(),
  backupDelete: vi.fn(),
  backupRestore: vi.fn(),
  saveFileDialog: vi.fn(),
  selectFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  checkStemsAvailable: vi.fn(),
  startStemSeparation: vi.fn(),
  cancelStemSeparation: vi.fn(),
  listStems: vi.fn(),
  getStemOutputDir: vi.fn(),
  onStemsProgress: vi.fn(),
  onStemsComplete: vi.fn(),
  onStemsError: vi.fn(),
  removeStemsListeners: vi.fn(),
  onContextMenuSeparateStems: vi.fn(),
  deleteStems: vi.fn(),
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

function makeCompletedStems(baseName = 'test'): StemInfo {
  return {
    status: 'completed',
    model: 'htdemucs',
    createdAt: '2026-03-01T00:00:00Z',
    tracks: ['drums', 'vocals', 'bass', 'other'],
    outputDir: `/sounds/.forgeaudio/stems/htdemucs/${baseName}`,
  }
}

beforeEach(() => {
  _resetLibraryStore()
  _resetTagStore()
  _resetThemeStore()
  _resetSoundboardStore()
  vi.resetAllMocks()
  mockElectronAPI.writeMetadata.mockResolvedValue(undefined)
  mockElectronAPI.deleteFile.mockResolvedValue({ success: true })
  mockElectronAPI.backupCreate.mockResolvedValue({})
  mockElectronAPI.backupList.mockResolvedValue([])
})

describe('stems', () => {
  describe('StemInfo on AudioFile', () => {
    it('AudioFile can have stems property', () => {
      const file = makeFile({ stems: makeCompletedStems() })
      expect(file.stems).toBeDefined()
      expect(file.stems!.status).toBe('completed')
      expect(file.stems!.tracks).toEqual(['drums', 'vocals', 'bass', 'other'])
    })

    it('AudioFile stems is optional', () => {
      const file = makeFile()
      expect(file.stems).toBeUndefined()
    })
  })

  describe('saveMetadata preserves stems', () => {
    it('persists files with stems even if no tags/description/lastPlayed', async () => {
      const store = useLibraryStore()
      store.files = [makeFile({ stems: makeCompletedStems() })]

      await store.saveMetadata()

      const written = JSON.parse(mockElectronAPI.writeMetadata.mock.calls[0][0])
      expect(written.files['test.wav']).toBeDefined()
      expect(written.files['test.wav'].stems).toBeDefined()
      expect(written.files['test.wav'].stems.status).toBe('completed')
    })

    it('does not persist files with no data and no stems', async () => {
      const store = useLibraryStore()
      store.files = [makeFile()]

      await store.saveMetadata()

      const written = JSON.parse(mockElectronAPI.writeMetadata.mock.calls[0][0])
      expect(written.files['test.wav']).toBeUndefined()
    })
  })

  describe('scan merge carries stems', () => {
    it('restores stems from metadata during rescan', async () => {
      const store = useLibraryStore()
      store.rootDirectory = '/sounds'

      const meta = {
        version: 1,
        files: {
          'test.wav': {
            tags: [],
            description: '',
            lastPlayed: null,
            stems: makeCompletedStems(),
          },
        },
        tags: {},
      }
      mockElectronAPI.readMetadata.mockResolvedValue(JSON.stringify(meta))

      // Simulate scan flow
      let scanProgressCb: (batch: any[]) => void
      let scanDoneCb: () => void
      mockElectronAPI.onScanProgress.mockImplementation((cb: any) => { scanProgressCb = cb })
      mockElectronAPI.onScanDone.mockImplementation((cb: any) => { scanDoneCb = cb })
      mockElectronAPI.startScan.mockImplementation(() => {
        scanProgressCb([{ path: '/sounds/test.wav', name: 'test.wav', extension: '.wav', size: 1024, createdAt: null, modifiedAt: null }])
        scanDoneCb()
      })

      await store.rescan()

      expect(store.files[0].stems).toBeDefined()
      expect(store.files[0].stems!.status).toBe('completed')
      expect(store.files[0].stems!.tracks).toEqual(['drums', 'vocals', 'bass', 'other'])
    })
  })

  describe('profile snapshot preserves stems', () => {
    it('includes stems in getProfileSnapshot', () => {
      const store = useLibraryStore()
      store.files = [makeFile({ stems: makeCompletedStems() })]

      const snapshot = store.getProfileSnapshot()
      expect(snapshot.files['test.wav'].stems).toBeDefined()
      expect(snapshot.files['test.wav'].stems!.status).toBe('completed')
    })

    it('restores stems via applyProfileData', () => {
      const store = useLibraryStore()
      store.files = [makeFile()]

      const snapshot = {
        files: {
          'test.wav': {
            tags: [],
            description: '',
            lastPlayed: null,
            stems: makeCompletedStems(),
          },
        },
        tags: {},
      }

      store.applyProfileData(snapshot)
      expect(store.files[0].stems).toBeDefined()
      expect(store.files[0].stems!.status).toBe('completed')
    })

    it('clears stems when profile has no stem data', () => {
      const store = useLibraryStore()
      store.files = [makeFile({ stems: makeCompletedStems() })]

      const snapshot = {
        files: {
          'test.wav': {
            tags: [],
            description: '',
            lastPlayed: null,
          },
        },
        tags: {},
      }

      store.applyProfileData(snapshot)
      expect(store.files[0].stems).toBeUndefined()
    })
  })

  describe('separation state refs', () => {
    it('initial state is idle', () => {
      const store = useLibraryStore()
      expect(store.separatingFile).toBeNull()
      expect(store.separationProgress).toBe(0)
      expect(store.separationMessage).toBe('')
    })

    it('reset clears separation state', () => {
      const store = useLibraryStore()
      // Manually set some state
      store.separatingFile = '/sounds/test.wav'
      store.separationProgress = 50
      store.separationMessage = 'Processing...'

      _resetLibraryStore()
      const store2 = useLibraryStore()
      expect(store2.separatingFile).toBeNull()
      expect(store2.separationProgress).toBe(0)
      expect(store2.separationMessage).toBe('')
    })
  })

  describe('allStemFiles computed', () => {
    it('returns empty array when no files have stems', () => {
      const store = useLibraryStore()
      store.files = [makeFile(), makeFile({ path: '/sounds/b.wav', name: 'b.wav' })]
      expect(store.allStemFiles).toHaveLength(0)
    })

    it('returns 4 stem files for a completed separation', () => {
      const store = useLibraryStore()
      store.files = [makeFile({ stems: makeCompletedStems() })]

      expect(store.allStemFiles).toHaveLength(4)
      expect(store.allStemFiles.map((s: StemFile) => s.stemType)).toEqual(['drums', 'vocals', 'bass', 'other'])
    })

    it('constructs correct display names', () => {
      const store = useLibraryStore()
      store.files = [makeFile({ name: 'mysong.wav', stems: makeCompletedStems('mysong') })]

      const names = store.allStemFiles.map((s: StemFile) => s.displayName)
      expect(names).toEqual([
        'mysong_drums.wav',
        'mysong_vocals.wav',
        'mysong_bass.wav',
        'mysong_other.wav',
      ])
    })

    it('constructs correct paths', () => {
      const store = useLibraryStore()
      store.files = [makeFile({ name: 'mysong.wav', stems: makeCompletedStems('mysong') })]

      const paths = store.allStemFiles.map((s: StemFile) => s.path)
      expect(paths).toEqual([
        '/sounds/.forgeaudio/stems/htdemucs/mysong/drums.wav',
        '/sounds/.forgeaudio/stems/htdemucs/mysong/vocals.wav',
        '/sounds/.forgeaudio/stems/htdemucs/mysong/bass.wav',
        '/sounds/.forgeaudio/stems/htdemucs/mysong/other.wav',
      ])
    })

    it('ignores files with non-completed stems', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ stems: { ...makeCompletedStems(), status: 'processing' } }),
        makeFile({ path: '/sounds/b.wav', name: 'b.wav', stems: { ...makeCompletedStems(), status: 'failed' } }),
      ]
      expect(store.allStemFiles).toHaveLength(0)
    })

    it('includes stems from multiple files', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'a.wav', stems: makeCompletedStems('a') }),
        makeFile({ path: '/sounds/b.wav', name: 'b.wav', stems: makeCompletedStems('b') }),
      ]
      expect(store.allStemFiles).toHaveLength(8)
    })

    it('preserves source file info', () => {
      const store = useLibraryStore()
      store.files = [makeFile({ name: 'mysong.wav', path: '/sounds/mysong.wav', stems: makeCompletedStems('mysong') })]

      const stem = store.allStemFiles[0]
      expect(stem.sourceFileName).toBe('mysong.wav')
      expect(stem.sourcePath).toBe('/sounds/mysong.wav')
    })
  })

  describe('playStem', () => {
    it('constructs a virtual AudioFile and plays it', () => {
      const store = useLibraryStore()
      const stem: StemFile = {
        sourceFileName: 'test.wav',
        sourcePath: '/sounds/test.wav',
        stemType: 'drums',
        displayName: 'test_drums.wav',
        path: '/sounds/.forgeaudio/stems/htdemucs/test/drums.wav',
        duration: 2.5,
      }

      store.playStem(stem)

      expect(store.currentFile).toBeDefined()
      expect(store.currentFile!.path).toBe('/sounds/.forgeaudio/stems/htdemucs/test/drums.wav')
      expect(store.currentFile!.name).toBe('test_drums.wav')
      expect(store.isPlaying).toBe(true)
    })
  })

  describe('handleStemsProgress', () => {
    it('updates progress when inputPath matches', () => {
      const store = useLibraryStore()
      store.separatingFile = '/sounds/test.wav'
      store.separatingFileName = 'test.wav'

      store.handleStemsProgress({
        inputPath: '/sounds/test.wav',
        percent: 42,
        message: 'Separating stems... 42%',
      })

      expect(store.separationProgress).toBe(42)
      expect(store.separationMessage).toBe('Separating stems for test.wav... 42%')
    })

    it('ignores progress for non-matching file', () => {
      const store = useLibraryStore()
      store.separatingFile = '/sounds/test.wav'

      store.handleStemsProgress({
        inputPath: '/sounds/other.wav',
        percent: 50,
        message: 'Separating...',
      })

      expect(store.separationProgress).toBe(0)
    })
  })

  describe('handleStemsComplete', () => {
    it('sets file stems to completed', () => {
      const store = useLibraryStore()
      const file = makeFile({ stems: { status: 'processing', model: 'htdemucs', createdAt: '2026-03-01T00:00:00Z', tracks: [], outputDir: '' } })
      store.files = [file]
      store.separatingFile = '/sounds/test.wav'

      store.handleStemsComplete({
        inputPath: '/sounds/test.wav',
        tracks: ['drums', 'vocals', 'bass', 'other'],
        outputDir: '/sounds/.forgeaudio/stems/htdemucs/test',
      })

      expect(store.files[0].stems!.status).toBe('completed')
      expect(store.files[0].stems!.tracks).toEqual(['drums', 'vocals', 'bass', 'other'])
      expect(store.separatingFile).toBeNull()
      expect(store.separationProgress).toBe(100)
    })

    it('preserves model from processing stems info', () => {
      const store = useLibraryStore()
      const file = makeFile({ stems: { status: 'processing', model: 'htdemucs_6s', createdAt: '2026-03-01T00:00:00Z', tracks: [], outputDir: '' } })
      store.files = [file]
      store.separatingFile = '/sounds/test.wav'

      store.handleStemsComplete({
        inputPath: '/sounds/test.wav',
        tracks: ['drums', 'vocals', 'bass', 'other', 'guitar', 'piano'],
        outputDir: '/sounds/.forgeaudio/stems/htdemucs_6s/test',
      })

      expect(store.files[0].stems!.model).toBe('htdemucs_6s')
      expect(store.files[0].stems!.tracks).toEqual(['drums', 'vocals', 'bass', 'other', 'guitar', 'piano'])
    })

    it('preserves htdemucs_ft model', () => {
      const store = useLibraryStore()
      const file = makeFile({ stems: { status: 'processing', model: 'htdemucs_ft', createdAt: '2026-03-01T00:00:00Z', tracks: [], outputDir: '' } })
      store.files = [file]
      store.separatingFile = '/sounds/test.wav'

      store.handleStemsComplete({
        inputPath: '/sounds/test.wav',
        tracks: ['drums', 'vocals', 'bass', 'other'],
        outputDir: '/sounds/.forgeaudio/stems/htdemucs_ft/test',
      })

      expect(store.files[0].stems!.model).toBe('htdemucs_ft')
    })
  })

  describe('handleStemsError', () => {
    it('sets file stems to failed', () => {
      const store = useLibraryStore()
      const file = makeFile({ stems: { status: 'processing', model: 'htdemucs', createdAt: '2026-03-01T00:00:00Z', tracks: [], outputDir: '' } })
      store.files = [file]
      store.separatingFile = '/sounds/test.wav'

      store.handleStemsError({
        inputPath: '/sounds/test.wav',
        error: 'Demucs crashed',
      })

      expect(store.files[0].stems!.status).toBe('failed')
      expect(store.separatingFile).toBeNull()
      expect(store.separationMessage).toBe('Demucs crashed')
    })
  })

  describe('startStemSeparation', () => {
    it('returns error if already separating', async () => {
      const store = useLibraryStore()
      store.separatingFile = '/sounds/other.wav'

      const result = await store.startStemSeparation(makeFile())
      expect(result.error).toBe('A stem separation is already in progress')
    })

    it('returns error if no root directory', async () => {
      const store = useLibraryStore()
      store.rootDirectory = null

      const result = await store.startStemSeparation(makeFile())
      expect(result.error).toBe('No library directory set')
    })

    it('returns error if demucs unavailable', async () => {
      const store = useLibraryStore()
      store.rootDirectory = '/sounds'
      mockElectronAPI.checkStemsAvailable.mockResolvedValue({ available: false, error: 'Not installed' })

      const result = await store.startStemSeparation(makeFile())
      expect(result.error).toBe('Not installed')
    })

    it('starts separation when demucs is available', async () => {
      const store = useLibraryStore()
      store.rootDirectory = '/sounds'
      mockElectronAPI.checkStemsAvailable.mockResolvedValue({ available: true })

      const file = makeFile()
      store.files = [file]

      const result = await store.startStemSeparation(file)
      expect(result.error).toBeUndefined()
      expect(store.separatingFile).toBe('/sounds/test.wav')
      expect(file.stems?.status).toBe('processing')
      expect(mockElectronAPI.startStemSeparation).toHaveBeenCalledWith('/sounds/test.wav', '/sounds', 'htdemucs')
    })

    it('starts separation with htdemucs_6s model', async () => {
      const store = useLibraryStore()
      store.rootDirectory = '/sounds'
      mockElectronAPI.checkStemsAvailable.mockResolvedValue({ available: true })

      const file = makeFile()
      store.files = [file]

      const result = await store.startStemSeparation(file, 'htdemucs_6s')
      expect(result.error).toBeUndefined()
      expect(file.stems?.model).toBe('htdemucs_6s')
      expect(mockElectronAPI.startStemSeparation).toHaveBeenCalledWith('/sounds/test.wav', '/sounds', 'htdemucs_6s')
    })

    it('starts separation with htdemucs_ft model', async () => {
      const store = useLibraryStore()
      store.rootDirectory = '/sounds'
      mockElectronAPI.checkStemsAvailable.mockResolvedValue({ available: true })

      const file = makeFile()
      store.files = [file]

      const result = await store.startStemSeparation(file, 'htdemucs_ft')
      expect(result.error).toBeUndefined()
      expect(file.stems?.model).toBe('htdemucs_ft')
      expect(mockElectronAPI.startStemSeparation).toHaveBeenCalledWith('/sounds/test.wav', '/sounds', 'htdemucs_ft')
    })
  })

  describe('selectedStemModel', () => {
    it('defaults to htdemucs', () => {
      const store = useLibraryStore()
      expect(store.selectedStemModel).toBe('htdemucs')
    })

    it('can be changed to htdemucs_6s', () => {
      const store = useLibraryStore()
      store.selectedStemModel = 'htdemucs_6s'
      expect(store.selectedStemModel).toBe('htdemucs_6s')
    })

    it('can be changed to htdemucs_ft', () => {
      const store = useLibraryStore()
      store.selectedStemModel = 'htdemucs_ft'
      expect(store.selectedStemModel).toBe('htdemucs_ft')
    })
  })

  describe('cancelStemSeparation', () => {
    it('cancels and sets status to cancelled', () => {
      const store = useLibraryStore()
      const file = makeFile({ stems: { status: 'processing', model: 'htdemucs', createdAt: '2026-03-01T00:00:00Z', tracks: [], outputDir: '' } })
      store.files = [file]
      store.separatingFile = '/sounds/test.wav'

      store.cancelStemSeparation()

      expect(mockElectronAPI.cancelStemSeparation).toHaveBeenCalledWith('/sounds/test.wav')
      expect(file.stems!.status).toBe('cancelled')
      expect(store.separatingFile).toBeNull()
    })

    it('does nothing if not separating', () => {
      const store = useLibraryStore()
      store.cancelStemSeparation()
      expect(mockElectronAPI.cancelStemSeparation).not.toHaveBeenCalled()
    })
  })

  describe('stemGroups computed', () => {
    it('returns empty array when no files have completed stems', () => {
      const store = useLibraryStore()
      store.files = [makeFile(), makeFile({ path: '/sounds/b.wav', name: 'b.wav' })]
      expect(store.stemGroups).toHaveLength(0)
    })

    it('returns one group per file with completed stems', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ name: 'a.wav', path: '/sounds/a.wav', stems: makeCompletedStems('a') }),
        makeFile({ name: 'b.wav', path: '/sounds/b.wav', stems: makeCompletedStems('b') }),
      ]
      expect(store.stemGroups).toHaveLength(2)
    })

    it('includes correct metadata in each group', () => {
      const store = useLibraryStore()
      store.files = [makeFile({ name: 'mysong.wav', path: '/sounds/mysong.wav', stems: makeCompletedStems('mysong') })]

      const group: StemGroup = store.stemGroups[0]
      expect(group.sourceFileName).toBe('mysong.wav')
      expect(group.sourcePath).toBe('/sounds/mysong.wav')
      expect(group.createdAt).toBe('2026-03-01T00:00:00Z')
      expect(group.stemCount).toBe(4)
      expect(group.outputDir).toBe('/sounds/.forgeaudio/stems/htdemucs/mysong')
      expect(group.model).toBe('htdemucs')
    })

    it('includes correct stems in each group', () => {
      const store = useLibraryStore()
      store.files = [makeFile({ name: 'mysong.wav', path: '/sounds/mysong.wav', stems: makeCompletedStems('mysong') })]

      const group: StemGroup = store.stemGroups[0]
      expect(group.stems).toHaveLength(4)
      expect(group.stems.map((s: StemFile) => s.stemType)).toEqual(['drums', 'vocals', 'bass', 'other'])
      expect(group.stems[0].displayName).toBe('mysong_drums.wav')
    })

    it('handles htdemucs_6s model with 6 stems', () => {
      const store = useLibraryStore()
      const stems6s: StemInfo = {
        status: 'completed',
        model: 'htdemucs_6s',
        createdAt: '2026-03-01T00:00:00Z',
        tracks: ['drums', 'vocals', 'bass', 'other', 'guitar', 'piano'],
        outputDir: '/sounds/.forgeaudio/stems/htdemucs_6s/mysong',
      }
      store.files = [makeFile({ name: 'mysong.wav', path: '/sounds/mysong.wav', stems: stems6s })]

      const group: StemGroup = store.stemGroups[0]
      expect(group.model).toBe('htdemucs_6s')
      expect(group.stemCount).toBe(6)
      expect(group.stems.map((s: StemFile) => s.stemType)).toEqual(['drums', 'vocals', 'bass', 'other', 'guitar', 'piano'])
      expect(group.stems[4].displayName).toBe('mysong_guitar.wav')
      expect(group.stems[5].displayName).toBe('mysong_piano.wav')
      expect(group.stems[4].path).toBe('/sounds/.forgeaudio/stems/htdemucs_6s/mysong/guitar.wav')
    })

    it('ignores files with non-completed stems', () => {
      const store = useLibraryStore()
      store.files = [
        makeFile({ stems: { ...makeCompletedStems(), status: 'processing' } }),
        makeFile({ path: '/sounds/b.wav', name: 'b.wav', stems: { ...makeCompletedStems(), status: 'failed' } }),
      ]
      expect(store.stemGroups).toHaveLength(0)
    })

    it('sorts groups newest first', () => {
      const store = useLibraryStore()
      const olderStems = { ...makeCompletedStems('a'), createdAt: '2026-01-01T00:00:00Z' }
      const newerStems = { ...makeCompletedStems('b'), createdAt: '2026-03-01T00:00:00Z' }
      store.files = [
        makeFile({ name: 'a.wav', path: '/sounds/a.wav', stems: olderStems }),
        makeFile({ name: 'b.wav', path: '/sounds/b.wav', stems: newerStems }),
      ]

      expect(store.stemGroups[0].sourceFileName).toBe('b.wav')
      expect(store.stemGroups[1].sourceFileName).toBe('a.wav')
    })
  })

  describe('deleteIndividualStem', () => {
    it('removes a single track from stems', async () => {
      const store = useLibraryStore()
      mockElectronAPI.deleteFile.mockResolvedValue({ success: true })
      store.files = [makeFile({ stems: makeCompletedStems() })]

      const result = await store.deleteIndividualStem('/sounds/test.wav', 'drums')

      expect(result.error).toBeUndefined()
      expect(store.files[0].stems).toBeDefined()
      expect(store.files[0].stems!.tracks).toEqual(['vocals', 'bass', 'other'])
      expect(mockElectronAPI.deleteFile).toHaveBeenCalledWith('/sounds/.forgeaudio/stems/htdemucs/test/drums.wav')
      expect(mockElectronAPI.writeMetadata).toHaveBeenCalled()
    })

    it('clears stems entirely when last track removed', async () => {
      const store = useLibraryStore()
      mockElectronAPI.deleteFile.mockResolvedValue({ success: true })
      const stems = makeCompletedStems()
      stems.tracks = ['drums']
      store.files = [makeFile({ stems })]

      await store.deleteIndividualStem('/sounds/test.wav', 'drums')

      expect(store.files[0].stems).toBeUndefined()
    })

    it('returns error when file not found', async () => {
      const store = useLibraryStore()
      const result = await store.deleteIndividualStem('/sounds/nonexistent.wav', 'drums')
      expect(result.error).toBe('File not found')
    })

    it('returns error when file has no stems', async () => {
      const store = useLibraryStore()
      store.files = [makeFile()]
      const result = await store.deleteIndividualStem('/sounds/test.wav', 'drums')
      expect(result.error).toBe('No completed stems')
    })

    it('preserves stems on IPC failure', async () => {
      const store = useLibraryStore()
      mockElectronAPI.deleteFile.mockResolvedValue({ success: false, error: 'Permission denied' })
      store.files = [makeFile({ stems: makeCompletedStems() })]

      const result = await store.deleteIndividualStem('/sounds/test.wav', 'drums')

      expect(result.error).toBe('Permission denied')
      expect(store.files[0].stems).toBeDefined()
      expect(store.files[0].stems!.tracks).toHaveLength(4)
    })

    it('stops playback if playing the deleted stem', async () => {
      const store = useLibraryStore()
      mockElectronAPI.deleteFile.mockResolvedValue({ success: true })
      const stems = makeCompletedStems()
      store.files = [makeFile({ stems })]

      store.currentFile = {
        path: `${stems.outputDir}/drums.wav`,
        name: 'test_drums.wav',
        extension: '.wav',
        size: 0,
        duration: 2.5,
        tags: [],
        description: '',
        lastPlayed: null,
        createdAt: null,
        modifiedAt: null,
      }
      store.isPlaying = true

      await store.deleteIndividualStem('/sounds/test.wav', 'drums')

      expect(store.currentFile).toBeNull()
      expect(store.isPlaying).toBe(false)
    })

    it('does NOT stop playback if playing a different stem', async () => {
      const store = useLibraryStore()
      mockElectronAPI.deleteFile.mockResolvedValue({ success: true })
      const stems = makeCompletedStems()
      store.files = [makeFile({ stems })]

      store.currentFile = {
        path: `${stems.outputDir}/vocals.wav`,
        name: 'test_vocals.wav',
        extension: '.wav',
        size: 0,
        duration: 2.5,
        tags: [],
        description: '',
        lastPlayed: null,
        createdAt: null,
        modifiedAt: null,
      }
      store.isPlaying = true

      await store.deleteIndividualStem('/sounds/test.wav', 'drums')

      expect(store.currentFile).not.toBeNull()
      expect(store.isPlaying).toBe(true)
    })

    it('updates stemGroups computed (stemCount decreases)', async () => {
      const store = useLibraryStore()
      mockElectronAPI.deleteFile.mockResolvedValue({ success: true })
      store.files = [makeFile({ stems: makeCompletedStems() })]

      expect(store.stemGroups[0].stemCount).toBe(4)

      await store.deleteIndividualStem('/sounds/test.wav', 'drums')

      expect(store.stemGroups[0].stemCount).toBe(3)
    })

    it('removes group from stemGroups when last stem deleted', async () => {
      const store = useLibraryStore()
      mockElectronAPI.deleteFile.mockResolvedValue({ success: true })
      const stems = makeCompletedStems()
      stems.tracks = ['drums']
      store.files = [makeFile({ stems })]

      expect(store.stemGroups).toHaveLength(1)

      await store.deleteIndividualStem('/sounds/test.wav', 'drums')

      expect(store.stemGroups).toHaveLength(0)
    })
  })

  describe('deleteStemGroup', () => {
    it('clears stems from file and saves metadata', async () => {
      const store = useLibraryStore()
      mockElectronAPI.deleteStems.mockResolvedValue({ success: true })
      store.files = [makeFile({ stems: makeCompletedStems() })]

      const result = await store.deleteStemGroup('/sounds/test.wav')

      expect(result.error).toBeUndefined()
      expect(store.files[0].stems).toBeUndefined()
      expect(mockElectronAPI.deleteStems).toHaveBeenCalledWith('/sounds/.forgeaudio/stems/htdemucs/test')
      expect(mockElectronAPI.writeMetadata).toHaveBeenCalled()
    })

    it('returns error when file not found', async () => {
      const store = useLibraryStore()
      const result = await store.deleteStemGroup('/sounds/nonexistent.wav')
      expect(result.error).toBe('File not found')
    })

    it('returns error when file has no stems', async () => {
      const store = useLibraryStore()
      store.files = [makeFile()]
      const result = await store.deleteStemGroup('/sounds/test.wav')
      expect(result.error).toBe('No stems to delete')
    })

    it('preserves stems when IPC deletion fails', async () => {
      const store = useLibraryStore()
      mockElectronAPI.deleteStems.mockResolvedValue({ success: false, error: 'Permission denied' })
      store.files = [makeFile({ stems: makeCompletedStems() })]

      const result = await store.deleteStemGroup('/sounds/test.wav')

      expect(result.error).toBe('Permission denied')
      expect(store.files[0].stems).toBeDefined()
      expect(store.files[0].stems!.status).toBe('completed')
    })

    it('stops playback if playing a stem from the deleted group', async () => {
      const store = useLibraryStore()
      mockElectronAPI.deleteStems.mockResolvedValue({ success: true })
      const stems = makeCompletedStems()
      store.files = [makeFile({ stems })]

      // Simulate playing a stem from this group
      store.currentFile = {
        path: `${stems.outputDir}/drums.wav`,
        name: 'test_drums.wav',
        extension: '.wav',
        size: 0,
        duration: 2.5,
        tags: [],
        description: '',
        lastPlayed: null,
        createdAt: null,
        modifiedAt: null,
      }
      store.isPlaying = true

      await store.deleteStemGroup('/sounds/test.wav')

      expect(store.currentFile).toBeNull()
      expect(store.isPlaying).toBe(false)
    })

    it('removes group from stemGroups computed', async () => {
      const store = useLibraryStore()
      mockElectronAPI.deleteStems.mockResolvedValue({ success: true })
      store.files = [
        makeFile({ name: 'a.wav', path: '/sounds/a.wav', stems: makeCompletedStems('a') }),
        makeFile({ name: 'b.wav', path: '/sounds/b.wav', stems: makeCompletedStems('b') }),
      ]

      expect(store.stemGroups).toHaveLength(2)

      await store.deleteStemGroup('/sounds/a.wav')

      expect(store.stemGroups).toHaveLength(1)
      expect(store.stemGroups[0].sourceFileName).toBe('b.wav')
    })
  })
})
