import type { WorkBook } from 'xlsx'
import { compareRows } from './comparator'
import { resolveOptions, type CompareOptions, type DiffConfig, type SheetConfig } from './config'
import { matchRows } from './matcher'
import { readTable } from './reader'
import type { RowDiff, SheetDiff, Table } from './types'

export class MissingColumnError extends Error {
  readonly sheet: string
  readonly side: 'before' | 'after'
  readonly columns: string[]

  constructor(sheet: string, side: 'before' | 'after', columns: string[]) {
    super(`Sheet "${sheet}" (${side}) is missing column(s): ${columns.join(', ')}`)
    this.name = 'MissingColumnError'
    this.sheet = sheet
    this.side = side
    this.columns = columns
  }
}

/** Compare two already-read tables using one sheet's config. */
export function compareTables(
  before: Table,
  after: Table,
  sheet: SheetConfig,
  opts: CompareOptions,
): SheetDiff {
  const beforeCols = new Set(before.headers)
  const afterCols = new Set(after.headers)

  const required = [...sheet.keyColumns, ...sheet.compareColumns]
  const missingBefore = required.filter((c) => !beforeCols.has(c))
  if (missingBefore.length) throw new MissingColumnError(sheet.name, 'before', missingBefore)
  const missingAfter = required.filter((c) => !afterCols.has(c))
  if (missingAfter.length) throw new MissingColumnError(sheet.name, 'after', missingAfter)

  const excluded = new Set([...sheet.keyColumns, ...sheet.ignoreColumns])
  const comparedColumns = (
    sheet.compareColumns.length
      ? sheet.compareColumns
      : before.headers.filter((h) => afterCols.has(h))
  ).filter((c) => !excluded.has(c))

  const match = matchRows(before.rows, after.rows, sheet.keyColumns, opts)
  const rows: RowDiff[] = []
  let changedCells = 0

  for (const { key, before: b, after: a } of match.matched) {
    const changes = compareRows(b, a, comparedColumns, opts)
    changedCells += changes.length
    rows.push({
      status: changes.length ? 'modified' : 'unchanged',
      key,
      beforeRow: b,
      afterRow: a,
      changes,
    })
  }
  for (const { key, row } of match.onlyBefore) {
    rows.push({ status: 'removed', key, beforeRow: row, changes: [] })
  }
  rows.sort((x, y) => (x.beforeRow?.rowNumber ?? 0) - (y.beforeRow?.rowNumber ?? 0))
  for (const { key, row } of match.onlyAfter) {
    rows.push({ status: 'added', key, afterRow: row, changes: [] })
  }

  const count = (s: RowDiff['status']) => rows.filter((r) => r.status === s).length

  return {
    name: sheet.name,
    keyColumns: sheet.keyColumns,
    comparedColumns,
    columnsOnlyInBefore: before.headers.filter((h) => !afterCols.has(h)),
    columnsOnlyInAfter: after.headers.filter((h) => !beforeCols.has(h)),
    rows,
    duplicates: match.duplicates,
    summary: {
      added: count('added'),
      removed: count('removed'),
      modified: count('modified'),
      unchanged: count('unchanged'),
      changedCells,
    },
  }
}

/** Compare every configured sheet pair across two workbooks. */
export function compareWorkbooks(before: WorkBook, after: WorkBook, config: DiffConfig): SheetDiff[] {
  return config.sheets.map((sheet) =>
    compareTables(
      readTable(before, sheet.beforeSheet, sheet.headerRow),
      readTable(after, sheet.afterSheet, sheet.headerRow),
      sheet,
      resolveOptions(config, sheet),
    ),
  )
}
