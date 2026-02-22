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

describe('Analytics: tag usage distribution', () => {
  it('computes tag usage counts and percentages', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav', tags: ['percussion'] }),
      makeFile({ path: '/b.wav', name: 'b.wav', tags: ['percussion', 'ambient'] }),
      makeFile({ path: '/c.wav', name: 'c.wav', tags: ['ambient'] }),
      makeFile({ path: '/d.wav', name: 'd.wav', tags: [] }),
    ]

    const counts: Record<string, number> = {}
    for (const file of library.files) {
      for (const tag of file.tags) {
        counts[tag] = (counts[tag] ?? 0) + 1
      }
    }

    const total = library.files.length
    const usage = Object.entries(counts)
      .map(([tag, count]) => ({
        tag,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)

    expect(usage[0].tag).toBe('percussion')
    expect(usage[0].count).toBe(2)
    expect(usage[0].percentage).toBe(50)
    expect(usage[1].tag).toBe('ambient')
    expect(usage[1].count).toBe(2)
  })
})

describe('Analytics: most tagged files', () => {
  it('returns files sorted by tag count descending', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav', name: 'a.wav', tags: ['a'] }),
      makeFile({ path: '/b.wav', name: 'b.wav', tags: ['a', 'b', 'c'] }),
      makeFile({ path: '/c.wav', name: 'c.wav', tags: ['a', 'b'] }),
      makeFile({ path: '/d.wav', name: 'd.wav', tags: [] }),
    ]

    const mostTagged = [...library.files]
      .filter(f => f.tags.length > 0)
      .sort((a, b) => b.tags.length - a.tags.length)
      .slice(0, 10)

    expect(mostTagged[0].name).toBe('b.wav')
    expect(mostTagged[0].tags.length).toBe(3)
    expect(mostTagged[1].name).toBe('c.wav')
    expect(mostTagged).toHaveLength(3)
  })
})

describe('Analytics: recently played', () => {
  it('returns files sorted by lastPlayed descending', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav', name: 'a.wav', lastPlayed: '2026-01-01T00:00:00Z' }),
      makeFile({ path: '/b.wav', name: 'b.wav', lastPlayed: '2026-02-15T00:00:00Z' }),
      makeFile({ path: '/c.wav', name: 'c.wav', lastPlayed: null }),
    ]

    const recent = [...library.files]
      .filter(f => f.lastPlayed)
      .sort((a, b) => new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime())

    expect(recent[0].name).toBe('b.wav')
    expect(recent[1].name).toBe('a.wav')
    expect(recent).toHaveLength(2)
  })
})

describe('Analytics: recently modified', () => {
  it('returns files sorted by modifiedAt descending', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav', name: 'a.wav', modifiedAt: '2026-01-01T00:00:00Z' }),
      makeFile({ path: '/b.wav', name: 'b.wav', modifiedAt: '2026-02-20T00:00:00Z' }),
      makeFile({ path: '/c.wav', name: 'c.wav', modifiedAt: null }),
    ]

    const recent = [...library.files]
      .filter(f => f.modifiedAt)
      .sort((a, b) => new Date(b.modifiedAt!).getTime() - new Date(a.modifiedAt!).getTime())

    expect(recent[0].name).toBe('b.wav')
    expect(recent).toHaveLength(2)
  })
})

describe('Analytics: coverage and summary', () => {
  it('computes tag coverage percentage', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav', tags: ['a'] }),
      makeFile({ path: '/b.wav', name: 'b.wav', tags: [] }),
      makeFile({ path: '/c.wav', name: 'c.wav', tags: ['b'] }),
      makeFile({ path: '/d.wav', name: 'd.wav', tags: [] }),
    ]

    const tagged = library.files.filter(f => f.tags.length > 0).length
    const coverage = Math.round((tagged / library.files.length) * 100)

    expect(coverage).toBe(50)
  })

  it('computes description coverage', () => {
    const library = useLibraryStore()
    library.files = [
      makeFile({ path: '/a.wav', description: 'Kick' }),
      makeFile({ path: '/b.wav', name: 'b.wav', description: '' }),
      makeFile({ path: '/c.wav', name: 'c.wav', description: 'Snare' }),
    ]

    const withDesc = library.files.filter(f => f.description).length
    const percent = Math.round((withDesc / library.files.length) * 100)

    expect(percent).toBe(67)
  })

  it('counts orphaned tags', () => {
    const library = useLibraryStore()
    const tagStore = useTagStore()

    tagStore.createTag('used')
    tagStore.createTag('orphan1')
    tagStore.createTag('orphan2')

    library.files = [makeFile({ tags: ['used'] })]

    const usedTags = new Set<string>()
    for (const file of library.files) {
      for (const tag of file.tags) usedTags.add(tag)
    }

    const orphaned = Object.keys(tagStore.tagDefinitions).filter(
      t => t !== 'uncategorized' && !usedTags.has(t)
    ).length

    expect(orphaned).toBe(2)
  })

  it('handles empty library', () => {
    const library = useLibraryStore()
    library.files = []

    const coverage = library.files.length === 0 ? 0 : Math.round(
      (library.files.filter(f => f.tags.length > 0).length / library.files.length) * 100
    )

    expect(coverage).toBe(0)
  })
})
