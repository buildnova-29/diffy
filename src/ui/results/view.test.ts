import { describe, expect, it } from 'vitest'
import type { RowDiff, SheetDiff } from '../../core'
import { columnsOf, counts, valueOf, visibleRows } from './view'

const row = (status: RowDiff['status'], key: string, before?: object, after?: object): RowDiff => ({
  status,
  key,
  beforeRow: before ? { rowNumber: 2, values: before as never } : undefined,
  afterRow: after ? { rowNumber: 2, values: after as never } : undefined,
  changes: [],
})
const rows = [
  row('modified', 'P1', { Name: 'Pen' }, { Name: 'Pens' }),
  row('removed', 'P2', { Name: 'Eraser' }),
  row('added', 'P3', undefined, { Name: 'Marker' }),
  row('unchanged', 'P4', { Name: 'Ruler' }, { Name: 'Ruler' }),
]
const diff = { keyColumns: ['ID'], comparedColumns: ['Name', 'Price'] } as SheetDiff

describe('results view', () => {
  it('orders columns: key, compared, ignored', () => {
    expect(columnsOf(diff, ['Notes']).map((c) => `${c.kind}:${c.name}`)).toEqual(['key:ID', 'compare:Name', 'compare:Price', 'ignore:Notes'])
    expect(columnsOf({ ...diff, keyColumns: [] }, [])[0]).toEqual({ name: '', kind: 'key' })
  })
  it('shows the first file value only for removed rows', () => {
    expect(valueOf(rows[0], 'Name')).toBe('Pens')
    expect(valueOf(rows[1], 'Name')).toBe('Eraser')
  })
  it('counts, filters and searches (old values too)', () => {
    expect(counts(rows)).toEqual({ all: 4, modified: 1, added: 1, removed: 1, unchanged: 1 })
    expect(visibleRows(rows, 'removed', '').map((r) => r.key)).toEqual(['P2'])
    expect(visibleRows(rows, 'all', 'pen').map((r) => r.key)).toEqual(['P1'])
    expect(visibleRows(rows, 'all', ' p3 ').map((r) => r.key)).toEqual(['P3'])
  })
})
