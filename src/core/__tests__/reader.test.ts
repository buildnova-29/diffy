import { describe, expect, it } from 'vitest'
import { listSheets, readTable, SheetNotFoundError } from '../reader'
import { makeWorkbook } from './helpers'

describe('readTable', () => {
  it('reads headers and rows with Excel row numbers', () => {
    const wb = makeWorkbook({
      Products: [
        ['Product', 'Qty'],
        ['A', 1],
        ['B', 2],
      ],
    })
    const t = readTable(wb, 'Products')
    expect(t.headers).toEqual(['Product', 'Qty'])
    expect(t.rows).toEqual([
      { rowNumber: 2, values: { Product: 'A', Qty: 1 } },
      { rowNumber: 3, values: { Product: 'B', Qty: 2 } },
    ])
  })

  it('supports a header row below a title and skips blank rows', () => {
    const wb = makeWorkbook({
      Products: [['Price list 2026'], [], ['Product', 'Qty'], ['A', 1], [null, null], ['B', 2]],
    })
    const t = readTable(wb, 'Products', 3)
    expect(t.headers).toEqual(['Product', 'Qty'])
    expect(t.rows.map((r) => r.rowNumber)).toEqual([4, 6])
  })

  it('names blank headers and de-duplicates repeated ones', () => {
    const wb = makeWorkbook({ S: [['Product', null, 'Note', 'Note'], ['A', 1, 'x', 'y']] })
    expect(readTable(wb, 'S').headers).toEqual(['Product', 'Column B', 'Note', 'Note (2)'])
  })

  it('throws a helpful error for a missing sheet', () => {
    const wb = makeWorkbook({ Products: [['Product']] })
    expect(listSheets(wb)).toEqual(['Products'])
    expect(() => readTable(wb, 'Nope')).toThrow(SheetNotFoundError)
  })
})

describe('listSheetNames', () => {
  it('reads only the sheet names from file bytes', async () => {
    const { utils, write } = await import('xlsx')
    const wb = utils.book_new()
    utils.book_append_sheet(wb, utils.aoa_to_sheet([['a']]), 'Prices')
    utils.book_append_sheet(wb, utils.aoa_to_sheet([['b']]), 'Stock')
    const bytes = write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    const { listSheetNames } = await import('../reader')
    expect(listSheetNames(bytes)).toEqual(['Prices', 'Stock'])
  })
})
