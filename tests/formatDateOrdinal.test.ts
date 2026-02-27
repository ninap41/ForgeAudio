import { describe, it, expect } from 'vitest'
import { formatDateOrdinal, MONTHS } from '../src/utils/formatDateOrdinal'

describe('formatDateOrdinal', () => {
  it('formats 1st correctly', () => {
    expect(formatDateOrdinal(new Date(2025, 0, 1))).toBe('January 1st, 2025')
  })

  it('formats 2nd correctly', () => {
    expect(formatDateOrdinal(new Date(2025, 1, 2))).toBe('February 2nd, 2025')
  })

  it('formats 3rd correctly', () => {
    expect(formatDateOrdinal(new Date(2025, 2, 3))).toBe('March 3rd, 2025')
  })

  it('formats 4th correctly', () => {
    expect(formatDateOrdinal(new Date(2025, 3, 4))).toBe('April 4th, 2025')
  })

  it('formats 11th correctly (special case)', () => {
    expect(formatDateOrdinal(new Date(2025, 4, 11))).toBe('May 11th, 2025')
  })

  it('formats 12th correctly (special case)', () => {
    expect(formatDateOrdinal(new Date(2025, 5, 12))).toBe('June 12th, 2025')
  })

  it('formats 13th correctly (special case)', () => {
    expect(formatDateOrdinal(new Date(2025, 6, 13))).toBe('July 13th, 2025')
  })

  it('formats 21st correctly', () => {
    expect(formatDateOrdinal(new Date(2025, 7, 21))).toBe('August 21st, 2025')
  })

  it('formats 22nd correctly', () => {
    expect(formatDateOrdinal(new Date(2025, 8, 22))).toBe('September 22nd, 2025')
  })

  it('formats 23rd correctly', () => {
    expect(formatDateOrdinal(new Date(2025, 9, 23))).toBe('October 23rd, 2025')
  })

  it('formats 31st correctly', () => {
    expect(formatDateOrdinal(new Date(2025, 11, 31))).toBe('December 31st, 2025')
  })

  it('formats a mid-month date', () => {
    expect(formatDateOrdinal(new Date(2025, 1, 14))).toBe('February 14th, 2025')
  })
})

describe('MONTHS', () => {
  it('exports 12 months', () => {
    expect(MONTHS).toHaveLength(12)
  })

  it('starts with January and ends with December', () => {
    expect(MONTHS[0]).toBe('January')
    expect(MONTHS[11]).toBe('December')
  })
})
