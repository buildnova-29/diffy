/**
 * The plan: everything diffy works out before comparing, in one object.
 * The Set up screen shows the plan, the user adjusts it, and planToConfig()
 * turns it into the config the comparison engine runs on.
 */
import type { WorkBook } from 'xlsx'
import { CompareOptionsSchema, parseConfig, type CompareOptions, type DiffConfig } from './config'
import { detectHeaderRow, pairSheets, suggestKey, type KeySuggestion, type PairStatus } from './detect'
import { readTable } from './reader'
import type { Row } from './types'

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

export function buildPlan(first: WorkBook, second: WorkBook, options: Partial<CompareOptions> = {}, previewRows = 3): SheetPlan[] {
  const opts = CompareOptionsSchema.parse(options)
  return pairSheets(first.SheetNames, second.SheetNames).map((p) => {
    const hf = p.first ? detectHeaderRow(first, p.first) : 1
    const hs = p.second ? detectHeaderRow(second, p.second) : 1
    const ta = p.first ? readTable(first, p.first, hf) : null
    const tb = p.second ? readTable(second, p.second, hs) : null
    const both = Boolean(ta && tb)
    return {
      first: p.first,
      second: p.second,
      status: p.status,
      included: both,
      headerRowFirst: hf,
      headerRowSecond: hs,
      columns: both ? ta!.headers.filter((h) => tb!.headers.includes(h)) : [],
      columnsOnlyFirst: both ? ta!.headers.filter((h) => !tb!.headers.includes(h)) : [],
      columnsOnlySecond: both ? tb!.headers.filter((h) => !ta!.headers.includes(h)) : [],
      key: both ? suggestKey(ta!, tb!, opts) : { columns: [], confidence: 'none', duplicates: 0 },
      ignored: [],
      rowCountFirst: ta?.rows.length ?? 0,
      rowCountSecond: tb?.rows.length ?? 0,
      previewFirst: ta?.rows.slice(0, previewRows) ?? [],
      previewSecond: tb?.rows.slice(0, previewRows) ?? [],
    }
  })
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
