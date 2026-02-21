import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import { join } from 'path'
import { scanDirectory } from './ipc/scanner'
import { readMetadata, writeMetadata } from './ipc/metadata'
import { getAudioDuration } from './ipc/audioInfo'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// --- IPC Handlers ---

ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('fs:scanDirectory', async (_event, dirPath: string) => {
  return scanDirectory(dirPath)
})

ipcMain.handle('metadata:read', async () => {
  return readMetadata()
})

ipcMain.handle('metadata:write', async (_event, data: string) => {
  return writeMetadata(data)
})

ipcMain.handle('audio:getDuration', async (_event, filePath: string) => {
  return getAudioDuration(filePath)
})

ipcMain.handle('shell:showInFinder', async (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
})

ipcMain.handle('clipboard:copyPath', async (_event, filePath: string) => {
  const { clipboard } = await import('electron')
  clipboard.writeText(filePath)
})

// Context menu triggered from renderer
ipcMain.on('context-menu:show', (event, params: { filePath: string }) => {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Play',
      click: () => event.sender.send('context-menu:play', params.filePath),
    },
    {
      label: 'Add Tag',
      click: () => event.sender.send('context-menu:addTag', params.filePath),
    },
    {
      label: 'Edit Description',
      click: () => event.sender.send('context-menu:editDescription', params.filePath),
    },
    { type: 'separator' },
    {
      label: 'Reveal in Finder',
      click: () => shell.showItemInFolder(params.filePath),
    },
    {
      label: 'Copy File Path',
      click: () => {
        const { clipboard } = require('electron')
        clipboard.writeText(params.filePath)
      },
    },
  ])
  menu.popup()
})
