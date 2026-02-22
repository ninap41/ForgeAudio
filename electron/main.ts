import { app, BrowserWindow, ipcMain, dialog, Menu, shell, protocol, net } from 'electron'
import { join, extname, dirname } from 'path'
import { unlink, rename } from 'fs/promises'

const AUDIO_MIME: Record<string, string> = {
  '.wav':  'audio/wav',
  '.mp3':  'audio/mpeg',
  '.aiff': 'audio/aiff',
  '.aif':  'audio/aiff',
  '.flac': 'audio/flac',
  '.ogg':  'audio/ogg',
  '.m4a':  'audio/mp4',
}
import { scanDirectory, type AudioFile } from './ipc/scanner'
import { readMetadata, writeMetadata, getMetadataPath, getRootDirectory, setRootDirectory, clearTagData } from './ipc/metadata'
import { getAudioDuration } from './ipc/audioInfo'

// Register custom protocol for serving local audio files
protocol.registerSchemesAsPrivileged([
  { scheme: 'atom', privileges: { stream: true, bypassCSP: true } },
])

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

  mainWindow.setTitle('ForgeAudio')

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  protocol.handle('atom', async (request) => {
    const filePath = decodeURIComponent(request.url.replace('atom://localfile', ''))
    const res = await net.fetch('file://' + filePath)
    const mime = AUDIO_MIME[extname(filePath).toLowerCase()]
    if (!mime) return res
    const headers = new Headers(res.headers)
    headers.set('content-type', mime)
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
  })

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

ipcMain.on('fs:scanDirectory', async (event, dirPath: string) => {
  const BATCH_SIZE = 50
  let buffer: AudioFile[] = []

  function flush() {
    if (buffer.length > 0) {
      event.sender.send('fs:scanProgress', [...buffer])
      buffer = []
    }
  }

  try {
    await scanDirectory(dirPath, (file) => {
      buffer.push(file)
      if (buffer.length >= BATCH_SIZE) flush()
    })
  } finally {
    flush()
    event.sender.send('fs:scanDone')
  }
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

ipcMain.handle('fs:deleteFile', async (_event, filePath: string) => {
  try {
    await unlink(filePath)
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

ipcMain.handle('fs:renameFile', async (_event, oldPath: string, newName: string) => {
  try {
    const newPath = join(dirname(oldPath), newName)
    await rename(oldPath, newPath)
    return { success: true, newPath }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
})

ipcMain.handle('config:getRootDirectory', async () => {
  return getRootDirectory()
})

ipcMain.handle('config:setRootDirectory', async (_event, dir: string | null) => {
  return setRootDirectory(dir)
})

ipcMain.handle('debug:getStorePath', () => {
  return getMetadataPath()
})

ipcMain.handle('debug:getStoreData', async () => {
  return readMetadata()
})

ipcMain.handle('debug:clearTagData', async () => {
  return clearTagData()
})

ipcMain.handle('devtools:toggle', () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools()
    } else {
      mainWindow.webContents.openDevTools()
    }
  }
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
    {
      label: 'Rename…',
      click: () => event.sender.send('context-menu:rename', params.filePath),
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
    { type: 'separator' },
    {
      label: 'Delete File…',
      click: () => event.sender.send('context-menu:delete', params.filePath),
    },
  ])
  menu.popup()
})
