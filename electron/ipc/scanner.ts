import { readdir, stat } from 'fs/promises'
import { join, extname } from 'path'

const SUPPORTED_EXTENSIONS = new Set([
  '.wav', '.mp3', '.aiff', '.aif', '.flac', '.ogg', '.m4a',
])

export interface AudioFile {
  path: string
  name: string
  extension: string
  size: number
  createdAt: string
  modifiedAt: string
}

export async function scanDirectory(
  dirPath: string,
  onFile?: (file: AudioFile) => void,
): Promise<AudioFile[]> {
  const results: AudioFile[] = []
  await walk(dirPath, results, onFile)
  return results
}

async function walk(
  dir: string,
  results: AudioFile[],
  onFile?: (file: AudioFile) => void,
): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    // Skip directories we can't read
    return
  }

  const subdirWalks: Promise<void>[] = []
  const audioPaths: { path: string; name: string; ext: string }[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      // Skip hidden directories
      if (!entry.name.startsWith('.')) {
        subdirWalks.push(walk(fullPath, results, onFile))
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase()
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        audioPaths.push({ path: fullPath, name: entry.name, ext })
      }
    }
  }

  // Batch stat all audio files in this directory in parallel
  if (audioPaths.length > 0) {
    const stats = await Promise.all(
      audioPaths.map(({ path }) => stat(path).catch(() => null))
    )
    for (let i = 0; i < audioPaths.length; i++) {
      const s = stats[i]
      if (s) {
        const file: AudioFile = {
          path: audioPaths[i].path,
          name: audioPaths[i].name,
          extension: audioPaths[i].ext,
          size: s.size,
          createdAt: s.birthtime.toISOString(),
          modifiedAt: s.mtime.toISOString(),
        }
        results.push(file)
        onFile?.(file)
      }
    }
  }

  // Walk all subdirectories in parallel
  await Promise.all(subdirWalks)
}
