import { describe, expect, it } from 'vitest'
import { CompareOptionsSchema } from '../config'
import { detectHeaderRow, nameSimilarity, pairSheets, suggestKey } from '../detect'
import { matchByPosition } from '../matcher'
import { readTable } from '../reader'
import type { Table } from '../types'
import { makeWorkbook } from './helpers'

const opts = CompareOptionsSchema.parse({})
const table = (aoa: unknown[][]): Table => readTable(makeWorkbook({ S: aoa }), 'S')

describe('detectHeaderRow', () => {
  it('is row 1 for a plain table', () => {
    expect(detectHeaderRow(makeWorkbook({ S: [['ID', 'Name'], [1, 'a']] }), 'S')).toBe(1)
  })
  it('skips title rows and blank rows above the table', () => {
    const wb = makeWorkbook({ S: [['Price list 2026'], [], ['Code', 'Item', 'Price'], ['A', 'Pen', 10]] })
    expect(detectHeaderRow(wb, 'S')).toBe(3)
  })
  it('does not treat a row of numbers as the header', () => {
    const wb = makeWorkbook({ S: [['Monthly totals'], [2024, 2025, 2026], ['Jan', 'Feb', 'Mar']] })
    expect(detectHeaderRow(wb, 'S')).toBe(3)
  })
})

describe('pairSheets', () => {
  it('matches same names ignoring case and spaces', () => {
    expect(pairSheets(['Prices', 'Stock'], ['stock', 'PRICES'])).toEqual([
      { first: 'Prices', second: 'PRICES', status: 'matched' },
      { first: 'Stock', second: 'stock', status: 'matched' },
    ])
  })
  it('pairs similar names for checking and lists the rest as one-file sheets', () => {
    expect(pairSheets(['Discounts', 'Archive'], ['Discounts_Apr', 'Forecast'])).toEqual([
      { first: 'Discounts', second: 'Discounts_Apr', status: 'check' },
      { first: 'Archive', second: null, status: 'onlyFirst' },
      { first: null, second: 'Forecast', status: 'onlySecond' },
    ])
  })
  it('scores names', () => {
    expect(nameSimilarity('Sheet1', 'sheet 1')).toBe(1)
    expect(nameSimilarity('Prices', 'Prices_v2')).toBeGreaterThan(0.6)
    expect(nameSimilarity('Prices', 'Holidays')).toBeLessThan(0.6)
  })
})

describe('suggestKey', () => {
  it('prefers an ID-like unique column', () => {
    const t = table([['Name', 'Emp ID'], ['Ann', 'E1'], ['Bob', 'E2']])
    expect(suggestKey(t, t, opts)).toEqual({ columns: ['Emp ID'], confidence: 'unique', duplicates: 0 })
  })
  it('uses two columns when one alone repeats', () => {
    const t = table([['Store', 'SKU', 'Qty'], ['A', 'S1', 1], ['B', 'S1', 2], ['A', 'S2', 3], ['B', 'S2', 4]])
    expect(suggestKey(t, t, opts).columns).toEqual(['Store', 'SKU'])
  })
  it('accepts an ID column with a few repeats, and reports them', () => {
    const rows = Array.from({ length: 60 }, (_, i) => [`T${i}`, i])
    rows[10][0] = 'T9'
    const t = table([['Ticket ID', 'Hours'], ...rows])
    expect(suggestKey(t, t, opts)).toEqual({ columns: ['Ticket ID'], confidence: 'mostlyUnique', duplicates: 1 })
  })
  it('gives up (row by row) when nothing identifies a row', () => {
    const t = table([['Date', 'Qty'], [1, 1], [1, 2], [2, 2]])
    expect(suggestKey(t, t, opts)).toEqual({ columns: [], confidence: 'none', duplicates: 0 })
  })
  it('does not pick a unique number column like an amount', () => {
    const t = table([['Region', 'Amount'], ['N', 10], ['N', 20], ['S', 30]])
    expect(suggestKey(t, t, opts).columns).toEqual([])
  })
})

describe('matchByPosition', () => {
  it('pairs rows in order and reports extras', () => {
    const r = (n: number) => ({ rowNumber: n, values: {} })
    const m = matchByPosition([r(2), r(3)], [r(2), r(3), r(4)])
    expect(m.matched.map((x) => x.key)).toEqual(['Row 1', 'Row 2'])
    expect(m.onlyAfter.map((x) => x.key)).toEqual(['Row 3'])
  })
})
