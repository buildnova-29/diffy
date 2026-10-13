import { read, utils, type WorkBook, type WorkSheet } from 'xlsx'
import type { CellValue, Row, Table } from './types'

export class SheetNotFoundError extends Error {
  readonly sheetName: string
  readonly available: string[]

  constructor(sheetName: string, available: string[]) {
    super(`Sheet "${sheetName}" not found. Available sheets: ${available.join(', ') || '(none)'}`)
    this.name = 'SheetNotFoundError'
    this.sheetName = sheetName
    this.available = available
  }
}

/** Parse an .xlsx / .xls / .csv file's bytes into a SheetJS workbook. */
export function readWorkbook(data: ArrayBuffer | Uint8Array): WorkBook {
  return read(data, { type: 'array', cellDates: true })
}

export function listSheets(wb: WorkBook): string[] {
  return [...wb.SheetNames]
}

/**
 * Turn one sheet into a Table.
 * - `headerRow` is 1-based, as Excel shows it.
 * - Blank headers become "Column <letter>", repeated headers get " (2)", " (3)"...
 * - Fully blank data rows are skipped; row numbers still match the sheet.
 */
export function readTable(wb: WorkBook, sheetName: string, headerRow = 1): Table {
  const ws: WorkSheet | undefined = wb.Sheets[sheetName]
  if (!ws) throw new SheetNotFoundError(sheetName, wb.SheetNames)

  const ref = ws['!ref']
  if (!ref) return { sheetName, headers: [], rows: [] }

  const range = utils.decode_range(ref)
  const firstRow = range.s.r + 1 // 1-based row number of grid[0]
  const firstCol = range.s.c

  const grid = utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  })

  const headerIdx = headerRow - firstRow
  if (headerIdx < 0 || headerIdx >= grid.length) {
    return { sheetName, headers: [], rows: [] }
  }

  const headers = buildHeaders(grid[headerIdx] ?? [], firstCol)
  const rows: Row[] = []

  for (let i = headerIdx + 1; i < grid.length; i++) {
    const cells = grid[i] ?? []
    const values: Record<string, CellValue> = {}
    let hasValue = false
    headers.forEach((h, c) => {
      const v = toCellValue(cells[c])
      values[h] = v
      if (v !== null && v !== '') hasValue = true
    })
    if (hasValue) rows.push({ rowNumber: firstRow + i, values })
  }

  return { sheetName, headers, rows }
}

function buildHeaders(raw: unknown[], firstCol: number): string[] {
  const seen = new Map<string, number>()
  return raw.map((cell, i) => {
    let name = cell === null || cell === undefined ? '' : String(cell).trim()
    if (name === '') name = `Column ${utils.encode_col(firstCol + i)}`
    const count = (seen.get(name) ?? 0) + 1
    seen.set(name, count)
    return count === 1 ? name : `${name} (${count})`
  })
}

function toCellValue(v: unknown): CellValue {
  if (v === null || v === undefined) return null
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v
  if (v instanceof Date) return v
  return String(v)
}
