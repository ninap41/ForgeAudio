/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ElectronAPI {
  selectDirectory: () => Promise<string | null>
  scanDirectory: (dirPath: string) => Promise<import('../electron/ipc/scanner').AudioFile[]>
  readMetadata: () => Promise<string>
  writeMetadata: (data: string) => Promise<void>
  getAudioDuration: (filePath: string) => Promise<number | null>
  showInFinder: (filePath: string) => Promise<void>
  copyPath: (filePath: string) => Promise<void>
  showContextMenu: (params: { filePath: string }) => void
  onContextMenuPlay: (callback: (filePath: string) => void) => void
  onContextMenuAddTag: (callback: (filePath: string) => void) => void
  onContextMenuEditDescription: (callback: (filePath: string) => void) => void
}

interface Window {
  electronAPI: ElectronAPI
}
