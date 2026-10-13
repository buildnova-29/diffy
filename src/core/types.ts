/**
 * Core types for the Diffy comparison engine.
 * Kept free of any UI or file-format dependencies.
 */

/** A single cell value as read from a workbook. */
export type CellValue = string | number | boolean | Date | null

/** A data row: header name -> value, plus where it came from. */
export interface Row {
  /** 1-based row number in the source sheet (as Excel shows it). */
  rowNumber: number
  values: Record<string, CellValue>
}

/** A sheet turned into a header + rows table. */
export interface Table {
  sheetName: string
  headers: string[]
  rows: Row[]
}

export type RowStatus = 'added' | 'removed' | 'modified' | 'unchanged'

export interface CellChange {
  column: string
  before: CellValue
  after: CellValue
}

export interface RowDiff {
  status: RowStatus
  /** Display key built from the key columns, e.g. "PN-100 | 10". */
  key: string
  beforeRow?: Row
  afterRow?: Row
  /** Only filled for 'modified' rows. */
  changes: CellChange[]
}

export interface DuplicateKey {
  side: 'before' | 'after'
  key: string
  rowNumbers: number[]
}

export interface DiffSummary {
  added: number
  removed: number
  modified: number
  unchanged: number
  /** Total number of changed cells across all modified rows. */
  changedCells: number
}

export interface SheetDiff {
  name: string
  keyColumns: string[]
  comparedColumns: string[]
  /** Columns that exist only in the Before / After sheet. */
  columnsOnlyInBefore: string[]
  columnsOnlyInAfter: string[]
  rows: RowDiff[]
  duplicates: DuplicateKey[]
  summary: DiffSummary
}
