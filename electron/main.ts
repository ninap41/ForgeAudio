import { app, BrowserWindow, ipcMain, dialog, Menu, shell, protocol, nativeImage } from "electron"
import { join, extname, dirname } from "path"
import {
	open as fsOpen,
	unlink,
	rename,
	readFile as fsReadFile,
	writeFile,
	mkdir,
	readdir,
	stat,
	copyFile,
} from "fs/promises"

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
import {
	checkDemucsAvailable,
	separateStems,
	cancelSeparation,
	listStemFiles,
	getStemOutputDir,
	deleteStems,
	exportStemGroup,
	exportStem,
} from "./ipc/stems"

// Register custom protocol for serving local audio files
protocol.registerSchemesAsPrivileged([{ scheme: "atom", privileges: { stream: true, bypassCSP: true } }])

// Prevent main process crashes from killing the app silently
process.on("uncaughtException", (err) => {
	console.error("[main] Uncaught exception:", err)
})
process.on("unhandledRejection", (reason) => {
	console.error("[main] Unhandled rejection:", reason)
})

// Force a locale so Chromium's Intl.Locale doesn't crash on misconfigured Windows systems
app.commandLine.appendSwitch("lang", "en-US")

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
		autoHideMenuBar: true,
		webPreferences: {
			preload: join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	})

	mainWindow.setTitle("ForgeAudio")

	// F12 toggles DevTools on all platforms (works even in production builds)
	mainWindow.webContents.on("before-input-event", (_event, input) => {
		if (input.key === "F12" && input.type === "keyDown") {
			mainWindow!.webContents.toggleDevTools()
		}
	})

	// Auto-recover from renderer crashes (gray screen) by reloading the page
	mainWindow.webContents.on("render-process-gone", (_event, details) => {
		console.error("[crash] Renderer process gone:", details.reason, details.exitCode)
		if (mainWindow && !mainWindow.isDestroyed()) {
			if (process.env.VITE_DEV_SERVER_URL) {
				mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
			} else {
				mainWindow.loadFile(join(app.getAppPath(), "dist", "index.html"))
			}
		}
	})

	if (process.env.VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
	} else {
		// In production, use app.getAppPath() to get the correct root path in asar
		const indexPath = join(app.getAppPath(), "dist", "index.html")
		mainWindow.loadFile(indexPath)
	}
}

app.whenReady().then(() => {
	// Application menu with Edit roles so copy/paste/cut/select-all work in text inputs.
	// Menu bar is hidden — the menu only exists to register keyboard accelerators.
	const appMenu = Menu.buildFromTemplate([
		...(process.platform === "darwin"
			? [{ role: "appMenu" as const }]
			: []),
		{
			label: "Edit",
			submenu: [
				{ role: "undo" as const },
				{ role: "redo" as const },
				{ type: "separator" as const },
				{ role: "cut" as const },
				{ role: "copy" as const },
				{ role: "paste" as const },
				{ role: "selectAll" as const },
			],
		},
	])
	Menu.setApplicationMenu(appMenu)

	protocol.handle("atom", async (request) => {
		try {
			let filePath: string
			try {
				filePath = decodeURIComponent(request.url.replace("atom://localfile", ""))
			} catch {
				console.error("[atom] Bad URL:", request.url)
				return new Response("Bad Request", { status: 400 })
			}
			// On Windows, the URL produces "/C:/Users/..." — strip the leading slash before a drive letter
			if (process.platform === "win32" && /^\/[A-Za-z]:/.test(filePath)) {
				filePath = filePath.slice(1)
			}
			const ext = extname(filePath).toLowerCase()
			const mime = AUDIO_MIME[ext] || "application/octet-stream"

			let fileSize: number
			try {
				fileSize = (await stat(filePath)).size
			} catch {
				console.error("[atom] File not found:", filePath)
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
					try {
						const buffer = Buffer.alloc(chunkSize)
						await fh.read(buffer, 0, chunkSize, start)
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
					} finally {
						await fh.close()
					}
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
		} catch (err) {
			console.error("[atom] Protocol handler error:", err)
			return new Response("Internal Server Error", { status: 500 })
		}
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
		try {
			await stat(newPath)
			return { success: false, error: "A file with this name already exists" }
		} catch {}
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

ipcMain.handle("fs:readFileBuffer", async (_event, filePath: string) => {
	const buf = await fsReadFile(filePath)
	return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
})

ipcMain.handle("audio:getWaveformPeaks", async (_event, filePath: string, targetWidth: number) => {
	const buf = await fsReadFile(filePath)
	if (buf.length === 0 || targetWidth <= 0) return []

	// WAV: parse header and read actual PCM samples for accurate peaks
	if (buf.length > 44 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WAVE") {
		const wavPeaks = generateWavPeaks(buf, targetWidth)
		if (wavPeaks) return wavPeaks
	}

	// Fallback for compressed formats: approximate peaks from raw bytes
	return generateBytePeaks(buf, targetWidth)
})

function generateWavPeaks(buffer: Buffer, targetWidth: number): number[] | null {
	try {
		let numChannels = 0
		let bitsPerSample = 0
		let dataStart = 0
		let dataLength = 0

		// Iterate RIFF chunks to find fmt and data
		let offset = 12
		while (offset < buffer.length - 8) {
			const chunkId = buffer.toString("ascii", offset, offset + 4)
			const chunkSize = buffer.readUInt32LE(offset + 4)

			if (chunkId === "fmt " && chunkSize >= 16) {
				numChannels = buffer.readUInt16LE(offset + 10)
				bitsPerSample = buffer.readUInt16LE(offset + 22)
			} else if (chunkId === "data") {
				dataStart = offset + 8
				dataLength = Math.min(chunkSize, buffer.length - dataStart)
			}

			offset += 8 + chunkSize
			if (chunkSize % 2 !== 0) offset++ // RIFF padding
		}

		if (!numChannels || !bitsPerSample || !dataStart || !dataLength) return null
		const bytesPerSample = bitsPerSample / 8
		if (bytesPerSample !== 2 && bytesPerSample !== 3 && bytesPerSample !== 4) return null

		const frameSize = bytesPerSample * numChannels
		const totalSamples = Math.floor(dataLength / frameSize)
		const samplesPerBin = Math.max(1, Math.floor(totalSamples / targetWidth))

		const peaks: number[] = []
		for (let i = 0; i < targetWidth; i++) {
			const sampleStart = i * samplesPerBin
			const sampleEnd = Math.min(sampleStart + samplesPerBin, totalSamples)
			let max = 0
			for (let s = sampleStart; s < sampleEnd; s++) {
				const byteOff = dataStart + s * frameSize
				if (byteOff + bytesPerSample > buffer.length) break
				let sample: number
				if (bytesPerSample === 2) {
					sample = buffer.readInt16LE(byteOff) / 32768
				} else if (bytesPerSample === 3) {
					sample = (((buffer[byteOff] | (buffer[byteOff + 1] << 8) | (buffer[byteOff + 2] << 16)) << 8) >> 8) / 8388608
				} else {
					sample = buffer.readInt32LE(byteOff) / 2147483648
				}
				const abs = Math.abs(sample)
				if (abs > max) max = abs
			}
			peaks.push(max)
		}
		return peaks
	} catch {
		// Header parse failed — fall through to byte-level
	}
	return null
}

function generateBytePeaks(buffer: Buffer, targetWidth: number): number[] {
	const peaks: number[] = []
	const chunkSize = Math.max(1, Math.floor(buffer.length / targetWidth))
	for (let i = 0; i < targetWidth; i++) {
		const start = i * chunkSize
		const end = Math.min(start + chunkSize, buffer.length)
		let max = 0
		for (let j = start; j < end; j++) {
			const val = Math.abs((buffer[j] - 128) / 128)
			if (val > max) max = val
		}
		peaks.push(max)
	}
	return peaks
}

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

// --- Stem separation IPC handlers ---

ipcMain.handle("stems:checkAvailable", async () => {
	return checkDemucsAvailable()
})

ipcMain.on("stems:separate", async (event, inputPath: string, libraryRoot: string) => {
	console.log("[stems] Starting separation:", inputPath, "→", libraryRoot)
	try {
		const result = await separateStems(inputPath, libraryRoot, (percent, message) => {
			event.sender.send("stems:progress", { inputPath, percent, message })
		})
		console.log("[stems] Complete:", result.outputDir, result.tracks)
		event.sender.send("stems:complete", { inputPath, tracks: result.tracks, outputDir: result.outputDir })
	} catch (err) {
		console.error("[stems] Error:", (err as Error).message)
		event.sender.send("stems:error", { inputPath, error: (err as Error).message })
	}
})

ipcMain.handle("stems:cancel", async (_event, inputPath: string) => {
	return cancelSeparation(inputPath)
})

ipcMain.handle("stems:list", async (_event, outputDir: string) => {
	return listStemFiles(outputDir)
})

ipcMain.handle("stems:getOutputDir", async (_event, libraryRoot: string, fileName: string) => {
	return getStemOutputDir(libraryRoot, fileName)
})

ipcMain.handle("stems:delete", async (_event, outputDir: string) => {
	return deleteStems(outputDir)
})

ipcMain.handle("stems:exportGroup", async (_event, outputDir: string, destDir: string, folderName: string) => {
	return exportStemGroup(outputDir, destDir, folderName)
})

ipcMain.handle("stems:exportStem", async (_event, stemPath: string, destDir: string, fileName: string) => {
	return exportStem(stemPath, destDir, fileName)
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

ipcMain.handle("fs:resolveDroppedPaths", async (_event, droppedPaths: string[], destDir: string) => {
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
})

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

// Native file drag to external apps
ipcMain.on("drag:startFile", (event, filePath: string) => {
	let icon: Electron.NativeImage
	try {
		icon = nativeImage.createFromPath(join(__dirname, "../public/drag-icon.png"))
		if (icon.isEmpty()) throw new Error("empty")
	} catch {
		icon = nativeImage.createEmpty()
	}
	event.sender.startDrag({ file: filePath, icon })
})

// Native multi-file drag to external apps
ipcMain.on("drag:startFiles", (event, filePaths: string[]) => {
	let icon: Electron.NativeImage
	try {
		icon = nativeImage.createFromPath(join(__dirname, "../public/drag-icon.png"))
		if (icon.isEmpty()) throw new Error("empty")
	} catch {
		icon = nativeImage.createEmpty()
	}
	event.sender.startDrag({ file: filePaths[0] || "", files: filePaths, icon })
})

// Bulk context menu for multi-selected files
ipcMain.on(
	"context-menu:showBulk",
	(event, params: { filePaths: string[]; lastUsedTag?: string | null }) => {
		const n = params.filePaths.length
		const template: Electron.MenuItemConstructorOptions[] = [
			{
				label: `Add Tag to Selected (${n} files)`,
				click: () => event.sender.send("context-menu:bulkAddTag", params.filePaths),
			},
		]
		if (params.lastUsedTag) {
			template.push({
				label: `Add Tag '${params.lastUsedTag}' to Selected`,
				click: () =>
					event.sender.send("context-menu:bulkQuickTag", {
						filePaths: params.filePaths,
						tag: params.lastUsedTag,
					}),
			})
		}
		template.push({ type: "separator" })
		template.push({
			label: `Delete Selected (${n} files)`,
			click: () => event.sender.send("context-menu:bulkDelete", params.filePaths),
		})
		Menu.buildFromTemplate(template).popup()
	},
)

// Context menu triggered from renderer
ipcMain.on(
	"context-menu:show",
	(
		event,
		params: {
			filePath: string
			soundboards?: Array<{ id: string; name: string }>
			recentSoundboardId?: string | null
			recentSoundboardName?: string | null
			lastUsedTag?: string | null
		},
	) => {
		const template: Electron.MenuItemConstructorOptions[] = [
			{
				label: "Play",
				click: () => event.sender.send("context-menu:play", params.filePath),
			},
			{
				label: "Add Tag",
				click: () => event.sender.send("context-menu:addTag", params.filePath),
			},
		]

		if (params.lastUsedTag) {
			template.push({
				label: `Add Tag '${params.lastUsedTag}'`,
				click: () =>
					event.sender.send("context-menu:quickTag", {
						filePath: params.filePath,
						tag: params.lastUsedTag,
					}),
			})
		}

		template.push(
			{
				label: "Edit Description",
				click: () => event.sender.send("context-menu:editDescription", params.filePath),
			},
			{
				label: "Rename…",
				click: () => event.sender.send("context-menu:rename", params.filePath),
			},
		)

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
					click: () =>
						event.sender.send("context-menu:quickAddToSoundboard", {
							filePath: params.filePath,
							soundboardId: params.recentSoundboardId,
						}),
				})
			}
		}

		// Stem separation
		template.push({ type: "separator" })
		template.push({
			label: "Separate Stems\u2026",
			click: () => event.sender.send("context-menu:separateStems", params.filePath),
		})

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
	},
)

// Date context menu — right-click on Created/Modified/Last Played dates
ipcMain.on(
	"context-menu:showDateMenu",
	(
		event,
		params: {
			field: "createdAt" | "modifiedAt" | "lastPlayed"
			date: string
		},
	) => {
		const fieldLabels: Record<string, string> = {
			createdAt: "Created",
			modifiedAt: "Modified",
			lastPlayed: "Last played",
		}
		const allFields: Array<"createdAt" | "modifiedAt" | "lastPlayed"> = ["createdAt", "modifiedAt", "lastPlayed"]

		// Primary field first, then the other fields with separators
		const primaryLabel = fieldLabels[params.field]
		const template: Electron.MenuItemConstructorOptions[] = [
			{
				label: `${primaryLabel} on this date`,
				click: () =>
					event.sender.send("context-menu:addDateFilter", {
						field: params.field,
						operator: "on",
						date: params.date,
					}),
			},
			{
				label: `${primaryLabel} after this date`,
				click: () =>
					event.sender.send("context-menu:addDateFilter", {
						field: params.field,
						operator: "after",
						date: params.date,
					}),
			},
			{
				label: `${primaryLabel} before this date`,
				click: () =>
					event.sender.send("context-menu:addDateFilter", {
						field: params.field,
						operator: "before",
						date: params.date,
					}),
			},
		]

		for (const otherField of allFields) {
			if (otherField === params.field) continue
			const otherLabel = fieldLabels[otherField]
			template.push({ type: "separator" })
			template.push(
				{
					label: `${otherLabel} on this date`,
					click: () =>
						event.sender.send("context-menu:addDateFilter", {
							field: otherField,
							operator: "on",
							date: params.date,
						}),
				},
				{
					label: `${otherLabel} after this date`,
					click: () =>
						event.sender.send("context-menu:addDateFilter", {
							field: otherField,
							operator: "after",
							date: params.date,
						}),
				},
				{
					label: `${otherLabel} before this date`,
					click: () =>
						event.sender.send("context-menu:addDateFilter", {
							field: otherField,
							operator: "before",
							date: params.date,
						}),
				},
			)
		}

		const menu = Menu.buildFromTemplate(template)
		menu.popup()
	},
)

// Grid columns context menu
ipcMain.on(
	"context-menu:showGridColumns",
	(event, params: { soundboardId: string; currentColumns: number }) => {
		const template: Electron.MenuItemConstructorOptions[] = Array.from({ length: 8 }, (_, i) => ({
			label: `${i + 1} column${i > 0 ? "s" : ""}`,
			type: "radio" as const,
			checked: params.currentColumns === i + 1,
			click: () =>
				event.sender.send("context-menu:setGridColumns", {
					soundboardId: params.soundboardId,
					columns: i + 1,
				}),
		}))
		Menu.buildFromTemplate(template).popup()
	},
)

// Soundboard item context menu
ipcMain.on(
	"context-menu:showSoundboardItem",
	(
		event,
		params: {
			soundboardId: string
			itemId: string
			itemName: string
		},
	) => {
		const template: Electron.MenuItemConstructorOptions[] = [
			{
				label: "Play",
				click: () =>
					event.sender.send("context-menu:sbItemPlay", {
						soundboardId: params.soundboardId,
						itemId: params.itemId,
					}),
			},
			{
				label: "View Data",
				click: () =>
					event.sender.send("context-menu:sbItemViewData", {
						soundboardId: params.soundboardId,
						itemId: params.itemId,
					}),
			},
			{
				label: "Edit…",
				click: () =>
					event.sender.send("context-menu:sbItemEdit", {
						soundboardId: params.soundboardId,
						itemId: params.itemId,
					}),
			},
			{ type: "separator" },
			{
				label: "Remove",
				click: () =>
					event.sender.send("context-menu:sbItemRemove", {
						soundboardId: params.soundboardId,
						itemId: params.itemId,
					}),
			},
		]
		const menu = Menu.buildFromTemplate(template)
		menu.popup()
	},
)

// Stem group context menu
ipcMain.on(
	"context-menu:showStemGroup",
	(
		event,
		params: {
			sourcePath: string
			outputDir: string
			sourceFileName: string
		},
	) => {
		const template: Electron.MenuItemConstructorOptions[] = [
			{
				label: "Export Group\u2026",
				click: () =>
					event.sender.send("context-menu:stemGroupExport", {
						sourcePath: params.sourcePath,
						outputDir: params.outputDir,
						sourceFileName: params.sourceFileName,
					}),
			},
			{ type: "separator" },
			{
				label: "Delete Group\u2026",
				click: () =>
					event.sender.send("context-menu:stemGroupDelete", {
						sourcePath: params.sourcePath,
					}),
			},
		]
		Menu.buildFromTemplate(template).popup()
	},
)

// Stem item context menu
ipcMain.on(
	"context-menu:showStemItem",
	(
		event,
		params: {
			stemPath: string
			displayName: string
			sourcePath: string
			stemType: string
		},
	) => {
		const template: Electron.MenuItemConstructorOptions[] = [
			{
				label: "Play",
				click: () =>
					event.sender.send("context-menu:stemItemPlay", {
						stemPath: params.stemPath,
						displayName: params.displayName,
						sourcePath: params.sourcePath,
						stemType: params.stemType,
					}),
			},
			{ type: "separator" },
			{
				label: "Export Stem\u2026",
				click: () =>
					event.sender.send("context-menu:stemItemExport", {
						stemPath: params.stemPath,
						displayName: params.displayName,
					}),
			},
			{
				label: process.platform === "darwin" ? "Reveal in Finder" : "Show in Explorer",
				click: () => shell.showItemInFolder(params.stemPath),
			},
			{ type: "separator" },
			{
				label: "Delete Stem\u2026",
				click: () =>
					event.sender.send("context-menu:stemItemDelete", {
						stemPath: params.stemPath,
						sourcePath: params.sourcePath,
						stemType: params.stemType,
					}),
			},
		]
		Menu.buildFromTemplate(template).popup()
	},
)
