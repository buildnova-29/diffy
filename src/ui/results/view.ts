/**
 * Pure helpers behind the Results screen: which columns to show,
 * which rows pass the filter and search, and the counts per status.
 */
import type { CellValue, RowDiff, RowStatus, SheetDiff } from '../../core'
import { formatCell } from '../format'

export type Filter = 'all' | RowStatus

export interface Column {
  name: string
  kind: 'key' | 'compare' | 'ignore' | 'only'
  /** For 'only' columns: the file that has it. */
  only?: 1 | 2
}

/** Key columns first, then compared columns, then ignored ones (shown greyed). */
export function columnsOf(d: SheetDiff, ignored: string[]): Column[] {
  const key: Column[] = d.keyColumns.length
    ? d.keyColumns.map((name) => ({ name, kind: 'key' }))
    : [{ name: '', kind: 'key' }] // row by row: the "Row N" label stands in for the key
  return [
    ...key,
    ...d.comparedColumns.map((name): Column => ({ name, kind: 'compare' })),
    ...ignored.filter((n) => !d.keyColumns.includes(n)).map((name): Column => ({ name, kind: 'ignore' })),
  ]
}

/**
 * Side by side: both files show the same columns in the same order, so scrolling one side
 * lines up with the other. Columns that exist in only one file are blank on the other side.
 */
export function sideColumns(d: SheetDiff, ignored: string[]): Column[] {
  return [
    ...columnsOf(d, ignored),
    ...d.columnsOnlyInBefore.map((name): Column => ({ name, kind: 'only', only: 1 })),
    ...d.columnsOnlyInAfter.map((name): Column => ({ name, kind: 'only', only: 2 })),
  ]
}

/** A width in pixels that fits the header and most values of a column, from both files. */
export function columnWidth(c: Column, rows: RowDiff[]): number {
  if (c.kind === 'key' && !c.name) return 96
  let chars = c.name.length + 3
  for (const r of rows.slice(0, 400))
    for (const row of [r.beforeRow, r.afterRow]) {
      const v = row?.values[c.name]
      if (v !== undefined && v !== null) chars = Math.max(chars, formatCell(v).length)
    }
  return Math.min(Math.max(Math.round(chars * 8.6 + 30), 72), 320)
}

/** The value to show for a row: the second file's, except for removed rows. */
export function valueOf(r: RowDiff, column: string): CellValue {
  const row = r.status === 'removed' ? r.beforeRow : r.afterRow
  return row?.values[column] ?? null
}

export function counts(rows: RowDiff[]): Record<Filter, number> {
  const c: Record<Filter, number> = {
    all: rows.length,
    modified: 0,
    added: 0,
    removed: 0,
    unchanged: 0,
  }
  for (const r of rows) c[r.status]++
  return c
}

function matches(r: RowDiff, q: string): boolean {
  if (r.key.toLowerCase().includes(q)) return true
  for (const row of [r.beforeRow, r.afterRow]) {
    if (!row) continue
    for (const v of Object.values(row.values)) if (formatCell(v).toLowerCase().includes(q)) return true
  }
  return false
}

export function visibleRows(rows: RowDiff[], filter: Filter, search: string): RowDiff[] {
  const q = search.trim().toLowerCase()
  return rows.filter((r) => (filter === 'all' || r.status === filter) && (!q || matches(r, q)))
}

/** Rows with any difference: what the number on each sheet tab shows. */
export const differing = (d: SheetDiff) => d.summary.modified + d.summary.added + d.summary.removed
