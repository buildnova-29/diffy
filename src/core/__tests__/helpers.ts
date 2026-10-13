import { utils, write } from 'xlsx'
import { readWorkbook } from '../reader'

/** Build an in-memory .xlsx (as bytes) from sheet name -> 2D array, then read it back. */
export function makeWorkbook(sheets: Record<string, unknown[][]>) {
  const wb = utils.book_new()
  for (const [name, aoa] of Object.entries(sheets)) {
    utils.book_append_sheet(wb, utils.aoa_to_sheet(aoa), name)
  }
  const bytes = write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return readWorkbook(bytes)
}
