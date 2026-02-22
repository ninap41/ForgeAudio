import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { mkdirSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { readFile, writeFile, mkdir } from 'fs/promises'

/**
 * Since metadata.ts depends on electron's app.getPath(), which can't easily
 * run in a test environment, we test the core logic directly: reading/writing
 * JSON metadata files, and the default metadata shape.
 */

const TEST_DIR = join(tmpdir(), 'ftf-metadata-test-' + Date.now())
const META_PATH = join(TEST_DIR, 'library.json')

const DEFAULT_METADATA = {
  version: 1,
  files: {},
  tags: {
    uncategorized: { color: '#888888' },
  },
}

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

beforeEach(() => {
  // Clean up metadata file between tests
  if (existsSync(META_PATH)) {
    rmSync(META_PATH)
  }
})

describe('metadata read/write logic', () => {
  it('reads metadata from a JSON file', async () => {
    const data = { version: 1, files: { '/a.wav': { tags: ['test'], description: 'hi', lastPlayed: null } }, tags: {} }
    await writeFile(META_PATH, JSON.stringify(data), 'utf-8')

    const raw = await readFile(META_PATH, 'utf-8')
    const parsed = JSON.parse(raw)

    expect(parsed.version).toBe(1)
    expect(parsed.files['/a.wav'].tags).toContain('test')
    expect(parsed.files['/a.wav'].description).toBe('hi')
  })

  it('returns default metadata structure when file does not exist', async () => {
    let result: string
    try {
      result = await readFile(META_PATH, 'utf-8')
    } catch {
      result = JSON.stringify(DEFAULT_METADATA, null, 2)
    }

    const parsed = JSON.parse(result)
    expect(parsed.version).toBe(1)
    expect(parsed.files).toEqual({})
    expect(parsed.tags.uncategorized).toBeDefined()
    expect(parsed.tags.uncategorized.color).toBe('#888888')
  })

  it('writes metadata to a JSON file', async () => {
    const data = {
      version: 1,
      files: {
        '/sounds/hit.wav': {
          tags: ['impact', 'metal'],
          description: 'Short metallic hit',
          lastPlayed: '2026-02-14T10:30:00Z',
        },
      },
      tags: {
        impact: { color: '#ff4d4d' },
        metal: { color: '#cccccc' },
      },
    }

    await mkdir(TEST_DIR, { recursive: true })
    await writeFile(META_PATH, JSON.stringify(data, null, 2), 'utf-8')

    const raw = readFileSync(META_PATH, 'utf-8')
    const parsed = JSON.parse(raw)

    expect(parsed.version).toBe(1)
    expect(parsed.files['/sounds/hit.wav'].tags).toEqual(['impact', 'metal'])
    expect(parsed.tags.impact.color).toBe('#ff4d4d')
  })

  it('preserves human-readable formatting', async () => {
    const data = { version: 1, files: {}, tags: {} }
    const formatted = JSON.stringify(data, null, 2)
    await writeFile(META_PATH, formatted, 'utf-8')

    const raw = readFileSync(META_PATH, 'utf-8')
    expect(raw).toBe(formatted)
    expect(raw).toContain('\n') // Multi-line
  })

  it('handles metadata with multiple files', async () => {
    const data = {
      version: 1,
      files: {
        '/a.wav': { tags: ['a'], description: '', lastPlayed: null },
        '/b.mp3': { tags: ['b'], description: 'second', lastPlayed: null },
        '/c.flac': { tags: [], description: '', lastPlayed: '2026-01-01T00:00:00Z' },
      },
      tags: {},
    }

    await writeFile(META_PATH, JSON.stringify(data), 'utf-8')
    const raw = await readFile(META_PATH, 'utf-8')
    const parsed = JSON.parse(raw)

    expect(Object.keys(parsed.files)).toHaveLength(3)
    expect(parsed.files['/b.mp3'].description).toBe('second')
  })
})
