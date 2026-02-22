import { describe, it, expect } from 'vitest'

/**
 * Tests for the audio URL construction used in Player.vue.
 * The pattern is: 'atom://localfile' + encodeURI(path)
 */

function buildAudioUrl(filePath: string): string {
  return 'atom://localfile' + encodeURI(filePath)
}

describe('audio URL construction', () => {
  it('builds URL for simple path', () => {
    expect(buildAudioUrl('/Users/nina/sounds/kick.wav'))
      .toBe('atom://localfile/Users/nina/sounds/kick.wav')
  })

  it('encodes spaces in path', () => {
    expect(buildAudioUrl('/Users/nina/my sounds/kick drum.wav'))
      .toBe('atom://localfile/Users/nina/my%20sounds/kick%20drum.wav')
  })

  it('encodes special characters', () => {
    expect(buildAudioUrl("/Users/nina/sounds/Noah  I don't want it.mp3"))
      .toBe("atom://localfile/Users/nina/sounds/Noah%20%20I%20don't%20want%20it.mp3")
  })

  it('handles path with unicode characters', () => {
    const url = buildAudioUrl('/Users/nina/m\u00fasica/canci\u00f3n.mp3')
    expect(url).toContain('atom://localfile')
    expect(url).toContain('canci%C3%B3n.mp3')
  })
})
