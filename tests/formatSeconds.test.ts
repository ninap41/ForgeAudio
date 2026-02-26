import { describe, it, expect } from 'vitest'
import { formatSeconds } from '../src/utils/formatSeconds'

describe('formatSeconds', () => {
  it('formats 0 as 0:00', () => {
    expect(formatSeconds(0)).toBe('0:00')
  })

  it('formats seconds less than a minute', () => {
    expect(formatSeconds(5)).toBe('0:05')
    expect(formatSeconds(30)).toBe('0:30')
    expect(formatSeconds(59)).toBe('0:59')
  })

  it('formats exact minutes', () => {
    expect(formatSeconds(60)).toBe('1:00')
    expect(formatSeconds(120)).toBe('2:00')
    expect(formatSeconds(300)).toBe('5:00')
  })

  it('formats minutes and seconds', () => {
    expect(formatSeconds(65)).toBe('1:05')
    expect(formatSeconds(125)).toBe('2:05')
    expect(formatSeconds(90)).toBe('1:30')
  })

  it('pads seconds with leading zero', () => {
    expect(formatSeconds(61)).toBe('1:01')
    expect(formatSeconds(3)).toBe('0:03')
  })

  it('floors fractional seconds', () => {
    expect(formatSeconds(1.5)).toBe('0:01')
    expect(formatSeconds(65.9)).toBe('1:05')
    expect(formatSeconds(0.99)).toBe('0:00')
  })

  it('handles null as 0:00', () => {
    expect(formatSeconds(null)).toBe('0:00')
  })

  it('handles undefined as 0:00', () => {
    expect(formatSeconds(undefined)).toBe('0:00')
  })

  it('handles NaN as 0:00', () => {
    expect(formatSeconds(NaN)).toBe('0:00')
  })

  it('handles negative numbers as 0:00', () => {
    expect(formatSeconds(-5)).toBe('0:00')
    expect(formatSeconds(-100)).toBe('0:00')
  })

  it('handles Infinity as 0:00', () => {
    expect(formatSeconds(Infinity)).toBe('0:00')
    expect(formatSeconds(-Infinity)).toBe('0:00')
  })

  it('handles large values', () => {
    expect(formatSeconds(3600)).toBe('60:00')
    expect(formatSeconds(3661)).toBe('61:01')
  })
})
