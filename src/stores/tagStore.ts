import { ref, reactive } from 'vue'

export interface TagDefinition {
  color: string
}

const tagDefinitions = ref<Record<string, TagDefinition>>({
  uncategorized: { color: '#888888' },
})

export function useTagStore() {
  function loadTags(tags: Record<string, { color: string; category?: string }>) {
    for (const [name, def] of Object.entries(tags)) {
      tagDefinitions.value[name] = { color: def.color }
    }
  }

  function createTag(name: string, color: string = '#888888') {
    tagDefinitions.value[name] = { color }
  }

  function setTagColor(name: string, color: string) {
    if (tagDefinitions.value[name]) {
      tagDefinitions.value[name].color = color
    }
  }

  function deleteTag(name: string) {
    if (name !== 'uncategorized') {
      delete tagDefinitions.value[name]
    }
  }

  function renameTag(oldName: string, newName: string) {
    if (oldName === 'uncategorized' || oldName === newName) return
    if (!tagDefinitions.value[oldName]) return
    tagDefinitions.value[newName] = { ...tagDefinitions.value[oldName] }
    delete tagDefinitions.value[oldName]
  }

  function replaceTags(tags: Record<string, { color: string }>) {
    tagDefinitions.value = { uncategorized: { color: '#888888' }, ...tags }
  }

  function getColor(tagName: string): string {
    return tagDefinitions.value[tagName]?.color ?? '#888888'
  }

  return reactive({
    tagDefinitions,
    loadTags,
    replaceTags,
    createTag,
    setTagColor,
    deleteTag,
    renameTag,
    getColor,
  })
}

export function _resetTagStore() {
  tagDefinitions.value = { uncategorized: { color: '#888888' } }
}
