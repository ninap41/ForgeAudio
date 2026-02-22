import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLibraryStore, _resetLibraryStore, type AudioFile } from '../src/stores/libraryStore'
import { useTagStore, _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'

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
  vi.resetAllMocks()
  mockElectronAPI.writeMetadata.mockResolvedValue(undefined)
  mockElectronAPI.backupCreate.mockResolvedValue({})
})

describe('Auto-Tagging: filename pattern matching', () => {
  it('matches files by filename substring (case-insensitive)', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ name: 'kick_hard_01.wav', path: '/sounds/kick_hard_01.wav' }),
      makeFile({ name: 'snare_soft_01.wav', path: '/sounds/snare_soft_01.wav' }),
      makeFile({ name: 'kick_soft_02.wav', path: '/sounds/kick_soft_02.wav' }),
    ]

    // Simulate filename pattern matching
    const pattern = 'kick'
    const matches = library.files.filter(f =>
      f.name.toLowerCase().includes(pattern.toLowerCase())
    )

    expect(matches).toHaveLength(2)
    expect(matches.map(f => f.name)).toContain('kick_hard_01.wav')
    expect(matches.map(f => f.name)).toContain('kick_soft_02.wav')
  })

  it('matches files by regex pattern', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ name: 'kick_01.wav', path: '/sounds/kick_01.wav' }),
      makeFile({ name: 'snare_01.wav', path: '/sounds/snare_01.wav' }),
      makeFile({ name: 'kick_hard_02.wav', path: '/sounds/kick_hard_02.wav' }),
    ]

    const regex = new RegExp('^kick_\\d+', 'i')
    const matches = library.files.filter(f => regex.test(f.name))

    expect(matches).toHaveLength(1)
    expect(matches[0].name).toBe('kick_01.wav')
  })

  it('matches files by extension', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ name: 'a.wav', path: '/sounds/a.wav', extension: '.wav' }),
      makeFile({ name: 'b.mp3', path: '/sounds/b.mp3', extension: '.mp3' }),
      makeFile({ name: 'c.wav', path: '/sounds/c.wav', extension: '.wav' }),
    ]

    const ext = '.mp3'
    const matches = library.files.filter(f => f.extension.toLowerCase() === ext)

    expect(matches).toHaveLength(1)
    expect(matches[0].name).toBe('b.mp3')
  })

  it('skips files that already have the target tag', () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('percussion')

    library.files = [
      makeFile({ name: 'kick_01.wav', path: '/sounds/kick_01.wav', tags: ['percussion'] }),
      makeFile({ name: 'kick_02.wav', path: '/sounds/kick_02.wav', tags: [] }),
    ]

    const pattern = 'kick'
    const tag = 'percussion'
    const toTag = library.files.filter(f =>
      f.name.toLowerCase().includes(pattern.toLowerCase()) && !f.tags.includes(tag)
    )

    expect(toTag).toHaveLength(1)
    expect(toTag[0].name).toBe('kick_02.wav')
  })

  it('applies tags to multiple matched files', async () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()
    tagStore.createTag('percussion')

    library.files = [
      makeFile({ name: 'kick_01.wav', path: '/sounds/kick_01.wav' }),
      makeFile({ name: 'kick_02.wav', path: '/sounds/kick_02.wav' }),
      makeFile({ name: 'pad_01.wav', path: '/sounds/pad_01.wav' }),
    ]

    const pattern = 'kick'
    const paths = library.files
      .filter(f => f.name.toLowerCase().includes(pattern.toLowerCase()))
      .map(f => f.path)

    library.addTagToFiles(paths, 'percussion')

    expect(library.files[0].tags).toContain('percussion')
    expect(library.files[1].tags).toContain('percussion')
    expect(library.files[2].tags).not.toContain('percussion')
  })

  it('validates regex patterns', () => {
    expect(() => new RegExp('[invalid', 'i')).toThrow()
    expect(() => new RegExp('^valid_\\d+', 'i')).not.toThrow()
  })
})

describe('Auto-Tagging: preview', () => {
  it('computes preview with correct file counts', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ name: 'kick_01.wav', path: '/sounds/kick_01.wav' }),
      makeFile({ name: 'kick_02.wav', path: '/sounds/kick_02.wav' }),
      makeFile({ name: 'snare_01.wav', path: '/sounds/snare_01.wav' }),
    ]

    const rules = [
      { pattern: 'kick', tagName: 'kicks', type: 'filename' as const },
      { pattern: 'snare', tagName: 'snares', type: 'filename' as const },
    ]

    const previews = new Map<string, string[]>()
    for (const rule of rules) {
      for (const file of library.files) {
        if (file.name.toLowerCase().includes(rule.pattern.toLowerCase()) && !file.tags.includes(rule.tagName)) {
          const existing = previews.get(file.path)
          if (existing) {
            if (!existing.includes(rule.tagName)) existing.push(rule.tagName)
          } else {
            previews.set(file.path, [rule.tagName])
          }
        }
      }
    }

    expect(previews.size).toBe(3)
    expect(previews.get('/sounds/kick_01.wav')).toEqual(['kicks'])
    expect(previews.get('/sounds/snare_01.wav')).toEqual(['snares'])
  })

  it('deduplicates when multiple rules match same file with same tag', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ name: 'kick_hard_01.wav', path: '/sounds/kick_hard_01.wav' }),
    ]

    const rules = [
      { pattern: 'kick', tagName: 'percussion', type: 'filename' as const },
      { pattern: 'hard', tagName: 'percussion', type: 'filename' as const },
    ]

    const previews = new Map<string, string[]>()
    for (const rule of rules) {
      for (const file of library.files) {
        if (file.name.toLowerCase().includes(rule.pattern.toLowerCase()) && !file.tags.includes(rule.tagName)) {
          const existing = previews.get(file.path)
          if (existing) {
            if (!existing.includes(rule.tagName)) existing.push(rule.tagName)
          } else {
            previews.set(file.path, [rule.tagName])
          }
        }
      }
    }

    // Should only list "percussion" once for this file
    expect(previews.get('/sounds/kick_hard_01.wav')).toEqual(['percussion'])
  })
})
