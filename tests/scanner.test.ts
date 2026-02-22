import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { scanDirectory } from '../electron/ipc/scanner'

const TEST_DIR = join(tmpdir(), 'ftf-scanner-test-' + Date.now())

beforeAll(() => {
  // Create test directory structure
  mkdirSync(TEST_DIR, { recursive: true })
  mkdirSync(join(TEST_DIR, 'subdir'), { recursive: true })
  mkdirSync(join(TEST_DIR, '.hidden'), { recursive: true })
  mkdirSync(join(TEST_DIR, 'sibling1'), { recursive: true })
  mkdirSync(join(TEST_DIR, 'sibling2'), { recursive: true })

  // Audio files in root
  writeFileSync(join(TEST_DIR, 'kick.wav'), 'fake-wav')
  writeFileSync(join(TEST_DIR, 'snare.mp3'), 'fake-mp3')
  writeFileSync(join(TEST_DIR, 'pad.aiff'), 'fake-aiff')
  writeFileSync(join(TEST_DIR, 'drone.flac'), 'fake-flac')
  writeFileSync(join(TEST_DIR, 'click.ogg'), 'fake-ogg')
  writeFileSync(join(TEST_DIR, 'loop.m4a'), 'fake-m4a')
  writeFileSync(join(TEST_DIR, 'alt.aif'), 'fake-aif')

  // Non-audio files
  writeFileSync(join(TEST_DIR, 'readme.txt'), 'text')
  writeFileSync(join(TEST_DIR, 'image.png'), 'png')

  // Audio in subdirectory
  writeFileSync(join(TEST_DIR, 'subdir', 'nested.wav'), 'fake-nested')

  // Audio in hidden directory (should be skipped)
  writeFileSync(join(TEST_DIR, '.hidden', 'secret.wav'), 'fake-hidden')

  // Audio in sibling subdirectories (tests parallel walk)
  writeFileSync(join(TEST_DIR, 'sibling1', 'beat.wav'), 'fake-beat')
  writeFileSync(join(TEST_DIR, 'sibling2', 'bass.mp3'), 'fake-bass')
})

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('scanDirectory', () => {
  it('finds supported audio files', async () => {
    const results = await scanDirectory(TEST_DIR)
    const names = results.map(r => r.name)

    expect(names).toContain('kick.wav')
    expect(names).toContain('snare.mp3')
  })

  it('supports all expected audio extensions', async () => {
    const results = await scanDirectory(TEST_DIR)
    const extensions = new Set(results.map(r => r.extension))

    expect(extensions).toContain('.wav')
    expect(extensions).toContain('.mp3')
    expect(extensions).toContain('.aiff')
    expect(extensions).toContain('.aif')
    expect(extensions).toContain('.flac')
    expect(extensions).toContain('.ogg')
    expect(extensions).toContain('.m4a')
  })

  it('ignores non-audio files', async () => {
    const results = await scanDirectory(TEST_DIR)
    const names = results.map(r => r.name)

    expect(names).not.toContain('readme.txt')
    expect(names).not.toContain('image.png')
  })

  it('recurses into subdirectories', async () => {
    const results = await scanDirectory(TEST_DIR)
    const names = results.map(r => r.name)

    expect(names).toContain('nested.wav')
  })

  it('skips hidden directories', async () => {
    const results = await scanDirectory(TEST_DIR)
    const names = results.map(r => r.name)

    expect(names).not.toContain('secret.wav')
  })

  it('returns correct file structure', async () => {
    const results = await scanDirectory(TEST_DIR)
    const kick = results.find(r => r.name === 'kick.wav')!

    expect(kick).toBeDefined()
    expect(kick.path).toBe(join(TEST_DIR, 'kick.wav'))
    expect(kick.extension).toBe('.wav')
    expect(kick.size).toBeGreaterThan(0)
  })

  it('includes createdAt and modifiedAt as ISO date strings', async () => {
    const results = await scanDirectory(TEST_DIR)
    const kick = results.find(r => r.name === 'kick.wav')!

    expect(kick.createdAt).toBeDefined()
    expect(kick.modifiedAt).toBeDefined()
    // Must be parseable ISO strings
    expect(new Date(kick.createdAt).getTime()).not.toBeNaN()
    expect(new Date(kick.modifiedAt).getTime()).not.toBeNaN()
    // Sanity: both dates should be recent (within a minute of test run)
    const now = Date.now()
    expect(Math.abs(new Date(kick.modifiedAt).getTime() - now)).toBeLessThan(60_000)
  })

  it('returns empty array for empty directory', async () => {
    const emptyDir = join(TEST_DIR, 'empty')
    mkdirSync(emptyDir, { recursive: true })

    const results = await scanDirectory(emptyDir)
    expect(results).toHaveLength(0)
  })

  it('handles unreadable directories gracefully', async () => {
    const results = await scanDirectory('/nonexistent-path-12345')
    expect(results).toHaveLength(0)
  })

  it('finds files across multiple sibling subdirectories', async () => {
    const results = await scanDirectory(TEST_DIR)
    const names = results.map(r => r.name)

    // Both siblings must be found even though their walks run in parallel
    expect(names).toContain('beat.wav')
    expect(names).toContain('bass.mp3')
  })
})

describe('onFile callback', () => {
  it('is called once for every audio file found', async () => {
    const seen: string[] = []
    const results = await scanDirectory(TEST_DIR, file => seen.push(file.name))

    expect(seen.sort()).toEqual(results.map(r => r.name).sort())
  })

  it('receives the same file objects that appear in the return value', async () => {
    const callbackFiles: import('../electron/ipc/scanner').AudioFile[] = []
    const results = await scanDirectory(TEST_DIR, file => callbackFiles.push(file))

    // Every object handed to onFile must be present in results (same reference)
    for (const f of callbackFiles) {
      expect(results).toContain(f)
    }
    expect(callbackFiles).toHaveLength(results.length)
  })

  it('fires for files in nested subdirectories', async () => {
    const seen: string[] = []
    await scanDirectory(TEST_DIR, file => seen.push(file.name))

    expect(seen).toContain('nested.wav')
  })

  it('is not called for non-audio files', async () => {
    const seen: string[] = []
    await scanDirectory(TEST_DIR, file => seen.push(file.name))

    expect(seen).not.toContain('readme.txt')
    expect(seen).not.toContain('image.png')
  })

  it('is not called for files inside hidden directories', async () => {
    const seen: string[] = []
    await scanDirectory(TEST_DIR, file => seen.push(file.name))

    expect(seen).not.toContain('secret.wav')
  })

  it('receives correct file metadata (path, extension, size, dates)', async () => {
    const seen: import('../electron/ipc/scanner').AudioFile[] = []
    await scanDirectory(TEST_DIR, file => seen.push(file))

    const kick = seen.find(f => f.name === 'kick.wav')!
    expect(kick).toBeDefined()
    expect(kick.path).toBe(join(TEST_DIR, 'kick.wav'))
    expect(kick.extension).toBe('.wav')
    expect(kick.size).toBeGreaterThan(0)
    expect(new Date(kick.createdAt).getTime()).not.toBeNaN()
    expect(new Date(kick.modifiedAt).getTime()).not.toBeNaN()
  })

  it('is never called when the directory is empty', async () => {
    const emptyDir = join(TEST_DIR, 'empty-cb-test')
    mkdirSync(emptyDir, { recursive: true })

    const seen: string[] = []
    await scanDirectory(emptyDir, file => seen.push(file.name))

    expect(seen).toHaveLength(0)
  })
})
