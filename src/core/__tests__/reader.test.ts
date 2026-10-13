import { describe, expect, it } from 'vitest'
import { listSheets, readTable, SheetNotFoundError } from '../reader'
import { makeWorkbook } from './helpers'

describe('readTable', () => {
  it('reads headers and rows with Excel row numbers', () => {
    const wb = makeWorkbook({
      BOM: [
        ['Part', 'Qty'],
        ['A', 1],
        ['B', 2],
      ],
    })
    const t = readTable(wb, 'BOM')
    expect(t.headers).toEqual(['Part', 'Qty'])
    expect(t.rows).toEqual([
      { rowNumber: 2, values: { Part: 'A', Qty: 1 } },
      { rowNumber: 3, values: { Part: 'B', Qty: 2 } },
    ])
  })

  it('supports a header row below a title and skips blank rows', () => {
    const wb = makeWorkbook({
      BOM: [['Assembly X BOM'], [], ['Part', 'Qty'], ['A', 1], [null, null], ['B', 2]],
    })
    const t = readTable(wb, 'BOM', 3)
    expect(t.headers).toEqual(['Part', 'Qty'])
    expect(t.rows.map((r) => r.rowNumber)).toEqual([4, 6])
  })

  it('names blank headers and de-duplicates repeated ones', () => {
    const wb = makeWorkbook({ S: [['Part', null, 'Note', 'Note'], ['A', 1, 'x', 'y']] })
    expect(readTable(wb, 'S').headers).toEqual(['Part', 'Column B', 'Note', 'Note (2)'])
  })

  it('throws a helpful error for a missing sheet', () => {
    const wb = makeWorkbook({ BOM: [['Part']] })
    expect(listSheets(wb)).toEqual(['BOM'])
    expect(() => readTable(wb, 'Nope')).toThrow(SheetNotFoundError)
  })
})
