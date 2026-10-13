/**
 * Builds the diffy Excel report from a finished comparison.
 * Tabs: Summary (optional), then one side-by-side tab per compared sheet.
 * Follows the user's Color and Download settings. Runs in the browser and in tests.
 */
import type ExcelJS from 'exceljs'
import type { CellValue, RowDiff, SheetDiff, SheetPlan } from '../core'
import type { ColourSettings, DownloadSettings, MatchSettings } from '../state/settings'
import { DEFAULT_COLOURS } from '../state/settings'
import { formatCell } from '../ui/format'

export interface ReportInput {
  results: SheetDiff[]
  plan: SheetPlan[]
  firstName: string
  secondName: string
  match: MatchSettings
  colours: ColourSettings
  download: DownloadSettings
  /** When the report was made (shown on the Summary). */
  date?: Date
}

type Workbook = ExcelJS.Workbook
type Cell = ExcelJS.Cell

const FONT = 'Calibri'
const INK = 'FF16161D'
const MUTED = 'FF5C5C6B'
const FAINT = 'FF8E8E9C'
const LINE = 'FFE4E4EA'
const HEAD = 'FFF3F3F6'
const EMPTY = 'FFF4F4F6'
const VIOLET = 'FF6D28D9'
const LIME = 'FF65A30D'

const argb = (hex: string) => 'FF' + hex.replace('#', '').toUpperCase()
const fill = (c: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } })
const thin: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: LINE } }
const box: Partial<ExcelJS.Borders> = { top: thin, bottom: thin, left: thin, right: thin }
const gap: Partial<ExcelJS.Border> = { style: 'thick', color: { argb: 'FFFFFFFF' } }
const F = (o: Partial<ExcelJS.Font> = {}): Partial<ExcelJS.Font> => ({ name: FONT, color: { argb: INK }, ...o })

/** A dark shade of a light highlight colour (same hue), readable as text on white or on the fill. */
export function inkFor(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0
  // Keep the hue, make it dark (30% lightness) and clearly coloured unless it is a grey.
  const S = sat < 0.08 ? 0 : Math.max(sat, 0.65)
  const L = 0.3
  const c = (1 - Math.abs(2 * L - 1)) * S
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = L - c / 2
  const [r1, g1, b1] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return (
    'FF' +
    [r1, g1, b1]
      .map((v) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  )
}

/** Fill and text colours for each kind of change, from the user's Color settings. */
function palette(c: ColourSettings) {
  const builtIn = {
    changed: 'FF8A5A00',
    added: 'FF1F7A47',
    removed: 'FFB42318',
  }
  const pick = (k: 'changed' | 'added' | 'removed') => ({
    fill: argb(c[k]),
    ink: c[k].toLowerCase() === DEFAULT_COLOURS[k].toLowerCase() ? builtIn[k] : inkFor(c[k]),
  })
  return { changed: pick('changed'), added: pick('added'), removed: pick('removed'), useFill: c.highlight === 'fill' }
}
type Pal = ReturnType<typeof palette>

/** Excel tab names: at most 31 characters, none of []:*?/\ and unique. */
export function tabNamer() {
  const used = new Set<string>()
  return (wanted: string) => {
    const base =
      wanted
        .replace(/[[\]:*?/\\]/g, ' ')
        .trim()
        .slice(0, 31) || 'Sheet'
    let name = base
    for (let i = 2; used.has(name.toLowerCase()); i++) name = `${base.slice(0, 31 - String(i).length - 1)} ${i}`
    used.add(name.toLowerCase())
    return name
  }
}

/**
 * Dates come from the Excel reader in the computer's own time zone. Excel files have no time zone,
 * so keep the same calendar date and clock time when writing them back.
 */
function excelValue(v: CellValue): ExcelJS.CellValue {
  if (v instanceof Date)
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate(), v.getHours(), v.getMinutes(), v.getSeconds()))
  return v
}
function dateFormat(v: CellValue): string | undefined {
  if (!(v instanceof Date)) return undefined
  return v.getHours() || v.getMinutes() || v.getSeconds() ? 'yyyy-mm-dd hh:mm' : 'yyyy-mm-dd'
}
function put(cell: Cell, v: CellValue) {
  cell.value = excelValue(v)
  const nf = dateFormat(v)
  if (nf) cell.numFmt = nf
}

const SIGN = { modified: '≠', added: '+', removed: '−', unchanged: '=' } as const

interface Col {
  name: string
  kind: 'key' | 'compare' | 'ignore' | 'only'
  /** For 'only' columns: the file that has it. */
  only?: 1 | 2
}

function columnsFor(d: SheetDiff, ignored: string[]): Col[] {
  const key: Col[] = d.keyColumns.length
    ? d.keyColumns.map((name) => ({ name, kind: 'key' }))
    : [{ name: '', kind: 'key' }]
  return [
    ...key,
    ...d.comparedColumns.map((name): Col => ({ name, kind: 'compare' })),
    ...ignored.filter((n) => !d.keyColumns.includes(n)).map((name): Col => ({ name, kind: 'ignore' })),
  ]
}

const headerText = (c: Col) =>
  c.kind === 'key' ? `🔑 ${c.name || 'Row'}` : c.kind === 'ignore' ? `${c.name} (ignored)` : c.name

/** Column width from the header and a sample of values. */
function widthOf(header: string, values: CellValue[]): number {
  let w = header.length + 2
  for (const v of values.slice(0, 300)) w = Math.max(w, formatCell(v).length + 2)
  return Math.min(Math.max(w, 9), 42)
}

function styleHeader(cell: Cell, kind: Col['kind'] | 'status' | 'was') {
  cell.font = F({
    bold: true,
    color: { argb: kind === 'ignore' || kind === 'only' ? 'FFA1A1AE' : kind === 'key' ? 'FF5B21B6' : MUTED },
    italic: kind === 'ignore' || kind === 'only' || kind === 'was',
  })
  cell.fill = fill(HEAD)
  cell.border = box
  cell.alignment = { vertical: 'middle' }
}

/* ------------------------------------------------------------------ */
/* Side by side: File 1 left, File 2 right, split so each scrolls.     */
/* ------------------------------------------------------------------ */
function addSideBySide(
  wb: Workbook,
  tab: string,
  d: SheetDiff,
  ignored: string[],
  rows: RowDiff[],
  pal: Pal,
  names: [string, string],
) {
  // Both halves get the same columns in the same order, so a column sits in the same place on each side.
  // A column that only one file has is greyed out on the other side.
  const shared: Col[] = [
    ...columnsFor(d, ignored),
    ...d.columnsOnlyInBefore.map((name): Col => ({ name, kind: 'only', only: 1 })),
    ...d.columnsOnlyInAfter.map((name): Col => ({ name, kind: 'only', only: 2 })),
  ]
  const left = shared
  const right = shared
  const ws = wb.addWorksheet(tab)
  const L = left.length
  const MID = L + 1
  const R0 = MID + 1

  const valuesOf = (side: 'before' | 'after', name: string) =>
    rows.map((r) => (side === 'before' ? r.beforeRow : r.afterRow)?.values[name] ?? null)
  const colWidth = (c: Col) =>
    c.kind === 'key' && !c.name
      ? 10
      : widthOf(headerText(c), [...valuesOf('before', c.name), ...valuesOf('after', c.name)])
  const widths = [...left.map(colWidth), 5, ...right.map(colWidth)]
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w))

  // Name bars
  ws.mergeCells(1, 1, 1, L)
  ws.mergeCells(1, R0, 1, R0 + right.length - 1)
  const b1 = ws.getCell(1, 1)
  const b2 = ws.getCell(1, R0)
  b1.value = `①  First file · ${names[0]}`
  b2.value = `②  Second file · ${names[1]}`
  b1.font = F({ bold: true, color: { argb: 'FF5B21B6' } })
  b2.font = F({ bold: true, color: { argb: 'FF3F6212' } })
  b1.fill = fill('FFF1EAFE')
  b2.fill = fill('FFEEF7DF')
  for (const c of [b1, b2]) c.alignment = { vertical: 'middle', indent: 1 }
  ws.getRow(1).height = 24

  const hr = ws.getRow(2)
  hr.height = 22
  const head = (c: Col, here: 1 | 2) =>
    c.kind === 'only' && c.only !== here ? `${c.name} (not in this file)` : headerText(c)
  left.forEach((c, i) => {
    const cell = hr.getCell(1 + i)
    cell.value = head(c, 1)
    styleHeader(cell, c.kind)
  })
  right.forEach((c, i) => {
    const cell = hr.getCell(R0 + i)
    cell.value = head(c, 2)
    styleHeader(cell, c.kind)
  })
  styleHeader(hr.getCell(MID), 'status')

  rows.forEach((r, ri) => {
    const row = ws.getRow(3 + ri)
    const changed = new Set(r.changes.map((c) => c.column))
    for (const [side, cols, start] of [
      ['L', left, 1],
      ['R', right, R0],
    ] as const) {
      const src = side === 'L' ? r.beforeRow : r.afterRow
      const here = side === 'L' ? 1 : 2
      cols.forEach((c, j) => {
        const cell = row.getCell(start + j)
        cell.border = box
        if (!src || (c.kind === 'only' && c.only !== here)) {
          cell.fill = fill(EMPTY)
          return
        }
        if (c.kind === 'key' && !c.name) cell.value = r.key
        else put(cell, src.values[c.name] ?? null)
        const isKey = c.kind === 'key'
        let font = F({
          bold: isKey,
          color: {
            argb: c.kind === 'ignore' || c.kind === 'only' ? 'FFA1A1AE' : r.status === 'unchanged' ? MUTED : INK,
          },
        })
        if (r.status === 'removed') {
          font = F({ bold: isKey, strike: true, color: { argb: pal.removed.ink } })
          if (pal.useFill) cell.fill = fill(pal.removed.fill)
        }
        if (r.status === 'added') {
          font = F({ bold: isKey, color: { argb: pal.useFill ? INK : pal.added.ink } })
          if (pal.useFill) cell.fill = fill(pal.added.fill)
        }
        if (r.status === 'modified' && changed.has(c.name)) {
          if (pal.useFill) cell.fill = fill(pal.changed.fill)
          font =
            side === 'L'
              ? F({ strike: true, color: { argb: FAINT } })
              : F({ bold: true, color: { argb: pal.changed.ink } })
          const ch = r.changes.find((x) => x.column === c.name)
          if (side === 'R' && ch)
            cell.note = `Was: ${formatCell(ch.before) || '(blank)'}   (first file)\nNow: ${formatCell(ch.after) || '(blank)'}   (second file)`
        }
        cell.font = font
      })
    }
    const m = row.getCell(MID)
    m.value = SIGN[r.status]
    m.alignment = { horizontal: 'center', vertical: 'middle' }
    const tone =
      r.status === 'modified'
        ? pal.changed
        : r.status === 'added'
          ? pal.added
          : r.status === 'removed'
            ? pal.removed
            : null
    m.font = F({ bold: true, size: 13, color: { argb: tone ? tone.ink : FAINT } })
    m.fill = fill(HEAD)
    m.border = box
  })

  // Split the window between the two files: each half scrolls left/right on its own,
  // up/down stays shared so the rows always line up. xSplit is in 1/20 of a point.
  // The left half is as wide as File 1's columns, but never more than about half a laptop screen.
  const leftChars = widths.slice(0, MID).reduce((a, w) => a + w, 0)
  const xSplit = Math.min(Math.round((leftChars * 7 + 5) * 0.75 * 20), 9600)
  // A second split under the two header rows keeps the file names and column names in view.
  const ySplit = (24 + 22) * 20
  ws.views = [{ state: 'split', xSplit, ySplit, topLeftCell: `${ws.getColumn(R0).letter}3`, activeCell: 'A3' }]
  return ws
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */
function addSummary(wb: Workbook, input: ReportInput, tabs: { diff: SheetDiff; list: string }[], pal: Pal) {
  const s = wb.addWorksheet('Summary', {
    views: [{ showGridLines: false }],
    pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'portrait' },
  })
  ;[2, 18, 15, 15, 15, 15, 20, 10].forEach((w, i) => (s.getColumn(i + 1).width = w))
  const solid = (cell: Cell, c: string) => (cell.fill = fill(c))

  // Title
  s.getCell('B2').value = {
    richText: [
      { text: 'di', font: F({ size: 24, bold: true }) },
      { text: 'f', font: F({ size: 24, bold: true, color: { argb: 'FF7C3AED' } }) },
      { text: 'f', font: F({ size: 24, bold: true, color: { argb: LIME } }) },
      { text: 'y', font: F({ size: 24, bold: true }) },
    ],
  }
  s.getCell('C2').value = 'Comparison report'
  s.getCell('C2').font = F({ size: 13, color: { argb: MUTED } })
  const date = input.date ?? new Date()
  s.getCell('G2').value = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  s.getCell('G2').font = F({ color: { argb: MUTED } })
  s.getCell('G2').alignment = { horizontal: 'right', vertical: 'middle' }
  s.getRow(2).height = 36
  s.getCell('B2').alignment = s.getCell('C2').alignment = { vertical: 'middle' }

  // The two files
  ;(
    [
      [4, '① First file', input.firstName, 'FFF6F1FF', 'FF7C3AED'],
      [5, '② Second file', input.secondName, 'FFF3F9EA', LIME],
    ] as const
  ).forEach(([r, label, name, bg, edge]) => {
    s.mergeCells(r, 3, r, 8)
    const a = s.getCell(r, 2)
    const b = s.getCell(r, 3)
    a.value = label
    a.font = F({ bold: true, color: { argb: MUTED } })
    b.value = name
    b.font = F({ bold: true, size: 12 })
    for (let c = 2; c <= 8; c++) {
      solid(s.getCell(r, c), bg)
      s.getCell(r, c).border = { top: gap, bottom: gap }
    }
    a.border = { left: { style: 'thick', color: { argb: edge } }, top: gap, bottom: gap }
    for (const x of [a, b]) x.alignment = { vertical: 'middle', indent: 1 }
    s.getRow(r).height = 26
  })

  // Headline
  const t = input.results.reduce(
    (a, d) => ({
      modified: a.modified + d.summary.modified,
      added: a.added + d.summary.added,
      removed: a.removed + d.summary.removed,
      unchanged: a.unchanged + d.summary.unchanged,
    }),
    { modified: 0, added: 0, removed: 0, unchanged: 0 },
  )
  const differ = t.modified + t.added + t.removed
  const sheetsWithDiff = input.results.filter(
    (d) => d.summary.modified + d.summary.added + d.summary.removed > 0,
  ).length
  const notCompared = input.plan.filter((p) => !(p.included && p.first && p.second))
  const n = (x: number, one: string) => `${x.toLocaleString('en-US')} ${x === 1 ? one : one + 's'}`
  s.getCell('B7').value = differ
    ? `${n(differ, 'row')} differ across ${n(sheetsWithDiff, 'sheet')}`
    : 'No differences found'
  s.getCell('B7').font = F({ size: 18, bold: true })
  s.getCell('B8').value = [
    `${n(differ + t.unchanged, 'row')} compared in ${n(input.results.length, 'sheet')}`,
    notCompared.length ? `${n(notCompared.length, 'sheet')} not compared` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  s.getCell('B8').font = F({ color: { argb: MUTED } })
  s.getRow(7).height = 30

  // Number tiles
  ;(
    [
      ['Changed', t.modified, pal.changed],
      ['Added', t.added, pal.added],
      ['Removed', t.removed, pal.removed],
      ['Unchanged', t.unchanged, { fill: 'FFF1F1F4', ink: MUTED }],
    ] as const
  ).forEach(([label, value, tone], i) => {
    const l = s.getCell(10, 2 + i)
    const v = s.getCell(11, 2 + i)
    l.value = label.toUpperCase()
    l.font = F({ size: 9, bold: true, color: { argb: tone.ink } })
    v.value = value
    v.numFmt = '#,##0'
    v.font = F({ size: 24, bold: true, color: { argb: tone.ink } })
    for (const x of [l, v]) {
      solid(x, tone.fill)
      x.alignment = { horizontal: 'left', indent: 1, vertical: x === l ? 'bottom' : 'top' }
    }
    l.border = { top: gap, left: gap, right: gap }
    v.border = { bottom: gap, left: gap, right: gap }
  })
  s.getRow(10).height = 22
  s.getRow(11).height = 38

  // By sheet
  s.getCell('B13').value = 'By sheet'
  s.getCell('B13').font = F({ size: 13, bold: true })
  const H = 14
  ;['Sheet', 'Changed', 'Added', 'Removed', 'Unchanged', 'Rows that match', ''].forEach((h, i) => {
    const c = s.getCell(H, 2 + i)
    c.value = h
    c.font = F({ size: 10, bold: true, color: { argb: MUTED } })
    c.border = { bottom: { style: 'medium', color: { argb: INK } } }
    c.alignment = { horizontal: i === 0 || i === 5 ? 'left' : 'right', vertical: 'bottom' }
  })
  const line: Partial<ExcelJS.Borders> = { bottom: thin }
  let r = H + 1
  for (const { diff, list } of tabs) {
    const row = s.getRow(r)
    row.height = 22
    for (let c = 2; c <= 8; c++) {
      s.getCell(r, c).border = line
      s.getCell(r, c).alignment = { vertical: 'middle', horizontal: c === 2 || c === 7 ? 'left' : 'right' }
    }
    const nm = s.getCell(r, 2)
    nm.value = diff.name
    nm.font = F({ bold: true })
    const sm = diff.summary
    ;(
      [
        [3, sm.modified, pal.changed.ink],
        [4, sm.added, pal.added.ink],
        [5, sm.removed, pal.removed.ink],
        [6, sm.unchanged, MUTED],
      ] as const
    ).forEach(([col, v, ink]) => {
      const x = s.getCell(r, col)
      x.value = v
      x.numFmt = '#,##0'
      x.font = F({ bold: v > 0 && col < 6, color: { argb: v > 0 ? ink : 'FFB4B4BF' } })
    })
    const all = sm.modified + sm.added + sm.removed + sm.unchanged
    const pct = s.getCell(r, 7)
    pct.value = all ? sm.unchanged / all : 1
    pct.numFmt = '0%'
    pct.font = F()
    const go = s.getCell(r, 8)
    go.value = { text: 'Open →', hyperlink: `#'${list.replace(/'/g, "''")}'!A1` }
    go.font = F({ bold: true, color: { argb: VIOLET } })
    go.alignment = { horizontal: 'right', vertical: 'middle' }
    r++
  }
  if (tabs.length)
    s.addConditionalFormatting({
      ref: `G${H + 1}:G${r - 1}`,
      rules: [
        {
          type: 'dataBar',
          priority: 1,
          cfvo: [
            { type: 'num', value: 0 },
            { type: 'num', value: 1 },
          ],
          color: { argb: 'FFC9B8FF' },
          gradient: false,
        } as unknown as ExcelJS.ConditionalFormattingRule,
      ],
    })
  for (const p of notCompared) {
    const name = s.getCell(r, 2)
    name.value = p.first ?? p.second
    name.font = F({ color: { argb: FAINT } })
    for (let c = 2; c <= 8; c++) s.getCell(r, c).border = line
    s.mergeCells(r, 3, r, 8)
    const why = s.getCell(r, 3)
    why.value = !p.second
      ? 'Only in the first file, not compared'
      : !p.first
        ? 'Only in the second file, not compared'
        : 'Skipped'
    why.font = F({ italic: true, color: { argb: FAINT } })
    why.alignment = { horizontal: 'left', vertical: 'middle' }
    s.getRow(r).height = 22
    r++
  }

  // Colour key and settings
  const K = r + 1
  s.getCell(K, 2).value = 'Colour key'
  s.getCell(K, 2).font = F({ size: 10, bold: true, color: { argb: MUTED } })
  ;(
    [
      [3, pal.changed, 'Changed'],
      [4, pal.added, 'Added'],
      [5, pal.removed, 'Removed'],
    ] as const
  ).forEach(([col, tone, label]) => {
    const x = s.getCell(K, col)
    x.value = label
    if (pal.useFill) solid(x, tone.fill)
    x.font = F({ size: 10, bold: true, color: { argb: tone.ink } })
    x.alignment = { horizontal: 'center', vertical: 'middle' }
    x.border = { left: gap, right: gap }
  })
  s.getRow(K).height = 20
  const on = [
    input.match.ignoreCase && 'ignore case',
    input.match.ignoreSpaces && 'ignore extra spaces',
    input.match.blankEqualsEmpty && 'blank equals empty',
    input.match.numbersAsText && 'numbers stored as text',
  ].filter(Boolean)
  s.getCell(K + 2, 2).value =
    `Settings: ${on.length ? on.join(' · ') : 'exact match'}${input.download.includeUnchanged ? '' : ' · changes only'}`
  s.getCell(K + 2, 2).font = F({ size: 9, italic: true, color: { argb: FAINT } })
  s.getCell(K + 3, 2).value = 'Made with diffy. Your files never left your computer.'
  s.getCell(K + 3, 2).font = F({ size: 9, italic: true, color: { argb: FAINT } })
  return s
}

/** Fills an empty ExcelJS workbook with the report. */
export function buildReport(wb: Workbook, input: ReportInput): Workbook {
  wb.creator = 'diffy'
  wb.created = input.date ?? new Date()
  const pal = palette(input.colours)
  const name = tabNamer()
  if (input.download.summarySheet) name('Summary')

  const tabs = input.results.map((d) => {
    const ignored = input.plan.find((p) => p.first === d.name)?.ignored ?? []
    const rows = input.download.includeUnchanged ? d.rows : d.rows.filter((r) => r.status !== 'unchanged')
    return { diff: d, ignored, rows, list: name(d.name) }
  })

  if (input.download.summarySheet) addSummary(wb, input, tabs, pal)
  for (const t of tabs) {
    addSideBySide(wb, t.list, t.diff, t.ignored, t.rows, pal, [input.firstName, input.secondName])
  }
  return wb
}
