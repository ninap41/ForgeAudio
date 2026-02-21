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
}

export async function scanDirectory(dirPath: string): Promise<AudioFile[]> {
  const results: AudioFile[] = []
  await walk(dirPath, results)
  return results
}

async function walk(dir: string, results: AudioFile[]): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    // Skip directories we can't read
    return
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      // Skip hidden directories
      if (!entry.name.startsWith('.')) {
        await walk(fullPath, results)
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase()
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        try {
          const fileStat = await stat(fullPath)
          results.push({
            path: fullPath,
            name: entry.name,
            extension: ext,
            size: fileStat.size,
          })
        } catch {
          // Skip files we can't stat
        }
      }
    }
  }
}
