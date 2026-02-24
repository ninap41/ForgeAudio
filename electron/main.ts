import { app, BrowserWindow, ipcMain, dialog, Menu, shell, protocol } from "electron"
import { join, extname, dirname } from "path"
import { open as fsOpen, unlink, rename, readFile as fsReadFile, writeFile, mkdir, readdir, stat, copyFile } from "fs/promises"

const AUDIO_MIME: Record<string, string> = {
	".wav": "audio/wav",
	".mp3": "audio/mpeg",
	".aiff": "audio/aiff",
	".aif": "audio/aiff",
	".flac": "audio/flac",
	".ogg": "audio/ogg",
	".m4a": "audio/mp4",
}
import { scanDirectory, type AudioFile } from "./ipc/scanner"
import {
	readMetadata,
	writeMetadata,
	getMetadataPath,
	getRootDirectory,
	setRootDirectory,
	clearTagData,
} from "./ipc/metadata"
import { getAudioDuration } from "./ipc/audioInfo"

// Register custom protocol for serving local audio files
protocol.registerSchemesAsPrivileged([{ scheme: "atom", privileges: { stream: true, bypassCSP: true } }])

let mainWindow: BrowserWindow | null = null

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 800,
		minHeight: 500,
		titleBarStyle: "default",
		titleBarOverlay: {
			color: "rgba(0, 0, 0, 0)", // Fully transparent background for buttons
			symbolColor: "#ffffff", // Color of the X, _, and [] symbols
			height: 30,
		},
		backgroundColor: "#1e1e1e",
		webPreferences: {
			preload: join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	})

	mainWindow.setTitle("ForgeAudio")

	if (process.env.VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
	} else {
		// In production, use app.getAppPath() to get the correct root path in asar
		const indexPath = join(app.getAppPath(), "dist", "index.html")
		mainWindow.loadFile(indexPath)
	}
}

app.whenReady().then(() => {
	protocol.handle("atom", async (request) => {
		const filePath = decodeURIComponent(request.url.replace("atom://localfile", ""))
		const ext = extname(filePath).toLowerCase()
		const mime = AUDIO_MIME[ext] || "application/octet-stream"

		let fileSize: number
		try {
			fileSize = (await stat(filePath)).size
		} catch {
			return new Response("Not Found", { status: 404 })
		}

		const rangeHeader = request.headers.get("range")

		if (rangeHeader) {
			const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
			if (match) {
				const start = parseInt(match[1], 10)
				if (start >= fileSize) {
					return new Response("Range Not Satisfiable", {
						status: 416,
						headers: { "Content-Range": `bytes */${fileSize}` },
					})
				}
				const end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1
				const chunkSize = end - start + 1

				const fh = await fsOpen(filePath, "r")
				const buffer = Buffer.alloc(chunkSize)
				await fh.read(buffer, 0, chunkSize, start)
				await fh.close()

				return new Response(buffer, {
					status: 206,
					statusText: "Partial Content",
					headers: {
						"Content-Type": mime,
						"Content-Range": `bytes ${start}-${end}/${fileSize}`,
						"Content-Length": String(chunkSize),
						"Accept-Ranges": "bytes",
					},
				})
			}
		}

		// No Range — serve full file, advertise Range support
		const data = await fsReadFile(filePath)
		return new Response(data, {
			status: 200,
			headers: {
				"Content-Type": mime,
				"Content-Length": String(fileSize),
				"Accept-Ranges": "bytes",
			},
		})
	})

	createWindow()

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit()
})

// --- IPC Handlers ---

// Helper: get backups directory
function getBackupsDir() {
	return join(app.getPath("userData"), "forgeaudio-backups")
}

ipcMain.handle("dialog:selectDirectory", async () => {
	const result = await dialog.showOpenDialog(mainWindow!, {
		properties: ["openDirectory"],
	})
	if (result.canceled) return null
	return result.filePaths[0]
})

ipcMain.on("fs:scanDirectory", async (event, dirPath: string, batchSize?: number) => {
	const BATCH_SIZE = typeof batchSize === "number" && batchSize >= 10 && batchSize <= 200 ? batchSize : 50
	let buffer: AudioFile[] = []

	function flush() {
		if (buffer.length > 0) {
			event.sender.send("fs:scanProgress", [...buffer])
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
		event.sender.send("fs:scanDone")
	}
})

ipcMain.handle("metadata:read", async () => {
	return readMetadata()
})

ipcMain.handle("metadata:write", async (_event, data: string) => {
	return writeMetadata(data)
})

ipcMain.handle("audio:getDuration", async (_event, filePath: string) => {
	return getAudioDuration(filePath)
})

ipcMain.handle("shell:showInFinder", async (_event, filePath: string) => {
	shell.showItemInFolder(filePath)
})

ipcMain.handle("clipboard:copyPath", async (_event, filePath: string) => {
	const { clipboard } = await import("electron")
	clipboard.writeText(filePath)
})

ipcMain.handle("fs:deleteFile", async (_event, filePath: string) => {
	try {
		await unlink(filePath)
		return { success: true }
	} catch (err) {
		return { success: false, error: (err as Error).message }
	}
})

ipcMain.handle("fs:renameFile", async (_event, oldPath: string, newName: string) => {
	try {
		const newPath = join(dirname(oldPath), newName)
		await rename(oldPath, newPath)
		return { success: true, newPath }
	} catch (err) {
		return { success: false, error: (err as Error).message }
	}
})

ipcMain.handle("fs:createDirectory", async (_event, parentPath: string, folderName: string) => {
	const fullPath = join(parentPath, folderName)
	try {
		await stat(fullPath)
		return { error: "A folder with this name already exists at this location" }
	} catch {}
	try {
		await mkdir(fullPath)
		return { path: fullPath }
	} catch (err) {
		return { error: (err as Error).message }
	}
})

ipcMain.handle("config:getRootDirectory", async () => {
	return getRootDirectory()
})

ipcMain.handle("config:setRootDirectory", async (_event, dir: string | null) => {
	return setRootDirectory(dir)
})

ipcMain.handle("debug:getStorePath", () => {
	return getMetadataPath()
})

ipcMain.handle("debug:getStoreData", async () => {
	return readMetadata()
})

ipcMain.handle("debug:clearTagData", async () => {
	return clearTagData()
})

ipcMain.handle("devtools:toggle", () => {
	if (mainWindow) {
		if (mainWindow.webContents.isDevToolsOpened()) {
			mainWindow.webContents.closeDevTools()
		} else {
			mainWindow.webContents.openDevTools()
		}
	}
})

// File dialogs
ipcMain.handle("dialog:saveFile", async (_event, defaultName: string) => {
	const result = await dialog.showSaveDialog(mainWindow!, {
		defaultPath: defaultName,
	})
	if (result.canceled) return null
	return result.filePath
})

ipcMain.handle("dialog:openFile", async () => {
	const result = await dialog.showOpenDialog(mainWindow!, {
		properties: ["openFile"],
	})
	if (result.canceled) return null
	return result.filePaths[0]
})

// File operations
ipcMain.handle("fs:readFile", async (_event, filePath: string) => {
	return fsReadFile(filePath, "utf-8")
})

ipcMain.handle("fs:writeFile", async (_event, filePath: string, data: string) => {
	return writeFile(filePath, data, "utf-8")
})

// Backup operations
ipcMain.handle("backup:create", async (_event, data: string) => {
	const backupsDir = getBackupsDir()
	await mkdir(backupsDir, { recursive: true })
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
	const filename = `backup-${timestamp}.json`
	const filePath = join(backupsDir, filename)
	await writeFile(filePath, data, "utf-8")
	return { filename }
})

ipcMain.handle("backup:list", async () => {
	try {
		const backupsDir = getBackupsDir()
		const files = await readdir(backupsDir)
		const backups = await Promise.all(
			files.map(async (filename) => {
				const filePath = join(backupsDir, filename)
				const stats = await stat(filePath)
				return {
					filename,
					timestamp: new Date(stats.mtime).toISOString(),
					size: stats.size,
				}
			}),
		)
		// Sort by mtime descending (newest first)
		backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
		return backups
	} catch {
		return []
	}
})

ipcMain.handle("backup:restore", async (_event, filename: string) => {
	const backupsDir = getBackupsDir()
	const filePath = join(backupsDir, filename)
	return fsReadFile(filePath, "utf-8")
})

ipcMain.handle("backup:delete", async (_event, filename: string) => {
	const backupsDir = getBackupsDir()
	const filePath = join(backupsDir, filename)
	try {
		await unlink(filePath)
	} catch (err: unknown) {
		// Treat already-deleted files as a no-op (concurrent purge race)
		if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
	}
})

// Drag-and-drop import: resolve dropped paths
const SUPPORTED_EXTENSIONS = new Set([".wav", ".mp3", ".aiff", ".aif", ".flac", ".ogg", ".m4a"])

async function walkForAudioFiles(dir: string): Promise<string[]> {
	const results: string[] = []
	let entries
	try {
		entries = await readdir(dir, { withFileTypes: true })
	} catch {
		return results
	}
	const subdirWalks: Promise<string[]>[] = []
	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue
		const fullPath = join(dir, entry.name)
		if (entry.isDirectory()) {
			subdirWalks.push(walkForAudioFiles(fullPath))
		} else if (entry.isFile()) {
			const ext = extname(entry.name).toLowerCase()
			if (SUPPORTED_EXTENSIONS.has(ext)) {
				results.push(fullPath)
			}
		}
	}
	const subResults = await Promise.all(subdirWalks)
	for (const sub of subResults) results.push(...sub)
	return results
}

ipcMain.handle(
	"fs:resolveDroppedPaths",
	async (_event, droppedPaths: string[], destDir: string) => {
		const readyToCopy: { sourcePath: string; destPath: string; fileName: string }[] = []
		const conflicts: { sourcePath: string; destPath: string; fileName: string }[] = []
		let skippedCount = 0

		const audioFiles: string[] = []

		for (const p of droppedPaths) {
			let s
			try {
				s = await stat(p)
			} catch {
				skippedCount++
				continue
			}
			if (s.isDirectory()) {
				const found = await walkForAudioFiles(p)
				audioFiles.push(...found)
			} else if (s.isFile()) {
				const ext = extname(p).toLowerCase()
				if (SUPPORTED_EXTENSIONS.has(ext)) {
					audioFiles.push(p)
				} else {
					skippedCount++
				}
			}
		}

		for (const sourcePath of audioFiles) {
			const fileName = sourcePath.split(/[\\/]/).pop()!
			const destPath = join(destDir, fileName)
			let exists = false
			try {
				await stat(destPath)
				exists = true
			} catch {}
			if (exists) {
				conflicts.push({ sourcePath, destPath, fileName })
			} else {
				readyToCopy.push({ sourcePath, destPath, fileName })
			}
		}

		return { readyToCopy, conflicts, skippedCount }
	},
)

ipcMain.handle(
	"fs:copyFileToLibrary",
	async (
		_event,
		sourcePath: string,
		destDir: string,
		fileName: string,
		resolution: "direct" | "overwrite" | "rename",
	) => {
		try {
			if (resolution === "direct" || resolution === "overwrite") {
				const destPath = join(destDir, fileName)
				await copyFile(sourcePath, destPath)
				return { success: true, destPath, finalName: fileName }
			}
			// rename: generate unique name
			const ext = extname(fileName)
			const base = fileName.slice(0, -ext.length)
			let candidate = `${base}_copy${ext}`
			let counter = 2
			// eslint-disable-next-line no-constant-condition
			while (true) {
				const destPath = join(destDir, candidate)
				let exists = false
				try {
					await stat(destPath)
					exists = true
				} catch {}
				if (!exists) {
					await copyFile(sourcePath, destPath)
					return { success: true, destPath, finalName: candidate }
				}
				candidate = `${base}_copy_${counter}${ext}`
				counter++
			}
		} catch (err) {
			return { success: false, error: (err as Error).message }
		}
	},
)

// Context menu triggered from renderer
ipcMain.on("context-menu:show", (event, params: {
	filePath: string
	soundboards?: Array<{ id: string; name: string }>
	recentSoundboardId?: string | null
	recentSoundboardName?: string | null
}) => {
	const template: Electron.MenuItemConstructorOptions[] = [
		{
			label: "Play",
			click: () => event.sender.send("context-menu:play", params.filePath),
		},
		{
			label: "Add Tag",
			click: () => event.sender.send("context-menu:addTag", params.filePath),
		},
		{
			label: "Edit Description",
			click: () => event.sender.send("context-menu:editDescription", params.filePath),
		},
		{
			label: "Rename…",
			click: () => event.sender.send("context-menu:rename", params.filePath),
		},
	]

	// Soundboard items (dynamic)
	if (params.soundboards && params.soundboards.length > 0) {
		template.push({ type: "separator" })
		template.push({
			label: "Add to Soundboard…",
			click: () => event.sender.send("context-menu:addToSoundboard", params.filePath),
		})
		if (params.recentSoundboardId && params.recentSoundboardName) {
			template.push({
				label: `Add to '${params.recentSoundboardName}'`,
				click: () => event.sender.send("context-menu:quickAddToSoundboard", {
					filePath: params.filePath,
					soundboardId: params.recentSoundboardId,
				}),
			})
		}
	}

	template.push({ type: "separator" })
	template.push({
		label: process.platform === "darwin" ? "Reveal in Finder" : "Show in Explorer",
		click: () => shell.showItemInFolder(params.filePath),
	})
	template.push({
		label: "Copy File Path",
		click: () => {
			const { clipboard } = require("electron")
			clipboard.writeText(params.filePath)
		},
	})
	template.push({ type: "separator" })
	template.push({
		label: "Delete File…",
		click: () => event.sender.send("context-menu:delete", params.filePath),
	})

	const menu = Menu.buildFromTemplate(template)
	menu.popup()
})
