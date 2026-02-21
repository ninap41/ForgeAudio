import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'

function getMetadataPath(): string {
  return join(app.getPath('userData'), 'library.json')
}

const DEFAULT_METADATA = {
  version: 1,
  files: {},
  tags: {
    uncategorized: { color: '#888888' },
  },
}

export async function readMetadata(): Promise<string> {
  const metaPath = getMetadataPath()
  try {
    const data = await readFile(metaPath, 'utf-8')
    return data
  } catch {
    // File doesn't exist yet — return defaults
    return JSON.stringify(DEFAULT_METADATA, null, 2)
  }
}

export async function writeMetadata(data: string): Promise<void> {
  const metaPath = getMetadataPath()
  const dir = join(metaPath, '..')
  await mkdir(dir, { recursive: true })
  await writeFile(metaPath, data, 'utf-8')
}
