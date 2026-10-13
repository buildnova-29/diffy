/**
 * The plan: everything diffy works out before comparing, in one object.
 * The Set up screen shows the plan, the user adjusts it, and planToConfig()
 * turns it into the config the comparison engine runs on.
 */
import type { WorkBook } from 'xlsx'
import { CompareOptionsSchema, parseConfig, type CompareOptions, type DiffConfig } from './config'
import { detectHeaderRow, pairSheets, suggestKey, type KeySuggestion, type PairStatus } from './detect'
import { readTable } from './reader'
import type { Row, Table } from './types'

export interface SheetPlan {
  /** Sheet name in File 1 (null if only in File 2). */
  first: string | null
  /** Sheet name in File 2 (null if only in File 1). */
  second: string | null
  status: PairStatus
  /** Ticked = compared. Sheets in only one file are never compared. */
  included: boolean
  headerRowFirst: number
  headerRowSecond: number
  /** Columns in both files, in File 1's order. */
  columns: string[]
  columnsOnlyFirst: string[]
  columnsOnlySecond: string[]
  key: KeySuggestion
  /** Columns the user chose not to compare. */
  ignored: string[]
  rowCountFirst: number
  rowCountSecond: number
  /** First few rows of each file, for the preview. */
  previewFirst: Row[]
  previewSecond: Row[]
}

/** The full tables behind one sheet pair (kept so keys can be re-checked quickly). */
export interface TablePair {
  first: Table | null
  second: Table | null
}

const NO_KEY: KeySuggestion = { columns: [], confidence: 'none', duplicates: 0 }

/** Plans one sheet pair: header rows, columns, key and preview. */
export function planPair(
  wbFirst: WorkBook,
  wbSecond: WorkBook,
  first: string | null,
  second: string | null,
  status: PairStatus,
  options: Partial<CompareOptions> = {},
  previewRows = 3,
): { plan: SheetPlan; tables: TablePair } {
  const opts = CompareOptionsSchema.parse(options)
  const hf = first ? detectHeaderRow(wbFirst, first) : 1
  const hs = second ? detectHeaderRow(wbSecond, second) : 1
  const ta = first ? readTable(wbFirst, first, hf) : null
  const tb = second ? readTable(wbSecond, second, hs) : null
  const both = ta && tb
  return {
    tables: { first: ta, second: tb },
    plan: {
      first,
      second,
      status,
      included: Boolean(both),
      headerRowFirst: hf,
      headerRowSecond: hs,
      columns: both ? ta.headers.filter((h) => tb.headers.includes(h)) : [],
      columnsOnlyFirst: both ? ta.headers.filter((h) => !tb.headers.includes(h)) : [],
      columnsOnlySecond: both ? tb.headers.filter((h) => !ta.headers.includes(h)) : [],
      key: both ? suggestKey(ta, tb, opts) : NO_KEY,
      ignored: [],
      rowCountFirst: ta?.rows.length ?? 0,
      rowCountSecond: tb?.rows.length ?? 0,
      previewFirst: ta?.rows.slice(0, previewRows) ?? [],
      previewSecond: tb?.rows.slice(0, previewRows) ?? [],
    },
  }
}

/** Pairs every sheet and plans each pair. Also returns the tables, in the same order. */
export function analyse(first: WorkBook, second: WorkBook, options: Partial<CompareOptions> = {}) {
  const parts = pairSheets(first.SheetNames, second.SheetNames).map((p) => planPair(first, second, p.first, p.second, p.status, options))
  return { plan: parts.map((p) => p.plan), tables: parts.map((p) => p.tables) }
}

export function buildPlan(first: WorkBook, second: WorkBook, options: Partial<CompareOptions> = {}): SheetPlan[] {
  return analyse(first, second, options).plan
}

/** Turns the (possibly user-edited) plan into a config for compareWorkbooks(). */
export function planToConfig(plan: SheetPlan[], options: Partial<CompareOptions> = {}): DiffConfig {
  const sheets = plan
    .filter((p) => p.included && p.first && p.second)
    .map((p) => ({
      name: p.first!,
      beforeSheet: p.first!,
      afterSheet: p.second!,
      headerRow: p.headerRowFirst,
      afterHeaderRow: p.headerRowSecond,
      keyColumns: p.key.columns,
      ignoreColumns: p.ignored,
    }))
  return parseConfig({ sheets, options })
}
