import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTagStore = defineStore('tags', () => {
  const tagDefinitions = ref<Record<string, { color: string }>>({
    uncategorized: { color: '#888888' },
  })

  function loadTags(tags: Record<string, { color: string }>) {
    tagDefinitions.value = { ...tagDefinitions.value, ...tags }
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

  function getColor(tagName: string): string {
    return tagDefinitions.value[tagName]?.color ?? '#888888'
  }

  return {
    tagDefinitions,
    loadTags,
    createTag,
    setTagColor,
    deleteTag,
    getColor,
  }
})
