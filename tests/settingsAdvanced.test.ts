import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore, _resetSettingsStore } from '../src/stores/settingsStore'

beforeEach(() => {
  _resetSettingsStore()
})

describe('advanced settings', () => {
  it('has correct default values', () => {
    const store = useSettingsStore()
    expect(store.scannerBatchSize).toBe(50)
    expect(store.durationConcurrency).toBe(8)
    expect(store.autoLoadDurations).toBe(true)
    expect(store.autoBackup).toBe(true)
  })

  describe('loadSettings', () => {
    it('applies valid values', () => {
      const store = useSettingsStore()
      store.loadSettings({
        scannerBatchSize: 100,
        durationConcurrency: 16,
        autoLoadDurations: false,
        autoBackup: false,
      })
      expect(store.scannerBatchSize).toBe(100)
      expect(store.durationConcurrency).toBe(16)
      expect(store.autoLoadDurations).toBe(false)
      expect(store.autoBackup).toBe(false)
    })

    it('clamps scannerBatchSize to 10-200', () => {
      const store = useSettingsStore()
      store.loadSettings({ scannerBatchSize: 5 })
      expect(store.scannerBatchSize).toBe(10)

      store.loadSettings({ scannerBatchSize: 999 })
      expect(store.scannerBatchSize).toBe(200)
    })

    it('clamps durationConcurrency to 1-32', () => {
      const store = useSettingsStore()
      store.loadSettings({ durationConcurrency: 0 })
      expect(store.durationConcurrency).toBe(1)

      store.loadSettings({ durationConcurrency: 100 })
      expect(store.durationConcurrency).toBe(32)
    })

    it('ignores wrong-typed fields', () => {
      const store = useSettingsStore()
      store.loadSettings({
        scannerBatchSize: 'not a number',
        durationConcurrency: true,
        autoLoadDurations: 42,
        autoBackup: 'yes',
      })
      // All should remain at defaults
      expect(store.scannerBatchSize).toBe(50)
      expect(store.durationConcurrency).toBe(8)
      expect(store.autoLoadDurations).toBe(true)
      expect(store.autoBackup).toBe(true)
    })

    it('handles undefined/null input gracefully', () => {
      const store = useSettingsStore()
      store.loadSettings(undefined)
      expect(store.scannerBatchSize).toBe(50)

      store.loadSettings(null as any)
      expect(store.scannerBatchSize).toBe(50)
    })

    it('handles partial settings object', () => {
      const store = useSettingsStore()
      store.loadSettings({ scannerBatchSize: 75 })
      expect(store.scannerBatchSize).toBe(75)
      // Others remain at defaults
      expect(store.durationConcurrency).toBe(8)
      expect(store.autoLoadDurations).toBe(true)
      expect(store.autoBackup).toBe(true)
    })
  })

  describe('getSettingsSnapshot', () => {
    it('returns current values as plain object', () => {
      const store = useSettingsStore()
      const snap = store.getSettingsSnapshot()
      expect(snap).toEqual({
        scannerBatchSize: 50,
        durationConcurrency: 8,
        autoLoadDurations: true,
        autoBackup: true,
        showBootSplash: true,
      })
    })

    it('reflects changed values', () => {
      const store = useSettingsStore()
      store.scannerBatchSize = 120
      store.autoBackup = false
      const snap = store.getSettingsSnapshot()
      expect(snap.scannerBatchSize).toBe(120)
      expect(snap.autoBackup).toBe(false)
    })
  })

  describe('_resetSettingsStore', () => {
    it('resets all advanced settings to defaults', () => {
      const store = useSettingsStore()
      store.scannerBatchSize = 150
      store.durationConcurrency = 4
      store.autoLoadDurations = false
      store.autoBackup = false

      _resetSettingsStore()

      expect(store.scannerBatchSize).toBe(50)
      expect(store.durationConcurrency).toBe(8)
      expect(store.autoLoadDurations).toBe(true)
      expect(store.autoBackup).toBe(true)
    })
  })
})
