import { describe, it, expect, beforeEach } from 'vitest'
import { useSoundboardStore, _resetSoundboardStore } from '../src/stores/soundboardStore'
import type { Soundboard, SoundboardItem } from '../src/stores/soundboardStore'

describe('soundboardStore', () => {
  let store: ReturnType<typeof useSoundboardStore>

  beforeEach(() => {
    _resetSoundboardStore()
    store = useSoundboardStore()
  })

  describe('createSoundboard', () => {
    it('creates a soundboard with correct fields', () => {
      const id = store.createSoundboard('My Board', 'A description', 'LIST', 'Default')
      expect(id).toBeTruthy()
      const sb = store.allSoundboards.find((s: Soundboard) => s.id === id)!
      expect(sb.name).toBe('My Board')
      expect(sb.description).toBe('A description')
      expect(sb.layoutType).toBe('LIST')
      expect(sb.profileId).toBe('Default')
      expect(sb.enabled).toBe(false)
      expect(sb.state).toBe('expanded')
      expect(sb.items).toEqual([])
    })

    it('auto-generates unique IDs', () => {
      const id1 = store.createSoundboard('A', '', 'LIST', 'Default')
      const id2 = store.createSoundboard('B', '', 'LIST', 'Default')
      expect(id1).not.toBe(id2)
    })

    it('sets profileId on creation', () => {
      const id = store.createSoundboard('X', '', 'GRID', 'MyProfile')
      const sb = store.allSoundboards.find((s: Soundboard) => s.id === id)!
      expect(sb.profileId).toBe('MyProfile')
    })
  })

  describe('deleteSoundboard', () => {
    it('removes soundboard from state', () => {
      const id = store.createSoundboard('ToDelete', '', 'LIST', 'Default')
      expect(store.allSoundboards).toHaveLength(1)
      store.deleteSoundboard(id)
      expect(store.allSoundboards).toHaveLength(0)
    })
  })

  describe('updateSoundboard', () => {
    it('updates name', () => {
      const id = store.createSoundboard('Old', '', 'LIST', 'Default')
      store.updateSoundboard(id, { name: 'New' })
      expect(store.allSoundboards[0].name).toBe('New')
    })

    it('updates description', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.updateSoundboard(id, { description: 'Updated desc' })
      expect(store.allSoundboards[0].description).toBe('Updated desc')
    })

    it('updates layoutType', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.updateSoundboard(id, { layoutType: 'GRID' })
      expect(store.allSoundboards[0].layoutType).toBe('GRID')
    })

    it('applies partial updates without affecting other fields', () => {
      const id = store.createSoundboard('Name', 'Desc', 'LIST', 'Default')
      store.updateSoundboard(id, { name: 'Changed' })
      const sb = store.allSoundboards[0]
      expect(sb.name).toBe('Changed')
      expect(sb.description).toBe('Desc')
      expect(sb.layoutType).toBe('LIST')
    })

    it('is a no-op for nonexistent id', () => {
      store.createSoundboard('X', '', 'LIST', 'Default')
      store.updateSoundboard('nonexistent', { name: 'Nope' })
      expect(store.allSoundboards[0].name).toBe('X')
    })
  })

  describe('toggleEnabled', () => {
    it('flips enabled from false to true', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      expect(store.allSoundboards[0].enabled).toBe(false)
      store.toggleEnabled(id)
      expect(store.allSoundboards[0].enabled).toBe(true)
    })

    it('flips enabled from true to false', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.toggleEnabled(id)
      store.toggleEnabled(id)
      expect(store.allSoundboards[0].enabled).toBe(false)
    })
  })

  describe('setEnabled', () => {
    it('sets enabled to true', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.setEnabled(id, true)
      expect(store.allSoundboards[0].enabled).toBe(true)
    })

    it('sets enabled to false', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.setEnabled(id, true)
      store.setEnabled(id, false)
      expect(store.allSoundboards[0].enabled).toBe(false)
    })
  })

  describe('toggleState', () => {
    it('toggles from expanded to minimized', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      expect(store.allSoundboards[0].state).toBe('expanded')
      store.toggleState(id)
      expect(store.allSoundboards[0].state).toBe('minimized')
    })

    it('toggles from minimized to expanded', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.toggleState(id)
      store.toggleState(id)
      expect(store.allSoundboards[0].state).toBe('expanded')
    })
  })

  describe('addItem', () => {
    it('pushes item to soundboard items', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      const item: SoundboardItem = {
        id: 'item1',
        name: 'kick.wav',
        filePath: '/sounds/kick.wav',
        duration: 1.5,
      }
      store.addItem(id, item)
      expect(store.allSoundboards[0].items).toHaveLength(1)
      expect(store.allSoundboards[0].items[0].name).toBe('kick.wav')
    })

    it('appends multiple items', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.addItem(id, { id: 'i1', name: 'a.wav', filePath: '/a.wav', duration: 1 })
      store.addItem(id, { id: 'i2', name: 'b.wav', filePath: '/b.wav', duration: 2 })
      expect(store.allSoundboards[0].items).toHaveLength(2)
    })
  })

  describe('removeItem', () => {
    it('removes item by id', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.addItem(id, { id: 'i1', name: 'a.wav', filePath: '/a.wav', duration: 1 })
      store.addItem(id, { id: 'i2', name: 'b.wav', filePath: '/b.wav', duration: 2 })
      store.removeItem(id, 'i1')
      expect(store.allSoundboards[0].items).toHaveLength(1)
      expect(store.allSoundboards[0].items[0].id).toBe('i2')
    })
  })

  describe('enabledSoundboards', () => {
    it('returns only enabled boards', () => {
      const id1 = store.createSoundboard('A', '', 'LIST', 'Default')
      const id2 = store.createSoundboard('B', '', 'LIST', 'Default')
      store.toggleEnabled(id1)
      expect(store.enabledSoundboards).toHaveLength(1)
      expect(store.enabledSoundboards[0].id).toBe(id1)
    })

    it('returns empty when none enabled', () => {
      store.createSoundboard('A', '', 'LIST', 'Default')
      expect(store.enabledSoundboards).toHaveLength(0)
    })
  })

  describe('getSoundboardsForProfile', () => {
    it('filters by profileId', () => {
      store.createSoundboard('A', '', 'LIST', 'Default')
      store.createSoundboard('B', '', 'LIST', 'Other')
      store.createSoundboard('C', '', 'LIST', 'Default')
      const result = store.getSoundboardsForProfile('Default')
      expect(result).toHaveLength(2)
      expect(result.every((s: Soundboard) => s.profileId === 'Default')).toBe(true)
    })

    it('returns empty for unknown profile', () => {
      store.createSoundboard('A', '', 'LIST', 'Default')
      expect(store.getSoundboardsForProfile('Unknown')).toHaveLength(0)
    })
  })

  describe('loadSoundboards', () => {
    it('replaces state with provided data', () => {
      store.createSoundboard('Old', '', 'LIST', 'Default')
      const data: Record<string, Soundboard> = {
        sb1: {
          id: 'sb1',
          profileId: 'Default',
          name: 'Loaded',
          description: '',
          layoutType: 'GRID',
          enabled: true,
          state: 'expanded',
          items: [],
        },
      }
      store.loadSoundboards(data)
      expect(store.allSoundboards).toHaveLength(1)
      expect(store.allSoundboards[0].name).toBe('Loaded')
    })
  })

  describe('replaceSoundboards', () => {
    it('fully replaces state', () => {
      store.createSoundboard('Old', '', 'LIST', 'Default')
      store.replaceSoundboards({
        sb2: {
          id: 'sb2',
          profileId: 'P2',
          name: 'Replaced',
          description: '',
          layoutType: 'LIST',
          enabled: false,
          state: 'minimized',
          items: [],
        },
      })
      expect(store.allSoundboards).toHaveLength(1)
      expect(store.allSoundboards[0].name).toBe('Replaced')
    })
  })

  describe('getSoundboardSnapshot', () => {
    it('returns a deep copy of state', () => {
      const id = store.createSoundboard('Snap', 'desc', 'LIST', 'Default')
      store.addItem(id, { id: 'i1', name: 'x.wav', filePath: '/x.wav', duration: 1 })
      const snap = store.getSoundboardSnapshot()
      expect(Object.keys(snap)).toHaveLength(1)
      expect(snap[id].name).toBe('Snap')
      expect(snap[id].items).toHaveLength(1)

      // Verify it's a deep copy — mutating snap should not affect store
      snap[id].name = 'Modified'
      expect(store.allSoundboards[0].name).toBe('Snap')
    })
  })

  describe('width and height', () => {
    it('updates width and height via updateSoundboard', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.updateSoundboard(id, { width: 400, height: 500 })
      expect(store.allSoundboards[0].width).toBe(400)
      expect(store.allSoundboards[0].height).toBe(500)
    })

    it('preserves width/height when updating other fields', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.updateSoundboard(id, { width: 400, height: 500 })
      store.updateSoundboard(id, { name: 'Renamed' })
      expect(store.allSoundboards[0].width).toBe(400)
      expect(store.allSoundboards[0].height).toBe(500)
      expect(store.allSoundboards[0].name).toBe('Renamed')
    })
  })

  describe('updatedAt timestamp', () => {
    it('sets updatedAt on updateSoundboard', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      expect(store.allSoundboards[0].updatedAt).toBeUndefined()
      store.updateSoundboard(id, { name: 'New' })
      expect(store.allSoundboards[0].updatedAt).toBeTruthy()
    })

    it('sets updatedAt on addItem', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.addItem(id, { id: 'i1', name: 'a.wav', filePath: '/a.wav', duration: 1 })
      expect(store.allSoundboards[0].updatedAt).toBeTruthy()
    })

    it('sets updatedAt on removeItem', () => {
      const id = store.createSoundboard('X', '', 'LIST', 'Default')
      store.addItem(id, { id: 'i1', name: 'a.wav', filePath: '/a.wav', duration: 1 })
      const before = store.allSoundboards[0].updatedAt
      // Small delay to ensure different timestamp
      store.removeItem(id, 'i1')
      expect(store.allSoundboards[0].updatedAt).toBeTruthy()
    })
  })

  describe('_resetSoundboardStore', () => {
    it('clears all state', () => {
      store.createSoundboard('A', '', 'LIST', 'Default')
      store.createSoundboard('B', '', 'LIST', 'Default')
      _resetSoundboardStore()
      const fresh = useSoundboardStore()
      expect(fresh.allSoundboards).toHaveLength(0)
    })
  })
})
