import { spawn, type ChildProcess } from "child_process"
import { join, basename, extname } from "path"
import { readdir, stat, mkdir, rm, copyFile } from "fs/promises"

// Active separation processes keyed by source file path
const activeProcesses = new Map<string, ChildProcess>()

export interface StemCheckResult {
	available: boolean
	error?: string
}

export interface StemSeparationResult {
	tracks: string[]
	outputDir: string
}

/**
 * Check if demucs is installed and available via Python.
 */
export async function checkDemucsAvailable(): Promise<StemCheckResult> {
	return new Promise((resolve) => {
		const proc = spawn("python3", ["-m", "demucs", "--help"], {
			stdio: ["ignore", "pipe", "pipe"],
		})

		let resolved = false
		proc.on("error", () => {
			if (!resolved) {
				resolved = true
				resolve({
					available: false,
					error: "Python 3 not found. Install Python 3.8+ and run: pip install demucs",
				})
			}
		})

		proc.on("close", (code) => {
			if (!resolved) {
				resolved = true
				if (code === 0) {
					resolve({ available: true })
				} else {
					resolve({
						available: false,
						error: "Demucs not installed. Run: pip install demucs",
					})
				}
			}
		})

		// Safety timeout
		setTimeout(() => {
			if (!resolved) {
				resolved = true
				proc.kill()
				resolve({
					available: false,
					error: "Demucs check timed out",
				})
			}
		}, 15000)
	})
}

/**
 * Get the output directory for stems of a given file.
 * Structure: <libraryRoot>/.forgeaudio/stems/htdemucs/<filename-without-ext>/
 */
export function getStemOutputDir(libraryRoot: string, fileName: string): string {
	const baseName = basename(fileName, extname(fileName))
	return join(libraryRoot, ".forgeaudio", "stems", "htdemucs", baseName)
}

/**
 * Start stem separation using demucs.
 * Streams progress events via the provided callback.
 * Returns the result on completion.
 */
export async function separateStems(
	inputPath: string,
	libraryRoot: string,
	onProgress: (percent: number, message: string) => void,
): Promise<StemSeparationResult> {
	const stemsDir = join(libraryRoot, ".forgeaudio", "stems")

	// Ensure the stems directory exists
	await mkdir(stemsDir, { recursive: true })

	return new Promise((resolve, reject) => {
		const proc = spawn(
			"python3",
			["-m", "demucs", "-n", "htdemucs", "-o", stemsDir, inputPath],
			{
				stdio: ["ignore", "pipe", "pipe"],
			},
		)

		activeProcesses.set(inputPath, proc)

		let stderrBuffer = ""
		let fullStderr = "" // Accumulate all stderr for error reporting

		proc.stderr?.on("data", (data: Buffer) => {
			const chunk = data.toString()
			stderrBuffer += chunk
			fullStderr += chunk

			// Parse tqdm progress: look for percentage patterns like "  5%|" or " 42%|"
			const lines = stderrBuffer.split("\r")
			for (const line of lines) {
				const match = line.match(/(\d+)%\|/)
				if (match) {
					const percent = parseInt(match[1], 10)
					onProgress(percent, `Separating stems... ${percent}%`)
				}
			}

			// Keep only the last line fragment for next parse
			const lastNewline = stderrBuffer.lastIndexOf("\r")
			if (lastNewline !== -1) {
				stderrBuffer = stderrBuffer.slice(lastNewline + 1)
			}
		})

		let stdoutData = ""
		proc.stdout?.on("data", (data: Buffer) => {
			stdoutData += data.toString()
		})

		proc.on("error", (err) => {
			activeProcesses.delete(inputPath)
			reject(new Error(`Failed to start demucs: ${err.message}`))
		})

		proc.on("close", (code) => {
			activeProcesses.delete(inputPath)

			if (code === 0) {
				const fileName = basename(inputPath)
				const outputDir = getStemOutputDir(libraryRoot, fileName)
				const tracks = ["drums", "vocals", "bass", "other"]
				resolve({ tracks, outputDir })
			} else if (code === null) {
				// Process was killed (cancelled)
				reject(new Error("Stem separation was cancelled"))
			} else {
				// Extract meaningful error lines from stderr (skip tqdm progress bars)
				const errorLines = fullStderr
					.split("\n")
					.filter((l) => l.trim() && !l.includes("%|") && !l.includes("\r"))
					.join("\n")
					.trim()
					.slice(-1500)
				reject(new Error(`Demucs exited with code ${code}${errorLines ? ":\n" + errorLines : ""}`))
			}
		})
	})
}

/**
 * Cancel an active stem separation for a given file.
 */
export function cancelSeparation(inputPath: string): boolean {
	const proc = activeProcesses.get(inputPath)
	if (proc) {
		proc.kill("SIGTERM")
		activeProcesses.delete(inputPath)
		return true
	}
	return false
}

/**
 * Check if a separation is currently running for a file.
 */
export function isProcessRunning(inputPath: string): boolean {
	return activeProcesses.has(inputPath)
}

/**
 * Delete stems output directory and all its contents.
 */
export async function deleteStems(outputDir: string): Promise<{ success: boolean; error?: string }> {
	try {
		await rm(outputDir, { recursive: true, force: true })
		return { success: true }
	} catch (err) {
		return { success: false, error: (err as Error).message }
	}
}

/**
 * List stem files in a given output directory.
 * Returns an array of { track, path } for each stem that exists on disk.
 */
export async function listStemFiles(
	outputDir: string,
): Promise<Array<{ track: string; path: string }>> {
	try {
		const entries = await readdir(outputDir)
		const results: Array<{ track: string; path: string }> = []
		for (const entry of entries) {
			const ext = extname(entry).toLowerCase()
			if (ext === ".wav" || ext === ".mp3" || ext === ".flac") {
				const track = basename(entry, ext)
				const fullPath = join(outputDir, entry)
				try {
					const s = await stat(fullPath)
					if (s.isFile()) {
						results.push({ track, path: fullPath })
					}
				} catch {
					// Skip inaccessible files
				}
			}
		}
		return results
	} catch {
		return []
	}
}

/**
 * Ensure the .forgeaudio/stems directory exists for a given library root.
 * Creates it (and parent dirs) if missing. Returns the path.
 */
export async function ensureStemsDirectory(
	libraryRoot: string,
): Promise<{ path: string; created: boolean; error?: string }> {
	const stemsDir = join(libraryRoot, ".forgeaudio", "stems")
	try {
		const result = await mkdir(stemsDir, { recursive: true })
		// mkdir with recursive returns the first directory created, or undefined if it already existed
		return { path: stemsDir, created: result !== undefined }
	} catch (err) {
		return { path: stemsDir, created: false, error: (err as Error).message }
	}
}

/**
 * Export all audio stems from an output directory to a new folder.
 * Creates destDir/folderName/ and copies all audio files into it.
 */
export async function exportStemGroup(
	outputDir: string,
	destDir: string,
	folderName: string,
): Promise<{ success: boolean; copiedCount: number; error?: string }> {
	try {
		const targetDir = join(destDir, folderName)
		await mkdir(targetDir, { recursive: true })

		let entries: string[]
		try {
			entries = await readdir(outputDir)
		} catch {
			return { success: true, copiedCount: 0 }
		}

		let copiedCount = 0
		for (const entry of entries) {
			const ext = extname(entry).toLowerCase()
			if (ext === ".wav" || ext === ".mp3" || ext === ".flac") {
				const srcPath = join(outputDir, entry)
				try {
					const s = await stat(srcPath)
					if (s.isFile()) {
						await copyFile(srcPath, join(targetDir, entry))
						copiedCount++
					}
				} catch {
					// Skip inaccessible files
				}
			}
		}

		return { success: true, copiedCount }
	} catch (err) {
		return { success: false, copiedCount: 0, error: (err as Error).message }
	}
}

/**
 * Export a single stem file to a destination directory with a custom name.
 */
export async function exportStem(
	stemPath: string,
	destDir: string,
	fileName: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await stat(stemPath) // Verify source exists
		await copyFile(stemPath, join(destDir, fileName))
		return { success: true }
	} catch (err) {
		return { success: false, error: (err as Error).message }
	}
}
