import { normalize } from './comparator'
import type { CompareOptions } from './config'
import type { DuplicateKey, Row } from './types'

export interface MatchedPair {
  key: string
  before: Row
  after: Row
}

export interface MatchResult {
  matched: MatchedPair[]
  onlyBefore: { key: string; row: Row }[]
  onlyAfter: { key: string; row: Row }[]
  duplicates: DuplicateKey[]
}

const SEP = '\u0001'

/** Key used for matching: normalised with the same rules as cell comparison. */
export function matchKey(row: Row, keyColumns: string[], opts: CompareOptions): string {
  return keyColumns
    .map((c) => {
      const n = normalize(row.values[c] ?? null, opts)
      return n.kind === 'blank' ? '' : `${n.kind}:${String(n.value)}`
    })
    .join(SEP)
}

/** Human-readable key for the report, e.g. "PN-100 | 10". */
export function displayKey(row: Row, keyColumns: string[]): string {
  return keyColumns
    .map((c) => {
      const v = row.values[c]
      if (v === null || v === undefined) return ''
      if (v instanceof Date) return v.toISOString().slice(0, 10)
      return String(v).trim()
    })
    .join(' | ')
}

function groupByKey(rows: Row[], keyColumns: string[], opts: CompareOptions) {
  const groups = new Map<string, Row[]>()
  for (const row of rows) {
    const k = matchKey(row, keyColumns, opts)
    const list = groups.get(k)
    if (list) list.push(row)
    else groups.set(k, [row])
  }
  return groups
}

/**
 * Pair Before rows with After rows by key.
 * Duplicate keys are reported and paired in order of appearance
 * (1st Before duplicate with 1st After duplicate, and so on).
 */
export function matchRows(
  before: Row[],
  after: Row[],
  keyColumns: string[],
  opts: CompareOptions,
): MatchResult {
  const b = groupByKey(before, keyColumns, opts)
  const a = groupByKey(after, keyColumns, opts)
  const result: MatchResult = { matched: [], onlyBefore: [], onlyAfter: [], duplicates: [] }

  const noteDuplicates = (side: 'before' | 'after', groups: Map<string, Row[]>) => {
    for (const rows of groups.values()) {
      if (rows.length > 1) {
        result.duplicates.push({
          side,
          key: displayKey(rows[0], keyColumns),
          rowNumbers: rows.map((r) => r.rowNumber),
        })
      }
    }
  }
  noteDuplicates('before', b)
  noteDuplicates('after', a)

  for (const [k, bRows] of b) {
    const aRows = a.get(k) ?? []
    bRows.forEach((row, i) => {
      const key = displayKey(row, keyColumns)
      const match = aRows[i]
      if (match) result.matched.push({ key, before: row, after: match })
      else result.onlyBefore.push({ key, row })
    })
  }

  for (const [k, aRows] of a) {
    const used = b.get(k)?.length ?? 0
    for (const row of aRows.slice(used)) {
      result.onlyAfter.push({ key: displayKey(row, keyColumns), row })
    }
  }

  return result
}
