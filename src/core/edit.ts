/**
 * Small, pure helpers for the edits a user makes on the Set up screen.
 * Keeping them here (not in the UI) means they can be tested on their own.
 */
import type { PairStatus } from './detect'

export interface Pairing {
  first: string | null
  second: string | null
  status: PairStatus
}

/**
 * Pairs row `index` (a File 1 sheet) with File 2 sheet `second`, or with
 * nothing when `second` is null. Keeps every sheet listed exactly once:
 * - the File 2 sheet is taken away from any row that had it,
 * - the sheet this row had before becomes a "only in File 2" row.
 * The user's choice counts as confirmed, so the row becomes "matched".
 * Returns the new list and the positions whose plan must be rebuilt.
 */
export function repair(pairs: Pairing[], index: number, second: string | null): { pairs: Pairing[]; changed: number[] } {
  const row = pairs[index]
  if (!row?.first || row.second === second) return { pairs, changed: [] }
  const old = row.second

  const next: Pairing[] = []
  const changed: number[] = []
  pairs.forEach((p, i) => {
    if (i === index) {
      changed.push(next.length)
      next.push({ first: p.first, second, status: second ? 'matched' : 'onlyFirst' })
      return
    }
    if (second && p.second === second) {
      if (!p.first) return // a lone File 2 row: it now lives in the edited row
      changed.push(next.length)
      next.push({ first: p.first, second: null, status: 'onlyFirst' })
      return
    }
    next.push(p)
  })

  if (old) {
    changed.push(next.length)
    next.push({ first: null, second: old, status: 'onlySecond' })
  }
  return { pairs: next, changed }
}

export type ColumnRole = 'key' | 'compare' | 'ignore'

/** What a column is used for, given the current key and ignore lists. */
export function roleOf(column: string, key: string[], ignored: string[]): ColumnRole {
  if (key.includes(column)) return 'key'
  if (ignored.includes(column)) return 'ignore'
  return 'compare'
}

/** Gives a column a new role. A column is never both a key and ignored. */
export function setRole(
  column: string,
  role: ColumnRole,
  key: string[],
  ignored: string[],
): { key: string[]; ignored: string[] } {
  const k = key.filter((c) => c !== column)
  const ig = ignored.filter((c) => c !== column)
  if (role === 'key') k.push(column)
  if (role === 'ignore') ig.push(column)
  return { key: k, ignored: ig }
}
