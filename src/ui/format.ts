import type { CellValue } from '../core'

/** Shows a cell value the way a person expects to read it. */
export function formatCell(v: CellValue): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) {
    // The Excel reader gives dates in the computer's own time zone, so read them back the same way.
    const p2 = (n: number) => String(n).padStart(2, '0')
    const d = `${v.getFullYear()}-${p2(v.getMonth() + 1)}-${p2(v.getDate())}`
    const hasTime = v.getHours() || v.getMinutes() || v.getSeconds()
    return hasTime ? `${d} ${p2(v.getHours())}:${p2(v.getMinutes())}` : d
  }
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(12)))
  return v
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`
