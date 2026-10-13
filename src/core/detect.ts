/**
 * Detection: the guesses diffy makes so the Set up screen arrives pre-filled.
 *  - which row holds the column names (header row)
 *  - which sheet in File 1 goes with which sheet in File 2
 *  - which column(s) identify each row (key)
 * Every guess can be changed by the user on the Set up screen.
 */
import { utils, type WorkBook } from 'xlsx'
import { normalize } from './comparator'
import type { CompareOptions } from './config'
import type { Row, Table } from './types'

// ------------------------------------------------------------------ header row

/**
 * Finds the row that holds the column names. It looks at the first rows of the
 * sheet and picks the first one that is filled across most of the table's
 * width and mostly holds text. Titles above the table are skipped.
 * Returns a 1-based row number (as Excel shows it).
 */
export function detectHeaderRow(wb: WorkBook, sheetName: string, scanRows = 20): number {
  const ws = wb.Sheets[sheetName]
  if (!ws?.['!ref']) return 1
  const range = utils.decode_range(ws['!ref'])
  const grid = utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: true }).slice(0, scanRows)
  const filled = (r: unknown[] = []) => r.filter((v) => v !== null && v !== '').length
  const widest = Math.max(0, ...grid.map((r) => filled(r)))
  if (widest === 0) return range.s.r + 1

  for (let i = 0; i < grid.length; i++) {
    const row = grid[i] ?? []
    const n = filled(row)
    if (n < Math.max(1, Math.ceil(widest * 0.6))) continue
    const texts = row.filter((v) => typeof v === 'string' && v.trim() !== '').length
    if (texts / n >= 0.6) return range.s.r + 1 + i
  }
  return range.s.r + 1
}

// ------------------------------------------------------------------ sheet pairing

export type PairStatus = 'matched' | 'check' | 'onlyFirst' | 'onlySecond'

export interface SheetPair {
  first: string | null
  second: string | null
  status: PairStatus
}

const simplify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** How alike two sheet names are, from 0 (nothing alike) to 1 (same). */
export function nameSimilarity(a: string, b: string): number {
  const x = simplify(a)
  const y = simplify(b)
  if (!x || !y) return 0
  if (x === y) return 1
  if (x.startsWith(y) || y.startsWith(x)) return 0.9
  // share of the longer name covered by the longest common prefix
  let p = 0
  while (p < Math.min(x.length, y.length) && x[p] === y[p]) p++
  const prefixScore = p / Math.max(x.length, y.length)
  // edit distance ratio
  const d = editDistance(x, y)
  return Math.max(prefixScore, 1 - d / Math.max(x.length, y.length))
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/**
 * Pairs sheets by name. Same names (ignoring case and spaces) are 'matched'.
 * Leftover sheets with similar names are paired as 'check' so the user can
 * confirm. Anything still left is only in one file.
 * The result follows File 1's sheet order, then File 2's leftovers.
 */
export function pairSheets(first: string[], second: string[], minSimilarity = 0.6): SheetPair[] {
  const pairs: SheetPair[] = []
  const freeSecond = new Set(second)
  const exact = new Map(second.map((s) => [simplify(s), s]))
  const unpaired: string[] = []

  for (const f of first) {
    const s = exact.get(simplify(f))
    if (s && freeSecond.has(s)) {
      pairs.push({ first: f, second: s, status: 'matched' })
      freeSecond.delete(s)
    } else {
      unpaired.push(f)
      pairs.push({ first: f, second: null, status: 'onlyFirst' })
    }
  }

  // best similar match for each leftover, most alike first
  const candidates = unpaired
    .flatMap((f) => [...freeSecond].map((s) => ({ f, s, score: nameSimilarity(f, s) })))
    .filter((c) => c.score >= minSimilarity)
    .sort((x, y) => y.score - x.score)
  const usedFirst = new Set<string>()
  for (const c of candidates) {
    if (usedFirst.has(c.f) || !freeSecond.has(c.s)) continue
    const p = pairs.find((x) => x.first === c.f)!
    p.second = c.s
    p.status = 'check'
    usedFirst.add(c.f)
    freeSecond.delete(c.s)
  }

  for (const s of second) if (freeSecond.has(s)) pairs.push({ first: null, second: s, status: 'onlySecond' })
  return pairs
}

// ------------------------------------------------------------------ key suggestion

export type KeyConfidence = 'unique' | 'mostlyUnique' | 'none'

export interface KeySuggestion {
  columns: string[]
  confidence: KeyConfidence
  /** Number of key values that repeat (only for 'mostlyUnique'). */
  duplicates: number
}

const ID_HINT = /(^|[\s_-])(id|code|key|no|num|number|sku|ref|reference)$|^(id|sku|code)([\s_-]|$)|\bid\b/i

function keyOf(row: Row, cols: string[], opts: CompareOptions) {
  return cols
    .map((c) => {
      const n = normalize(row.values[c] ?? null, opts)
      return n.kind === 'blank' ? '' : `${n.kind}:${String(n.value)}`
    })
    .join('\u0001')
}

/** How many rows share a key value with another row, and whether any key is blank. */
function repeats(rows: Row[], cols: string[], opts: CompareOptions) {
  const seen = new Map<string, number>()
  let blanks = 0
  for (const r of rows) {
    const k = keyOf(r, cols, opts)
    if (k.split('\u0001').every((p) => p === '')) blanks++
    seen.set(k, (seen.get(k) ?? 0) + 1)
  }
  let dup = 0
  for (const n of seen.values()) if (n > 1) dup += n - 1
  return { dup, blanks }
}

/**
 * Suggests which column(s) identify each row, by checking both files:
 * 1. one column whose values are all filled and unique (ID-like names first, then left to right)
 * 2. an ID-like column with only a few repeats (≤ 2%): used, and the repeats are reported
 * 3. two columns that are unique together, where at least one has an ID-like name
 * 4. otherwise none: compare row by row
 */
export function suggestKey(a: Table, b: Table, opts: CompareOptions): KeySuggestion {
  const shared = a.headers.filter((h) => b.headers.includes(h))
  const hinted = (h: string) => ID_HINT.test(h.trim())
  const ordered = [...shared.filter(hinted), ...shared.filter((h) => !hinted(h))]
  const isUnique = (cols: string[]) =>
    [a.rows, b.rows].every((rows) => {
      const { dup, blanks } = repeats(rows, cols, opts)
      return dup === 0 && blanks === 0
    })
  const minRows = Math.min(a.rows.length, b.rows.length)
  if (minRows < 2) return { columns: [], confidence: 'none', duplicates: 0 }

  // 1. single unique column; non-ID columns must also look like labels, not numbers or dates
  for (const h of ordered) {
    if (!hinted(h) && !looksLikeLabel(a.rows, h, opts)) continue
    if (isUnique([h])) return { columns: [h], confidence: 'unique', duplicates: 0 }
  }

  const hintedShared = shared.filter(hinted)

  // 2. ID-like column with only a few repeats
  for (const h of hintedShared) {
    const ra = repeats(a.rows, [h], opts)
    const rb = repeats(b.rows, [h], opts)
    const dup = Math.max(ra.dup, rb.dup)
    if (ra.blanks === 0 && rb.blanks === 0 && dup / minRows <= 0.02) return { columns: [h], confidence: 'mostlyUnique', duplicates: dup }
  }

  // 3. two columns together (left-most pairs first)
  for (const h of hintedShared) {
    for (const other of shared) {
      if (other === h) continue
      const cols = shared.indexOf(other) < shared.indexOf(h) ? [other, h] : [h, other]
      if (isUnique(cols)) return { columns: cols, confidence: 'unique', duplicates: 0 }
    }
  }

  return { columns: [], confidence: 'none', duplicates: 0 }
}

/** True when most values in a column are text (not numbers, dates or yes/no). */
function looksLikeLabel(rows: Row[], col: string, opts: CompareOptions) {
  let text = 0
  let filled = 0
  for (const r of rows) {
    const n = normalize(r.values[col] ?? null, opts)
    if (n.kind === 'blank') continue
    filled++
    if (n.kind === 'text') text++
  }
  return filled > 0 && text / filled >= 0.9
}

/** Checks a key the user picked: is it unique in both files, or how many repeats? */
export function checkKey(a: Table, b: Table, cols: string[], opts: CompareOptions): KeySuggestion {
  if (cols.length === 0) return { columns: [], confidence: 'none', duplicates: 0 }
  const ra = repeats(a.rows, cols, opts)
  const rb = repeats(b.rows, cols, opts)
  const dup = Math.max(ra.dup, rb.dup) + Math.max(ra.blanks, rb.blanks)
  return { columns: cols, confidence: dup === 0 ? 'unique' : 'mostlyUnique', duplicates: dup }
}
