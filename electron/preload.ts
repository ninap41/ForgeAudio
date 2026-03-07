import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Directory
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  startScan: (dirPath: string, batchSize?: number) => ipcRenderer.send('fs:scanDirectory', dirPath, batchSize),
  onScanProgress: (callback: (files: any[]) => void) =>
    ipcRenderer.on('fs:scanProgress', (_event, files) => callback(files)),
  onScanDone: (callback: () => void) =>
    ipcRenderer.on('fs:scanDone', () => callback()),
  removeScanListeners: () => {
    ipcRenderer.removeAllListeners('fs:scanProgress')
    ipcRenderer.removeAllListeners('fs:scanDone')
  },

  // Metadata
  readMetadata: () => ipcRenderer.invoke('metadata:read'),
  writeMetadata: (data: string) => ipcRenderer.invoke('metadata:write', data),

  // Audio info
  getAudioDuration: (filePath: string) => ipcRenderer.invoke('audio:getDuration', filePath),

  // Shell
  showInFinder: (filePath: string) => ipcRenderer.invoke('shell:showInFinder', filePath),
  copyPath: (filePath: string) => ipcRenderer.invoke('clipboard:copyPath', filePath),

  // Context menu
  showContextMenu: (params: {
    filePath: string
    soundboards?: Array<{ id: string; name: string }>
    recentSoundboardId?: string | null
    recentSoundboardName?: string | null
    lastUsedTag?: string | null
  }) =>
    ipcRenderer.send('context-menu:show', params),

  // File operations
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
  renameFile: (oldPath: string, newName: string) => ipcRenderer.invoke('fs:renameFile', oldPath, newName),
  createDirectory: (parentPath: string, folderName: string) =>
    ipcRenderer.invoke('fs:createDirectory', parentPath, folderName),
  resolveDroppedPaths: (droppedPaths: string[], destDir: string) =>
    ipcRenderer.invoke('fs:resolveDroppedPaths', droppedPaths, destDir),
  copyFileToLibrary: (sourcePath: string, destDir: string, fileName: string, resolution: 'direct' | 'overwrite' | 'rename') =>
    ipcRenderer.invoke('fs:copyFileToLibrary', sourcePath, destDir, fileName, resolution),

  // Native drag
  startDrag: (filePath: string) => ipcRenderer.send('drag:startFile', filePath),
  startDragFiles: (filePaths: string[]) => ipcRenderer.send('drag:startFiles', filePaths),

  // Bulk context menu
  showBulkContextMenu: (params: { filePaths: string[]; lastUsedTag?: string | null }) =>
    ipcRenderer.send('context-menu:showBulk', params),
  onContextMenuBulkAddTag: (callback: (filePaths: string[]) => void) =>
    ipcRenderer.on('context-menu:bulkAddTag', (_e, fps) => callback(fps)),
  onContextMenuBulkQuickTag: (callback: (data: { filePaths: string[]; tag: string }) => void) =>
    ipcRenderer.on('context-menu:bulkQuickTag', (_e, data) => callback(data)),
  onContextMenuBulkDelete: (callback: (filePaths: string[]) => void) =>
    ipcRenderer.on('context-menu:bulkDelete', (_e, fps) => callback(fps)),

  // Config persistence
  getRootDirectory: () => ipcRenderer.invoke('config:getRootDirectory'),
  setRootDirectory: (dir: string | null) => ipcRenderer.invoke('config:setRootDirectory', dir),

  // Debug
  getStorePath: () => ipcRenderer.invoke('debug:getStorePath'),
  getStoreData: () => ipcRenderer.invoke('debug:getStoreData'),
  clearTagData: () => ipcRenderer.invoke('debug:clearTagData'),

  // DevTools
  toggleDevTools: () => ipcRenderer.invoke('devtools:toggle'),

  // File dialogs
  saveFileDialog: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  selectFile: () => ipcRenderer.invoke('dialog:openFile'),

  // File operations
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  readFileBuffer: (filePath: string) => ipcRenderer.invoke('fs:readFileBuffer', filePath),
  getWaveformPeaks: (filePath: string, targetWidth: number) => ipcRenderer.invoke('audio:getWaveformPeaks', filePath, targetWidth),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('fs:writeFile', filePath, data),

  // Backup operations
  backupCreate: (data: string) => ipcRenderer.invoke('backup:create', data),
  backupList: () => ipcRenderer.invoke('backup:list'),
  backupRestore: (filename: string) => ipcRenderer.invoke('backup:restore', filename),
  backupDelete: (filename: string) => ipcRenderer.invoke('backup:delete', filename),

  // Context menu listeners
  onContextMenuPlay: (callback: (filePath: string) => void) =>
    ipcRenderer.on('context-menu:play', (_event, filePath) => callback(filePath)),
  onContextMenuAddTag: (callback: (filePath: string) => void) =>
    ipcRenderer.on('context-menu:addTag', (_event, filePath) => callback(filePath)),
  onContextMenuEditDescription: (callback: (filePath: string) => void) =>
    ipcRenderer.on('context-menu:editDescription', (_event, filePath) => callback(filePath)),
  onContextMenuDelete: (callback: (filePath: string) => void) =>
    ipcRenderer.on('context-menu:delete', (_event, filePath) => callback(filePath)),
  onContextMenuRename: (callback: (filePath: string) => void) =>
    ipcRenderer.on('context-menu:rename', (_event, filePath) => callback(filePath)),
  onContextMenuAddToSoundboard: (callback: (filePath: string) => void) =>
    ipcRenderer.on('context-menu:addToSoundboard', (_event, filePath) => callback(filePath)),
  onContextMenuQuickAddToSoundboard: (callback: (data: { filePath: string; soundboardId: string }) => void) =>
    ipcRenderer.on('context-menu:quickAddToSoundboard', (_event, data) => callback(data)),
  onContextMenuQuickTag: (callback: (data: { filePath: string; tag: string }) => void) =>
    ipcRenderer.on('context-menu:quickTag', (_event, data) => callback(data)),

  // Date context menu
  showDateContextMenu: (params: { field: string; date: string }) =>
    ipcRenderer.send('context-menu:showDateMenu', params),
  onContextMenuAddDateFilter: (callback: (data: { field: string; operator: string; date: string }) => void) =>
    ipcRenderer.on('context-menu:addDateFilter', (_event, data) => callback(data)),

  // Soundboard item context menu
  showSoundboardItemMenu: (params: { soundboardId: string; itemId: string; itemName: string }) =>
    ipcRenderer.send('context-menu:showSoundboardItem', params),
  onSbItemPlay: (callback: (data: { soundboardId: string; itemId: string }) => void) =>
    ipcRenderer.on('context-menu:sbItemPlay', (_event, data) => callback(data)),
  onSbItemEdit: (callback: (data: { soundboardId: string; itemId: string }) => void) =>
    ipcRenderer.on('context-menu:sbItemEdit', (_event, data) => callback(data)),
  onSbItemRemove: (callback: (data: { soundboardId: string; itemId: string }) => void) =>
    ipcRenderer.on('context-menu:sbItemRemove', (_event, data) => callback(data)),
  onSbItemViewData: (callback: (data: { soundboardId: string; itemId: string }) => void) =>
    ipcRenderer.on('context-menu:sbItemViewData', (_event, data) => callback(data)),

  // Grid columns context menu
  showGridColumnsMenu: (params: { soundboardId: string; currentColumns: number }) =>
    ipcRenderer.send('context-menu:showGridColumns', params),
  onSetGridColumns: (callback: (data: { soundboardId: string; columns: number }) => void) =>
    ipcRenderer.on('context-menu:setGridColumns', (_event, data) => callback(data)),

  // Stem separation
  checkStemsAvailable: () => ipcRenderer.invoke('stems:checkAvailable'),
  startStemSeparation: (inputPath: string, libraryRoot: string) =>
    ipcRenderer.send('stems:separate', inputPath, libraryRoot),
  cancelStemSeparation: (inputPath: string) => ipcRenderer.invoke('stems:cancel', inputPath),
  listStems: (outputDir: string) => ipcRenderer.invoke('stems:list', outputDir),
  getStemOutputDir: (libraryRoot: string, fileName: string) =>
    ipcRenderer.invoke('stems:getOutputDir', libraryRoot, fileName),
  deleteStems: (outputDir: string) => ipcRenderer.invoke('stems:delete', outputDir),
  onStemsProgress: (callback: (data: { inputPath: string; percent: number; message: string }) => void) =>
    ipcRenderer.on('stems:progress', (_event, data) => callback(data)),
  onStemsComplete: (callback: (data: { inputPath: string; tracks: string[]; outputDir: string }) => void) =>
    ipcRenderer.on('stems:complete', (_event, data) => callback(data)),
  onStemsError: (callback: (data: { inputPath: string; error: string }) => void) =>
    ipcRenderer.on('stems:error', (_event, data) => callback(data)),
  removeStemsListeners: () => {
    ipcRenderer.removeAllListeners('stems:progress')
    ipcRenderer.removeAllListeners('stems:complete')
    ipcRenderer.removeAllListeners('stems:error')
  },
  onContextMenuSeparateStems: (callback: (filePath: string) => void) =>
    ipcRenderer.on('context-menu:separateStems', (_event, filePath) => callback(filePath)),

  // Stem context menus
  showStemGroupMenu: (params: { sourcePath: string; outputDir: string; sourceFileName: string }) =>
    ipcRenderer.send('context-menu:showStemGroup', params),
  showStemItemMenu: (params: { stemPath: string; displayName: string; sourcePath: string; stemType: string }) =>
    ipcRenderer.send('context-menu:showStemItem', params),

  // Stem context menu action listeners
  onStemGroupExport: (callback: (data: { sourcePath: string; outputDir: string; sourceFileName: string }) => void) =>
    ipcRenderer.on('context-menu:stemGroupExport', (_e, data) => callback(data)),
  onStemGroupDelete: (callback: (data: { sourcePath: string }) => void) =>
    ipcRenderer.on('context-menu:stemGroupDelete', (_e, data) => callback(data)),
  onStemItemPlay: (callback: (data: { stemPath: string; displayName: string; sourcePath: string; stemType: string }) => void) =>
    ipcRenderer.on('context-menu:stemItemPlay', (_e, data) => callback(data)),
  onStemItemExport: (callback: (data: { stemPath: string; displayName: string }) => void) =>
    ipcRenderer.on('context-menu:stemItemExport', (_e, data) => callback(data)),
  onStemItemDelete: (callback: (data: { stemPath: string; sourcePath: string; stemType: string }) => void) =>
    ipcRenderer.on('context-menu:stemItemDelete', (_e, data) => callback(data)),
  removeStemMenuListeners: () => {
    ipcRenderer.removeAllListeners('context-menu:stemGroupExport')
    ipcRenderer.removeAllListeners('context-menu:stemGroupDelete')
    ipcRenderer.removeAllListeners('context-menu:stemItemPlay')
    ipcRenderer.removeAllListeners('context-menu:stemItemExport')
    ipcRenderer.removeAllListeners('context-menu:stemItemDelete')
  },

  // Stem export operations
  ensureStemsDir: (libraryRoot: string) =>
    ipcRenderer.invoke('stems:ensureDir', libraryRoot),
  exportStemGroup: (outputDir: string, destDir: string, folderName: string) =>
    ipcRenderer.invoke('stems:exportGroup', outputDir, destDir, folderName),
  exportStem: (stemPath: string, destDir: string, fileName: string) =>
    ipcRenderer.invoke('stems:exportStem', stemPath, destDir, fileName),
})
