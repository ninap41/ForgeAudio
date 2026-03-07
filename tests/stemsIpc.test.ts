import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getStemOutputDir, listStemFiles, cancelSeparation, isProcessRunning } from '../electron/ipc/stems'

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
})
