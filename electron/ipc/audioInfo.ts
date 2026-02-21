import { parseFile } from 'music-metadata'

export async function getAudioDuration(filePath: string): Promise<number | null> {
  try {
    const metadata = await parseFile(filePath, { duration: true })
    return metadata.format.duration ?? null
  } catch {
    return null
  }
}
