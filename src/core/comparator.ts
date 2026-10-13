import type { CompareOptions } from './config'
import type { CellChange, CellValue, Row } from './types'

type Normalized =
  | { kind: 'blank' }
  | { kind: 'number'; value: number }
  | { kind: 'text'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'date'; value: number }

const NUMERIC_TEXT = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i

export function normalize(v: CellValue | undefined, opts: CompareOptions): Normalized {
  if (v === null || v === undefined) return { kind: 'blank' }
  if (v instanceof Date) return { kind: 'date', value: v.getTime() }
  if (typeof v === 'boolean') return { kind: 'bool', value: v }
  if (typeof v === 'number') return { kind: 'number', value: v }

  let s = opts.trim ? v.trim() : v
  if (s === '' && opts.blankEqualsEmpty) return { kind: 'blank' }
  if (opts.coerceNumericText) {
    const compact = s.replace(/,/g, '')
    if (NUMERIC_TEXT.test(compact)) return { kind: 'number', value: Number(compact) }
  }
  if (!opts.caseSensitive) s = s.toLowerCase()
  return { kind: 'text', value: s }
}

export function valuesEqual(
  a: CellValue | undefined,
  b: CellValue | undefined,
  opts: CompareOptions,
): boolean {
  const na = normalize(a, opts)
  const nb = normalize(b, opts)
  if (na.kind !== nb.kind) return false
  switch (na.kind) {
    case 'blank':
      return true
    case 'number':
      return Math.abs(na.value - (nb as { value: number }).value) <= opts.numericTolerance
    default:
      return na.value === (nb as { value: unknown }).value
  }
}

/** Compare the given columns of two matched rows; returns only the cells that differ. */
export function compareRows(
  before: Row,
  after: Row,
  columns: string[],
  opts: CompareOptions,
): CellChange[] {
  const changes: CellChange[] = []
  for (const column of columns) {
    const b = before.values[column] ?? null
    const a = after.values[column] ?? null
    if (!valuesEqual(b, a, opts)) changes.push({ column, before: b, after: a })
  }
  return changes
}
