import { describe, expect, it } from 'vitest'
import { formatCell } from './format'

describe('formatCell', () => {
  it('shows dates as the local calendar date, with time only when set', () => {
    expect(formatCell(new Date(2026, 0, 29))).toBe('2026-01-29')
    expect(formatCell(new Date(2026, 0, 29, 9, 5))).toBe('2026-01-29 09:05')
  })
  it('shows other values plainly', () => {
    expect(formatCell(null)).toBe('')
    expect(formatCell(true)).toBe('TRUE')
    expect(formatCell(0.1 + 0.2)).toBe('0.3')
  })
})
