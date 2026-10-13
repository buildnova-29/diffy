import { describe, expect, it } from 'vitest'
import { compareRows, valuesEqual } from '../comparator'
import { CompareOptionsSchema } from '../config'

const opts = (o = {}) => CompareOptionsSchema.parse(o)

describe('valuesEqual', () => {
  it('trims and ignores case by default', () => {
    expect(valuesEqual('  Bolt ', 'bolt', opts())).toBe(true)
  })

  it('respects caseSensitive and trim=false', () => {
    expect(valuesEqual('Bolt', 'bolt', opts({ caseSensitive: true }))).toBe(false)
    expect(valuesEqual('Bolt ', 'Bolt', opts({ trim: false }))).toBe(false)
  })

  it('treats numeric text as numbers', () => {
    expect(valuesEqual('10', 10, opts())).toBe(true)
    expect(valuesEqual('1,000', 1000, opts())).toBe(true)
    expect(valuesEqual('10', 10, opts({ coerceNumericText: false }))).toBe(false)
  })

  it('applies numeric tolerance', () => {
    expect(valuesEqual(1.0, 1.04, opts({ numericTolerance: 0.05 }))).toBe(true)
    expect(valuesEqual(1.0, 1.06, opts({ numericTolerance: 0.05 }))).toBe(false)
  })

  it('treats null and empty string as blank', () => {
    expect(valuesEqual(null, '', opts())).toBe(true)
    expect(valuesEqual(null, '   ', opts())).toBe(true)
    expect(valuesEqual(null, '', opts({ blankEqualsEmpty: false }))).toBe(false)
  })

  it('compares dates by time and booleans by value', () => {
    expect(valuesEqual(new Date(2026, 0, 1), new Date(2026, 0, 1), opts())).toBe(true)
    expect(valuesEqual(new Date(2026, 0, 1), new Date(2026, 0, 2), opts())).toBe(false)
    expect(valuesEqual(true, false, opts())).toBe(false)
  })

  it('never equates different kinds', () => {
    expect(valuesEqual(0, null, opts())).toBe(false)
    expect(valuesEqual('abc', 0, opts())).toBe(false)
  })
})

describe('compareRows', () => {
  it('returns only the changed columns', () => {
    const before = { rowNumber: 2, values: { Qty: 1, Desc: 'Bolt', UOM: 'EA' } }
    const after = { rowNumber: 2, values: { Qty: 2, Desc: 'bolt', UOM: 'EA' } }
    expect(compareRows(before, after, ['Qty', 'Desc', 'UOM'], opts())).toEqual([
      { column: 'Qty', before: 1, after: 2 },
    ])
  })
})
