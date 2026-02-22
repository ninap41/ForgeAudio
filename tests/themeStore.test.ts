import { describe, it, expect, beforeEach, vi } from "vitest"
import { useThemeStore, DEFAULT_THEME, _resetThemeStore } from "../src/stores/themeStore"

// Minimal document.documentElement mock
const setCSSProp = vi.fn()
const style = { setProperty: setCSSProp }

// localStorage mock
const localStorageStore: Record<string, string> = {}
const localStorageMock = {
	getItem: vi.fn((k: string) => localStorageStore[k] ?? null),
	setItem: vi.fn((k: string, v: string) => {
		localStorageStore[k] = v
	}),
	removeItem: vi.fn((k: string) => {
		delete localStorageStore[k]
	}),
}

vi.stubGlobal("document", { documentElement: { style } })
vi.stubGlobal("localStorage", localStorageMock)

// Mock libraryStore dynamic import used by saveTheme
vi.mock("../src/stores/libraryStore", () => ({
	useLibraryStore: () => ({ saveMetadata: vi.fn() }),
}))

beforeEach(() => {
	_resetThemeStore()
	vi.clearAllMocks()
	// clear backing store between tests
	for (const k of Object.keys(localStorageStore)) delete localStorageStore[k]
})

describe("themeStore", () => {
	describe("applyTheme", () => {
		it("sets CSS custom properties on document.documentElement", () => {
			const store = useThemeStore()
			store.applyTheme({ "--bg-primary": "#111111", "--accent": "#ff0000" })

			expect(setCSSProp).toHaveBeenCalledWith("--bg-primary", "#111111")
			expect(setCSSProp).toHaveBeenCalledWith("--accent", "#ff0000")
		})
	})

	describe("resetTheme", () => {
		it("applies DEFAULT_THEME, clears currentTheme, and removes localStorage entry", () => {
			localStorageStore["mainTheme"] = JSON.stringify({ "--accent": "#ff0000" })
			const store = useThemeStore()
			store.currentTheme = { "--accent": "#ff0000" }

			store.resetTheme()

			expect(store.currentTheme).toEqual({})
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("mainTheme")
			for (const [key, value] of Object.entries(DEFAULT_THEME)) {
				expect(setCSSProp).toHaveBeenCalledWith(key, value)
			}
		})
	})

	describe("saveTheme", () => {
		it("persists vars to localStorage under mainTheme", async () => {
			const store = useThemeStore()
			const vars = { "--accent": "#ff0000", "--bg-primary": "#0a0a0a" }
			store.saveTheme(vars)

			expect(localStorageMock.setItem).toHaveBeenCalledWith("mainTheme", JSON.stringify(vars))
			expect(store.currentTheme).toEqual(vars)
		})
	})

	describe("loadTheme", () => {
		it("applies defaults when called with no argument and no localStorage entry", () => {
			const store = useThemeStore()
			store.loadTheme()

			for (const [key, value] of Object.entries(DEFAULT_THEME)) {
				expect(setCSSProp).toHaveBeenCalledWith(key, value)
			}
			expect(store.currentTheme).toEqual({})
		})

		it("falls back to localStorage when called with no argument", () => {
			const saved = { "--accent": "#aabbcc" }
			localStorageStore["mainTheme"] = JSON.stringify(saved)
			const store = useThemeStore()
			store.loadTheme()

			expect(setCSSProp).toHaveBeenCalledWith("--accent", "#aabbcc")
			expect(store.currentTheme).toEqual(saved)
		})

		it("merges stored vars with defaults and applies them", () => {
			const stored = { "--accent": "#ff0000", "--danger": "#cc0000" }
			const store = useThemeStore()
			store.loadTheme(stored)

			expect(setCSSProp).toHaveBeenCalledWith("--accent", "#ff0000")
			expect(setCSSProp).toHaveBeenCalledWith("--danger", "#cc0000")
			// Non-overridden defaults are still applied
			expect(setCSSProp).toHaveBeenCalledWith("--bg-primary", DEFAULT_THEME["--bg-primary"])
			expect(store.currentTheme).toEqual(stored)
		})
	})
})
