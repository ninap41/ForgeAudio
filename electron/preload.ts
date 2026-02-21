import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Directory
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  scanDirectory: (dirPath: string) => ipcRenderer.invoke('fs:scanDirectory', dirPath),

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

  // Context menu listeners
  onContextMenuPlay: (callback: (filePath: string) => void) =>
    ipcRenderer.on('context-menu:play', (_event, filePath) => callback(filePath)),
  onContextMenuAddTag: (callback: (filePath: string) => void) =>
    ipcRenderer.on('context-menu:addTag', (_event, filePath) => callback(filePath)),
  onContextMenuEditDescription: (callback: (filePath: string) => void) =>
    ipcRenderer.on('context-menu:editDescription', (_event, filePath) => callback(filePath)),
})
