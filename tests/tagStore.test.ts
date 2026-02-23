import { describe, it, expect, beforeEach } from 'vitest'
import { useTagStore, _resetTagStore } from '../src/stores/tagStore'

beforeEach(() => {
  _resetTagStore()
})

describe('tagStore', () => {
  it('starts with uncategorized tag', () => {
    const store = useTagStore()
    expect(store.tagDefinitions).toHaveProperty('uncategorized')
    expect(store.tagDefinitions.uncategorized.color).toBe('#888888')
  })

  it('creates a new tag with default color', () => {
    const store = useTagStore()
    store.createTag('impact')

    expect(store.tagDefinitions.impact).toEqual({ color: '#888888' })
  })

  it('creates a new tag with custom color', () => {
    const store = useTagStore()
    store.createTag('ambient', '#4da6ff')

    expect(store.tagDefinitions.ambient.color).toBe('#4da6ff')
  })

  it('updates tag color', () => {
    const store = useTagStore()
    store.createTag('foley', '#ffffff')
    store.setTagColor('foley', '#ff0000')

    expect(store.tagDefinitions.foley.color).toBe('#ff0000')
  })

  it('does not update color for nonexistent tag', () => {
    const store = useTagStore()
    store.setTagColor('nope', '#ff0000')

    expect(store.tagDefinitions).not.toHaveProperty('nope')
  })

  it('deletes a tag', () => {
    const store = useTagStore()
    store.createTag('temp')
    store.deleteTag('temp')

    expect(store.tagDefinitions).not.toHaveProperty('temp')
  })

  it('prevents deleting uncategorized', () => {
    const store = useTagStore()
    store.deleteTag('uncategorized')

    expect(store.tagDefinitions).toHaveProperty('uncategorized')
  })

  it('loads tags and merges with existing', () => {
    const store = useTagStore()
    store.loadTags({
      impact: { color: '#ff4d4d' },
      ambient: { color: '#4da6ff' },
    })

    expect(store.tagDefinitions.uncategorized).toBeDefined()
    expect(store.tagDefinitions.impact.color).toBe('#ff4d4d')
    expect(store.tagDefinitions.ambient.color).toBe('#4da6ff')
  })

  it('loadTags ignores the category field from old library.json', () => {
    const store = useTagStore()
    store.loadTags({ oldtag: { color: '#ffffff', category: 'General' } })

    expect(store.tagDefinitions.oldtag).toEqual({ color: '#ffffff' })
  })

  it('getColor returns tag color', () => {
    const store = useTagStore()
    store.createTag('ui', '#9d4dff')

    expect(store.getColor('ui')).toBe('#9d4dff')
  })

  it('getColor returns default for unknown tag', () => {
    const store = useTagStore()

    expect(store.getColor('nonexistent')).toBe('#888888')
  })

  describe('replaceTags', () => {
    it('replaces all tags with the provided set', () => {
      const store = useTagStore()
      store.createTag('old1', '#ff0000')
      store.createTag('old2', '#00ff00')

      store.replaceTags({ newTag: { color: '#0000ff' } })

      expect(store.tagDefinitions).not.toHaveProperty('old1')
      expect(store.tagDefinitions).not.toHaveProperty('old2')
      expect(store.tagDefinitions.newTag.color).toBe('#0000ff')
    })

    it('always preserves uncategorized with default color', () => {
      const store = useTagStore()
      store.replaceTags({ ambient: { color: '#4da6ff' } })

      expect(store.tagDefinitions.uncategorized).toBeDefined()
      expect(store.tagDefinitions.uncategorized.color).toBe('#888888')
    })

    it('allows overriding uncategorized color', () => {
      const store = useTagStore()
      store.replaceTags({ uncategorized: { color: '#ff0000' } })

      expect(store.tagDefinitions.uncategorized.color).toBe('#ff0000')
    })
  })

  describe('renameTag', () => {
    it('renames a tag key and preserves its color', () => {
      const store = useTagStore()
      store.createTag('oldname', '#ff0000')
      store.renameTag('oldname', 'newname')

      expect(store.tagDefinitions).not.toHaveProperty('oldname')
      expect(store.tagDefinitions.newname.color).toBe('#ff0000')
    })

    it('is a no-op when old and new names are the same', () => {
      const store = useTagStore()
      store.createTag('impact', '#ff0000')
      store.renameTag('impact', 'impact')

      expect(store.tagDefinitions.impact.color).toBe('#ff0000')
    })

    it('does nothing for a nonexistent tag', () => {
      const store = useTagStore()
      store.renameTag('ghost', 'real')

      expect(store.tagDefinitions).not.toHaveProperty('real')
    })

    it('prevents renaming uncategorized', () => {
      const store = useTagStore()
      store.renameTag('uncategorized', 'other')

      expect(store.tagDefinitions).toHaveProperty('uncategorized')
      expect(store.tagDefinitions).not.toHaveProperty('other')
    })
  })
})
