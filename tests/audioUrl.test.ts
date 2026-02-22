import { describe, it, expect } from 'vitest'

/**
 * Tests for the audio URL construction used in Player.vue.
 * Each path segment is encoded with encodeURIComponent + extra encoding
 * for characters encodeURIComponent leaves unescaped: ! ' ( ) *
 */

function buildAudioUrl(filePath: string): string {
  return 'atom://localfile' + filePath
    .split('/')
    .map(s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()))
    .join('/')
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
      .toBe("atom://localfile/Users/nina/sounds/Noah%20%20I%20don%27t%20want%20it.mp3")
  })

  it('encodes parentheses and commas', () => {
    expect(buildAudioUrl('/Users/nina/sounds/(FOR BASS Andrew,Nina, Goose)file.m4a'))
      .toBe('atom://localfile/Users/nina/sounds/%28FOR%20BASS%20Andrew%2CNina%2C%20Goose%29file.m4a')
  })

  it('handles path with unicode characters', () => {
    const url = buildAudioUrl('/Users/nina/m\u00fasica/canci\u00f3n.mp3')
    expect(url).toContain('atom://localfile')
    expect(url).toContain('canci%C3%B3n.mp3')
  })

  it('round-trips through decodeURIComponent', () => {
    const original = '/Users/nina/sounds/(FOR BASS Andrew,Nina, Goose)Prepared to lose everything  copy.m4a'
    const url = buildAudioUrl(original)
    const decoded = decodeURIComponent(url.replace('atom://localfile', ''))
    expect(decoded).toBe(original)
  })
})
