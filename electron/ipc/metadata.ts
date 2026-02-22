import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'

export function getMetadataPath(): string {
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

export async function getRootDirectory(): Promise<string | null> {
  try {
    const raw = await readFile(getMetadataPath(), 'utf-8')
    const meta = JSON.parse(raw)
    const dir = meta.rootDirectory
    if (!dir || typeof dir !== 'string') return null
    await access(dir)
    return dir
  } catch {
    return null
  }
}

export async function setRootDirectory(dir: string | null): Promise<void> {
  const metaPath = getMetadataPath()
  let meta: any
  try {
    meta = JSON.parse(await readFile(metaPath, 'utf-8'))
  } catch {
    meta = { ...DEFAULT_METADATA }
  }
  if (dir) {
    meta.rootDirectory = dir
  } else {
    delete meta.rootDirectory
  }
  const dirPath = join(metaPath, '..')
  await mkdir(dirPath, { recursive: true })
  await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
}

export async function clearTagData(): Promise<void> {
  const metaPath = getMetadataPath()
  let meta: any
  try {
    meta = JSON.parse(await readFile(metaPath, 'utf-8'))
  } catch {
    meta = { ...DEFAULT_METADATA }
  }
  // Clear all file tags
  if (meta.files && typeof meta.files === 'object') {
    for (const key of Object.keys(meta.files)) {
      meta.files[key].tags = []
    }
  }
  // Reset tag definitions
  meta.tags = { uncategorized: { color: '#888888' } }
  const dirPath = join(metaPath, '..')
  await mkdir(dirPath, { recursive: true })
  await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
}
