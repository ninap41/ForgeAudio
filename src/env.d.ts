/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface BackupEntry {
  filename: string
  timestamp: string
  size: number
}

interface ElectronAPI {
  selectDirectory: () => Promise<string | null>
  startScan: (dirPath: string, batchSize?: number) => void
  onScanProgress: (callback: (files: import('../electron/ipc/scanner').AudioFile[]) => void) => void
  onScanDone: (callback: () => void) => void
  removeScanListeners: () => void
  readMetadata: () => Promise<string>
  writeMetadata: (data: string) => Promise<void>
  getAudioDuration: (filePath: string) => Promise<number | null>
  showInFinder: (filePath: string) => Promise<void>
  copyPath: (filePath: string) => Promise<void>
  showContextMenu: (params: { filePath: string }) => void
  deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
  renameFile: (oldPath: string, newName: string) => Promise<{ success: boolean; error?: string; newPath?: string }>
  onContextMenuPlay: (callback: (filePath: string) => void) => void
  onContextMenuAddTag: (callback: (filePath: string) => void) => void
  onContextMenuEditDescription: (callback: (filePath: string) => void) => void
  onContextMenuDelete: (callback: (filePath: string) => void) => void
  onContextMenuRename: (callback: (filePath: string) => void) => void
  getRootDirectory: () => Promise<string | null>
  setRootDirectory: (dir: string | null) => Promise<void>
  getStorePath: () => Promise<string>
  getStoreData: () => Promise<string>
  clearTagData: () => Promise<void>
  toggleDevTools: () => Promise<void>
  saveFileDialog: (defaultName: string) => Promise<string | null>
  selectFile: () => Promise<string | null>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, data: string) => Promise<void>
  backupCreate: (data: string) => Promise<{ filename: string }>
  backupList: () => Promise<BackupEntry[]>
  backupRestore: (filename: string) => Promise<string>
  backupDelete: (filename: string) => Promise<void>
}

interface Window {
  electronAPI: ElectronAPI
}
