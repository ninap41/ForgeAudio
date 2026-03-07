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

interface StemCheckResult {
  available: boolean
  error?: string
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
  showContextMenu: (params: {
    filePath: string
    soundboards?: Array<{ id: string; name: string }>
    recentSoundboardId?: string | null
    recentSoundboardName?: string | null
    lastUsedTag?: string | null
  }) => void
  deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
  renameFile: (oldPath: string, newName: string) => Promise<{ success: boolean; error?: string; newPath?: string }>
  createDirectory: (parentPath: string, folderName: string) => Promise<{ path?: string; error?: string }>
  resolveDroppedPaths: (droppedPaths: string[], destDir: string) => Promise<{
    readyToCopy: Array<{ sourcePath: string; destPath: string; fileName: string }>
    conflicts: Array<{ sourcePath: string; destPath: string; fileName: string }>
    skippedCount: number
  }>
  copyFileToLibrary: (sourcePath: string, destDir: string, fileName: string, resolution: 'direct' | 'overwrite' | 'rename') => Promise<{
    success: boolean; destPath?: string; finalName?: string; error?: string
  }>
  onContextMenuPlay: (callback: (filePath: string) => void) => void
  onContextMenuAddTag: (callback: (filePath: string) => void) => void
  onContextMenuEditDescription: (callback: (filePath: string) => void) => void
  onContextMenuDelete: (callback: (filePath: string) => void) => void
  onContextMenuRename: (callback: (filePath: string) => void) => void
  onContextMenuAddToSoundboard: (callback: (filePath: string) => void) => void
  onContextMenuQuickAddToSoundboard: (callback: (data: { filePath: string; soundboardId: string }) => void) => void
  onContextMenuQuickTag: (callback: (data: { filePath: string; tag: string }) => void) => void
  showDateContextMenu: (params: { field: string; date: string }) => void
  onContextMenuAddDateFilter: (callback: (data: { field: string; operator: string; date: string }) => void) => void
  showSoundboardItemMenu: (params: { soundboardId: string; itemId: string; itemName: string }) => void
  onSbItemPlay: (callback: (data: { soundboardId: string; itemId: string }) => void) => void
  onSbItemEdit: (callback: (data: { soundboardId: string; itemId: string }) => void) => void
  onSbItemRemove: (callback: (data: { soundboardId: string; itemId: string }) => void) => void
  onSbItemViewData: (callback: (data: { soundboardId: string; itemId: string }) => void) => void
  showGridColumnsMenu: (params: { soundboardId: string; currentColumns: number }) => void
  onSetGridColumns: (callback: (data: { soundboardId: string; columns: number }) => void) => void
  startDrag: (filePath: string) => void
  startDragFiles: (filePaths: string[]) => void
  showBulkContextMenu: (params: { filePaths: string[]; lastUsedTag?: string | null }) => void
  onContextMenuBulkAddTag: (callback: (filePaths: string[]) => void) => void
  onContextMenuBulkQuickTag: (callback: (data: { filePaths: string[]; tag: string }) => void) => void
  onContextMenuBulkDelete: (callback: (filePaths: string[]) => void) => void
  getRootDirectory: () => Promise<string | null>
  setRootDirectory: (dir: string | null) => Promise<void>
  getStorePath: () => Promise<string>
  getStoreData: () => Promise<string>
  clearTagData: () => Promise<void>
  toggleDevTools: () => Promise<void>
  saveFileDialog: (defaultName: string) => Promise<string | null>
  selectFile: () => Promise<string | null>
  readFile: (filePath: string) => Promise<string>
  readFileBuffer: (filePath: string) => Promise<ArrayBuffer>
  getWaveformPeaks: (filePath: string, targetWidth: number) => Promise<number[]>
  writeFile: (filePath: string, data: string) => Promise<void>
  backupCreate: (data: string) => Promise<{ filename: string }>
  backupList: () => Promise<BackupEntry[]>
  backupRestore: (filename: string) => Promise<string>
  backupDelete: (filename: string) => Promise<void>

  // Stem separation
  checkStemsAvailable: () => Promise<StemCheckResult>
  startStemSeparation: (inputPath: string, libraryRoot: string) => void
  cancelStemSeparation: (inputPath: string) => Promise<boolean>
  listStems: (outputDir: string) => Promise<Array<{ track: string; path: string }>>
  getStemOutputDir: (libraryRoot: string, fileName: string) => Promise<string>
  deleteStems: (outputDir: string) => Promise<{ success: boolean; error?: string }>
  onStemsProgress: (callback: (data: { inputPath: string; percent: number; message: string }) => void) => void
  onStemsComplete: (callback: (data: { inputPath: string; tracks: string[]; outputDir: string }) => void) => void
  onStemsError: (callback: (data: { inputPath: string; error: string }) => void) => void
  removeStemsListeners: () => void
  onContextMenuSeparateStems: (callback: (filePath: string) => void) => void

  // Stem context menus
  showStemGroupMenu: (params: { sourcePath: string; outputDir: string; sourceFileName: string }) => void
  showStemItemMenu: (params: { stemPath: string; displayName: string; sourcePath: string; stemType: string }) => void
  onStemGroupExport: (callback: (data: { sourcePath: string; outputDir: string; sourceFileName: string }) => void) => void
  onStemGroupDelete: (callback: (data: { sourcePath: string }) => void) => void
  onStemItemPlay: (callback: (data: { stemPath: string; displayName: string; sourcePath: string; stemType: string }) => void) => void
  onStemItemExport: (callback: (data: { stemPath: string; displayName: string }) => void) => void
  onStemItemDelete: (callback: (data: { stemPath: string; sourcePath: string; stemType: string }) => void) => void
  removeStemMenuListeners: () => void
  exportStemGroup: (outputDir: string, destDir: string, folderName: string) => Promise<{ success: boolean; copiedCount: number; error?: string }>
  exportStem: (stemPath: string, destDir: string, fileName: string) => Promise<{ success: boolean; error?: string }>
}

interface Window {
  electronAPI: ElectronAPI
}
