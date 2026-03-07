import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getStemOutputDir, listStemFiles, cancelSeparation, isProcessRunning, deleteStems, exportStemGroup, exportStem, ensureStemsDirectory } from '../electron/ipc/stems'

const TEST_DIR = join(tmpdir(), 'ftf-stems-test-' + Date.now())

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true })

  // Create a mock stems directory structure
  const stemsDir = join(TEST_DIR, '.forgeaudio', 'stems', 'htdemucs', 'mysong')
  mkdirSync(stemsDir, { recursive: true })
  writeFileSync(join(stemsDir, 'drums.wav'), 'fake-drums')
  writeFileSync(join(stemsDir, 'vocals.wav'), 'fake-vocals')
  writeFileSync(join(stemsDir, 'bass.wav'), 'fake-bass')
  writeFileSync(join(stemsDir, 'other.wav'), 'fake-other')

  // Create a directory with mixed files
  const mixedDir = join(TEST_DIR, '.forgeaudio', 'stems', 'htdemucs', 'mixed')
  mkdirSync(mixedDir, { recursive: true })
  writeFileSync(join(mixedDir, 'drums.wav'), 'fake')
  writeFileSync(join(mixedDir, 'notes.txt'), 'text')
  writeFileSync(join(mixedDir, 'config.json'), 'json')
})

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('stems IPC', () => {
  describe('getStemOutputDir', () => {
    it('returns correct path structure', () => {
      const result = getStemOutputDir('/sounds', 'mysong.wav')
      expect(result).toBe('/sounds/.forgeaudio/stems/htdemucs/mysong')
    })

    it('strips extension from filename', () => {
      const result = getStemOutputDir('/lib', 'beat.mp3')
      expect(result).toBe('/lib/.forgeaudio/stems/htdemucs/beat')
    })

    it('handles filenames with multiple dots', () => {
      const result = getStemOutputDir('/lib', 'my.song.v2.wav')
      expect(result).toBe('/lib/.forgeaudio/stems/htdemucs/my.song.v2')
    })

    it('handles nested library roots', () => {
      const result = getStemOutputDir('/Users/me/Music/library', 'kick.wav')
      expect(result).toBe('/Users/me/Music/library/.forgeaudio/stems/htdemucs/kick')
    })
  })

  describe('listStemFiles', () => {
    it('returns stem files from directory', async () => {
      const stemsDir = join(TEST_DIR, '.forgeaudio', 'stems', 'htdemucs', 'mysong')
      const result = await listStemFiles(stemsDir)
      expect(result).toHaveLength(4)
      const tracks = result.map(r => r.track).sort()
      expect(tracks).toEqual(['bass', 'drums', 'other', 'vocals'])
    })

    it('returns full paths for stem files', async () => {
      const stemsDir = join(TEST_DIR, '.forgeaudio', 'stems', 'htdemucs', 'mysong')
      const result = await listStemFiles(stemsDir)
      const drumsStem = result.find(r => r.track === 'drums')
      expect(drumsStem).toBeDefined()
      expect(drumsStem!.path).toBe(join(stemsDir, 'drums.wav'))
    })

    it('returns empty array when directory does not exist', async () => {
      const result = await listStemFiles(join(TEST_DIR, 'nonexistent'))
      expect(result).toEqual([])
    })

    it('filters non-audio files', async () => {
      const mixedDir = join(TEST_DIR, '.forgeaudio', 'stems', 'htdemucs', 'mixed')
      const result = await listStemFiles(mixedDir)
      expect(result).toHaveLength(1)
      expect(result[0].track).toBe('drums')
    })
  })

  describe('cancelSeparation', () => {
    it('returns false when no process running for path', () => {
      const result = cancelSeparation('/sounds/nonexistent.wav')
      expect(result).toBe(false)
    })
  })

  describe('isProcessRunning', () => {
    it('returns false when no process running', () => {
      expect(isProcessRunning('/sounds/test.wav')).toBe(false)
    })
  })

  describe('deleteStems', () => {
    it('removes directory successfully', async () => {
      // Create a temp directory to delete
      const deleteDir = join(TEST_DIR, 'to-delete')
      mkdirSync(deleteDir, { recursive: true })
      writeFileSync(join(deleteDir, 'drums.wav'), 'fake')

      const result = await deleteStems(deleteDir)
      expect(result.success).toBe(true)

      // Verify directory is gone
      let exists = true
      try {
        await import('fs/promises').then(fs => fs.stat(deleteDir))
      } catch {
        exists = false
      }
      expect(exists).toBe(false)
    })

    it('succeeds even if directory does not exist (force flag)', async () => {
      const result = await deleteStems(join(TEST_DIR, 'nonexistent-dir'))
      expect(result.success).toBe(true)
    })
  })

  describe('ensureStemsDirectory', () => {
    it('creates the stems directory if it does not exist', async () => {
      const freshRoot = join(TEST_DIR, 'fresh-root')
      mkdirSync(freshRoot, { recursive: true })

      const result = await ensureStemsDirectory(freshRoot)

      expect(result.path).toBe(join(freshRoot, '.forgeaudio', 'stems'))
      expect(result.error).toBeUndefined()
      expect(existsSync(result.path)).toBe(true)
    })

    it('succeeds when stems directory already exists', async () => {
      // TEST_DIR already has .forgeaudio/stems from beforeAll
      const result = await ensureStemsDirectory(TEST_DIR)

      expect(result.path).toBe(join(TEST_DIR, '.forgeaudio', 'stems'))
      expect(result.error).toBeUndefined()
      expect(existsSync(result.path)).toBe(true)
    })

    it('creates parent .forgeaudio directory as needed', async () => {
      const emptyRoot = join(TEST_DIR, 'empty-root')
      mkdirSync(emptyRoot, { recursive: true })

      const result = await ensureStemsDirectory(emptyRoot)

      expect(existsSync(join(emptyRoot, '.forgeaudio'))).toBe(true)
      expect(existsSync(join(emptyRoot, '.forgeaudio', 'stems'))).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('exportStemGroup', () => {
    it('copies all audio files to new folder', async () => {
      const stemsDir = join(TEST_DIR, '.forgeaudio', 'stems', 'htdemucs', 'mysong')
      const destDir = join(TEST_DIR, 'export-dest-group')
      mkdirSync(destDir, { recursive: true })

      const result = await exportStemGroup(stemsDir, destDir, 'my_export')

      expect(result.success).toBe(true)
      expect(result.copiedCount).toBe(4)
      const exported = readdirSync(join(destDir, 'my_export'))
      expect(exported.sort()).toEqual(['bass.wav', 'drums.wav', 'other.wav', 'vocals.wav'])
    })

    it('skips non-audio files', async () => {
      const mixedDir = join(TEST_DIR, '.forgeaudio', 'stems', 'htdemucs', 'mixed')
      const destDir = join(TEST_DIR, 'export-dest-mixed')
      mkdirSync(destDir, { recursive: true })

      const result = await exportStemGroup(mixedDir, destDir, 'mixed_export')

      expect(result.success).toBe(true)
      expect(result.copiedCount).toBe(1)
    })

    it('returns success with 0 count for empty source', async () => {
      const emptyDir = join(TEST_DIR, 'empty-stems')
      mkdirSync(emptyDir, { recursive: true })
      const destDir = join(TEST_DIR, 'export-dest-empty')
      mkdirSync(destDir, { recursive: true })

      const result = await exportStemGroup(emptyDir, destDir, 'empty_export')

      expect(result.success).toBe(true)
      expect(result.copiedCount).toBe(0)
    })
  })

  describe('exportStem', () => {
    it('copies single stem file with custom name', async () => {
      const stemFile = join(TEST_DIR, '.forgeaudio', 'stems', 'htdemucs', 'mysong', 'drums.wav')
      const destDir = join(TEST_DIR, 'export-dest-single')
      mkdirSync(destDir, { recursive: true })

      const result = await exportStem(stemFile, destDir, 'my_drums.wav')

      expect(result.success).toBe(true)
      expect(existsSync(join(destDir, 'my_drums.wav'))).toBe(true)
    })

    it('returns error for non-existent source', async () => {
      const destDir = join(TEST_DIR, 'export-dest-err')
      mkdirSync(destDir, { recursive: true })

      const result = await exportStem(join(TEST_DIR, 'no-such-file.wav'), destDir, 'out.wav')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
