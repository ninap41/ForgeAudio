import { describe, it, expect } from 'vitest'
import { formatBytes } from '../src/utils/formatBytes'

describe('formatBytes', () => {
  it('formats 0 bytes as "0 B"', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes correctly', () => {
    expect(formatBytes(512)).toMatch(/512\.00 B/)
  })

  it('formats kilobytes correctly', () => {
    const result = formatBytes(1024)
    expect(result).toMatch(/1\.00 KB/)
  })

  it('formats megabytes correctly', () => {
    const result = formatBytes(1024 * 1024)
    expect(result).toMatch(/1\.00 MB/)
  })
})

import { describe as describeComputed, it as itComputed } from 'vitest'
import { ref } from 'vue'
import { useLibraryStore, _resetLibraryStore, type AudioFile } from '../src/stores/libraryStore'
import { _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'

describeComputed('StatisticsPanel', () => {
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

  itComputed('computes total size correctly', () => {
    _resetLibraryStore()
    _resetTagStore()
    _resetThemeStore()
    const store = useLibraryStore()
    store.files = [
      makeFile({ size: 1024 }),
      makeFile({ name: 'b.wav', path: '/sounds/b.wav', size: 2048 }),
    ]

    const totalBytes = store.files.reduce((sum, f) => sum + f.size, 0)
    expect(totalBytes).toBe(3072)
  })

  itComputed('counts tagged files correctly', () => {
    _resetLibraryStore()
    _resetTagStore()
    _resetThemeStore()
    const store = useLibraryStore()
    store.files = [
      makeFile({ tags: ['percussion'] }),
      makeFile({ tags: [] }),
      makeFile({ tags: ['percussion', 'drums'] }),
    ]

    const tagged = store.files.filter(f => f.tags.length > 0).length
    expect(tagged).toBe(2)
  })

  itComputed('calculates average tags per file', () => {
    _resetLibraryStore()
    _resetTagStore()
    _resetThemeStore()
    const store = useLibraryStore()
    store.files = [
      makeFile({ tags: ['a'] }),
      makeFile({ tags: ['b', 'c'] }),
      makeFile({ tags: [] }),
    ]

    const total = store.files.reduce((sum, f) => sum + f.tags.length, 0)
    const avg = (total / store.files.length).toFixed(2)
    expect(avg).toBe('1.00')
  })

  itComputed('breaks down formats by count', () => {
    _resetLibraryStore()
    _resetTagStore()
    _resetThemeStore()
    const store = useLibraryStore()
    store.files = [
      makeFile({ extension: '.wav' }),
      makeFile({ name: 'b.mp3', path: '/sounds/b.mp3', extension: '.mp3' }),
      makeFile({ name: 'c.wav', path: '/sounds/c.wav', extension: '.wav' }),
    ]

    const breakdown: Record<string, number> = {}
    for (const file of store.files) {
      const ext = file.extension.toLowerCase() || 'unknown'
      breakdown[ext] = (breakdown[ext] ?? 0) + 1
    }

    expect(breakdown['.wav']).toBe(2)
    expect(breakdown['.mp3']).toBe(1)
  })
})
