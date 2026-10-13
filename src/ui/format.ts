import type { CellValue } from '../core'

/** Shows a cell value the way a person expects to read it. */
export function formatCell(v: CellValue): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) {
    const hasTime = v.getUTCHours() || v.getUTCMinutes() || v.getUTCSeconds()
    const d = v.toISOString().slice(0, 10)
    return hasTime ? `${d} ${v.toISOString().slice(11, 16)}` : d
  }
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(12)))
  return v
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`
