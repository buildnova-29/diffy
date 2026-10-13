import { describe, expect, it } from 'vitest'
import { compareWorkbooks, MissingColumnError } from '../compare'
import { parseConfig } from '../config'
import { matchRows } from '../matcher'
import { makeWorkbook } from './helpers'

const before = makeWorkbook({
  BOM: [
    ['Parent', 'Part', 'Qty', 'Desc', 'Notes'],
    ['ASM-1', 'P-100', 2, 'Bolt M6', 'old'],
    ['ASM-1', 'P-200', 4, 'Nut M6', ''],
    ['ASM-1', 'P-300', 1, 'Bracket', ''],
    ['ASM-2', 'P-100', 1, 'Bolt M6', ''],
  ],
})

const after = makeWorkbook({
  BOM: [
    ['Parent', 'Part', 'Qty', 'Desc', 'Notes', 'Supplier'],
    ['ASM-1', 'P-100', 3, 'Bolt M6', 'new', 'Acme'],
    ['ASM-1', 'P-200', 4, 'nut m6 ', '', 'Acme'],
    ['ASM-2', 'P-100', 1, 'Bolt M6', '', 'Acme'],
    ['ASM-2', 'P-400', 6, 'Washer', '', 'Acme'],
  ],
})

describe('compareWorkbooks', () => {
  const config = parseConfig({
    sheets: [{ beforeSheet: 'BOM', keyColumns: ['Parent', 'Part'], ignoreColumns: ['Notes'] }],
  })
  const [diff] = compareWorkbooks(before, after, config)

  it('summarises added, removed, modified and unchanged rows', () => {
    expect(diff.summary).toEqual({ added: 1, removed: 1, modified: 1, unchanged: 2, changedCells: 1 })
  })

  it('reports cell-level changes on composite keys', () => {
    const modified = diff.rows.find((r) => r.status === 'modified')
    expect(modified?.key).toBe('ASM-1 | P-100')
    expect(modified?.changes).toEqual([{ column: 'Qty', before: 2, after: 3 }])
  })

  it('identifies added and removed rows', () => {
    expect(diff.rows.find((r) => r.status === 'removed')?.key).toBe('ASM-1 | P-300')
    const added = diff.rows.find((r) => r.status === 'added')
    expect(added?.key).toBe('ASM-2 | P-400')
    expect(added?.afterRow?.rowNumber).toBe(5)
  })

  it('compares shared columns only, minus keys and ignored', () => {
    expect(diff.comparedColumns).toEqual(['Qty', 'Desc'])
    expect(diff.columnsOnlyInAfter).toEqual(['Supplier'])
    expect(diff.columnsOnlyInBefore).toEqual([])
  })

  it('honours an explicit compareColumns list', () => {
    const cfg = parseConfig({
      sheets: [{ beforeSheet: 'BOM', keyColumns: ['Parent', 'Part'], compareColumns: ['Desc'] }],
    })
    const [d] = compareWorkbooks(before, after, cfg)
    expect(d.summary.modified).toBe(0)
  })

  it('throws when a key column is missing', () => {
    const cfg = parseConfig({ sheets: [{ beforeSheet: 'BOM', keyColumns: ['Item No'] }] })
    expect(() => compareWorkbooks(before, after, cfg)).toThrow(MissingColumnError)
  })

  it('maps differently named sheets', () => {
    const renamed = makeWorkbook({ 'BOM v2': [['Part', 'Qty'], ['P-1', 1]] })
    const orig = makeWorkbook({ BOM: [['Part', 'Qty'], ['P-1', 2]] })
    const cfg = parseConfig({
      sheets: [{ beforeSheet: 'BOM', afterSheet: 'BOM v2', keyColumns: ['Part'] }],
    })
    expect(compareWorkbooks(orig, renamed, cfg)[0].summary.modified).toBe(1)
  })
})

describe('matchRows duplicates', () => {
  const opts = parseConfig({ sheets: [{ beforeSheet: 'x', keyColumns: ['k'] }] }).options
  const row = (n: number, k: string, v: number) => ({ rowNumber: n, values: { k, v } })

  it('reports duplicate keys and pairs them in order', () => {
    const res = matchRows(
      [row(2, 'A', 1), row(3, 'A', 2), row(4, 'A', 3)],
      [row(2, 'A', 1), row(3, 'A', 2)],
      ['k'],
      opts,
    )
    expect(res.duplicates).toEqual([
      { side: 'before', key: 'A', rowNumbers: [2, 3, 4] },
      { side: 'after', key: 'A', rowNumbers: [2, 3] },
    ])
    expect(res.matched).toHaveLength(2)
    expect(res.onlyBefore.map((r) => r.row.rowNumber)).toEqual([4])
  })

  it('matches keys across text and number ("100" vs 100)', () => {
    const res = matchRows(
      [{ rowNumber: 2, values: { k: '100' } }],
      [{ rowNumber: 2, values: { k: 100 } }],
      ['k'],
      opts,
    )
    expect(res.matched).toHaveLength(1)
  })
})
