import { ref, reactive } from "vue"

export const DEFAULT_THEME: Record<string, string> = {
	"--bg-primary": "#1e1e1e",
	"--bg-secondary": "#252525",
	"--bg-hover": "#2a2a2a",
	"--bg-selected": "#333333",
	"--border": "#3a3a3a",
	"--text-primary": "#e0e0e0",
	"--text-secondary": "#999999",
	"--text-muted": "#666666",
	"--accent": "#4da6ff",
	"--accent-hover": "#6db8ff",
	"--tag-default": "#888888",
	"--danger": "#ff4d4d",
	"--success": "#4dff88",
	"--scrollbar-track": "#1e1e1e",
	"--scrollbar-thumb": "#444444",
}

const currentTheme = ref<Record<string, string>>({})

export function useThemeStore() {
	function applyTheme(vars: Record<string, string>) {
		for (const [key, value] of Object.entries(vars)) {
			document.documentElement.style.setProperty(key, value)
		}
	}

	function resetTheme() {
		applyTheme(DEFAULT_THEME)
		currentTheme.value = {}
		localStorage.removeItem("mainTheme")
	}

	function loadTheme(vars?: Record<string, string>) {
		const stored = vars ?? loadFromLocalStorage()
		const merged = { ...DEFAULT_THEME, ...(stored ?? {}) }
		currentTheme.value = stored ?? {}
		applyTheme(merged)
	}

	function saveTheme(vars: Record<string, string>) {
		currentTheme.value = vars
		localStorage.setItem("mainTheme", JSON.stringify(vars))
		import("./libraryStore").then(({ useLibraryStore }) => {
			useLibraryStore().saveMetadata()
		})
	}

	function loadFromLocalStorage(): Record<string, string> | undefined {
		try {
			const raw = localStorage.getItem("mainTheme")
			return raw ? JSON.parse(raw) : undefined
		} catch {
			return undefined
		}
	}

	return reactive({
		currentTheme,
		applyTheme,
		resetTheme,
		loadTheme,
		saveTheme,
	})
}

export function _resetThemeStore() {
	currentTheme.value = {}
}
