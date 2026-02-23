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
  showContextMenu: (params: { filePath: string }) =>
    ipcRenderer.send('context-menu:show', params),

  // File operations
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
  renameFile: (oldPath: string, newName: string) => ipcRenderer.invoke('fs:renameFile', oldPath, newName),
  createDirectory: (parentPath: string, folderName: string) =>
    ipcRenderer.invoke('fs:createDirectory', parentPath, folderName),

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
})
