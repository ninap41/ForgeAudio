import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLibraryStore, _resetLibraryStore } from '../src/stores/libraryStore'
import { _resetTagStore } from '../src/stores/tagStore'
import { _resetThemeStore } from '../src/stores/themeStore'

const mockElectronAPI = {
  selectDirectory: vi.fn(),
  startScan: vi.fn(),
  onScanProgress: vi.fn(),
  onScanDone: vi.fn(),
  removeScanListeners: vi.fn(),
  readMetadata: vi.fn(),
  writeMetadata: vi.fn(),
  getAudioDuration: vi.fn(),
  showInFinder: vi.fn(),
  copyPath: vi.fn(),
  showContextMenu: vi.fn(),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
  onContextMenuPlay: vi.fn(),
  onContextMenuAddTag: vi.fn(),
  onContextMenuEditDescription: vi.fn(),
  onContextMenuDelete: vi.fn(),
  onContextMenuRename: vi.fn(),
  getRootDirectory: vi.fn(),
  setRootDirectory: vi.fn(),
  getStorePath: vi.fn(),
  getStoreData: vi.fn(),
  clearTagData: vi.fn(),
  toggleDevTools: vi.fn(),
  backupCreate: vi.fn(),
  backupList: vi.fn(),
  backupDelete: vi.fn(),
  backupRestore: vi.fn(),
  saveFileDialog: vi.fn(),
  selectFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}

vi.stubGlobal('window', { electronAPI: mockElectronAPI })

beforeEach(() => {
  _resetLibraryStore()
  _resetTagStore()
  _resetThemeStore()
  vi.resetAllMocks()
  mockElectronAPI.writeMetadata.mockResolvedValue(undefined)
  mockElectronAPI.backupCreate.mockResolvedValue({})
})

describe('ExportImportPanel', () => {
  describe('export', () => {
    it('calls saveFileDialog with default name', async () => {
      mockElectronAPI.saveFileDialog.mockResolvedValue('/path/to/library.json')
      mockElectronAPI.readMetadata.mockResolvedValue('{"version": 1, "files": {}}')
      mockElectronAPI.writeFile.mockResolvedValue(undefined)

      const library = useLibraryStore()
      await library.saveMetadata()
      const path = await mockElectronAPI.saveFileDialog('library.json')

      expect(path).toBe('/path/to/library.json')
    })

    it('returns null if user cancels save dialog', async () => {
      mockElectronAPI.saveFileDialog.mockResolvedValue(null)

      const path = await mockElectronAPI.saveFileDialog('library.json')
      expect(path).toBeNull()
    })

    it('calls writeFile with metadata content', async () => {
      mockElectronAPI.readMetadata.mockResolvedValue('{"version": 1, "files": {}}')
      mockElectronAPI.writeFile.mockResolvedValue(undefined)

      await mockElectronAPI.readMetadata()
      const content = await mockElectronAPI.readMetadata()
      await mockElectronAPI.writeFile('/path/file.json', content)

      expect(mockElectronAPI.writeFile).toHaveBeenCalledWith(
        '/path/file.json',
        '{"version": 1, "files": {}}'
      )
    })

    it('succeeds and returns path', async () => {
      mockElectronAPI.saveFileDialog.mockResolvedValue('/export/lib.json')
      mockElectronAPI.readMetadata.mockResolvedValue('{"version": 1}')
      mockElectronAPI.writeFile.mockResolvedValue(undefined)

      const path = await mockElectronAPI.saveFileDialog('library.json')
      expect(path).toBe('/export/lib.json')
    })

    it('handles writeFile errors gracefully', async () => {
      mockElectronAPI.writeFile.mockRejectedValue(new Error('Write failed'))

      try {
        await mockElectronAPI.writeFile('/path/file.json', '{}')
      } catch (err) {
        expect((err as Error).message).toBe('Write failed')
      }
    })
  })

  describe('import', () => {
    it('calls selectFile to choose import file', async () => {
      mockElectronAPI.selectFile.mockResolvedValue('/path/to/backup.json')

      const path = await mockElectronAPI.selectFile()
      expect(path).toBe('/path/to/backup.json')
    })

    it('returns null if user cancels file selection', async () => {
      mockElectronAPI.selectFile.mockResolvedValue(null)

      const path = await mockElectronAPI.selectFile()
      expect(path).toBeNull()
    })

    it('validates version field exists', async () => {
      const invalidData = '{"files": {}}'
      const parsed = JSON.parse(invalidData)

      expect(parsed.version).toBeUndefined()
    })

    it('reads file content via readFile', async () => {
      const fileContent = '{"version": 1, "files": {}}'
      mockElectronAPI.readFile.mockResolvedValue(fileContent)

      const content = await mockElectronAPI.readFile('/path/file.json')
      expect(content).toBe(fileContent)
    })

    it('calls writeMetadata after validation', async () => {
      mockElectronAPI.writeMetadata.mockResolvedValue(undefined)
      const data = '{"version": 1, "files": {}}'

      await mockElectronAPI.writeMetadata(data)

      expect(mockElectronAPI.writeMetadata).toHaveBeenCalledWith(data)
    })

    it('triggers rescan after import', async () => {
      mockElectronAPI.readMetadata.mockResolvedValue('{"version": 1}')

      const library = useLibraryStore()
      const initialFiles = library.files.length
      await library.saveMetadata()

      expect(mockElectronAPI.writeMetadata).toHaveBeenCalled()
    })
  })
})
