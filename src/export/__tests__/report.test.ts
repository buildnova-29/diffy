/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { compareWorkbooks } from '../../core/compare'
import { buildPlan, planToConfig } from '../../core/plan'
import { readWorkbook } from '../../core/reader'
import { DEFAULT_COLOURS, DEFAULT_DOWNLOAD, DEFAULT_MATCH, type DownloadSettings } from '../../state/settings'
import { buildCsv, csvCell } from '../csv'
import { fileNameFor } from '../download'
import { buildReport, inkFor, tabNamer, type ReportInput } from '../report'

const load = (n: number) =>
  readWorkbook(readFileSync(resolve(__dirname, `../../../test-data/diffy_test_file_${n}.xlsx`)))
const wb1 = load(1)
const wb2 = load(2)
const plan = buildPlan(wb1, wb2)
const results = compareWorkbooks(wb1, wb2, planToConfig(plan))

const input = (download: Partial<DownloadSettings> = {}): ReportInput => ({
  results,
  plan,
  firstName: 'diffy_test_file_1.xlsx',
  secondName: 'diffy_test_file_2.xlsx',
  match: DEFAULT_MATCH,
  colours: DEFAULT_COLOURS,
  download: { ...DEFAULT_DOWNLOAD, fileName: 'x', ...download },
  date: new Date(2026, 9, 13),
})

/** Builds the report, writes it to bytes and reads it back, like Excel would. */
async function roundTrip(i: ReportInput) {
  const buf = await buildReport(new ExcelJS.Workbook(), i).xlsx.writeBuffer()
  const back = new ExcelJS.Workbook()
  await back.xlsx.load(buf as ArrayBuffer)
  return back
}

/** Cell values of one row as text, starting at column A. */
const rowText = (ws: ExcelJS.Worksheet, r: number) =>
  Array.from((ws.getRow(r).values as unknown[]).slice(1), (v) => (v == null ? '' : String(v)))

describe('Excel report', () => {
  it('has a Summary, then one side-by-side tab per compared sheet', async () => {
    const wb = await roundTrip(input())
    const names = wb.worksheets.map((w) => w.name)
    expect(names).toEqual(['Summary', ...results.map((d) => d.name)])
    expect(wb.getWorksheet('Summary')!.getCell('B7').value).toBe('75 rows differ across 7 sheets')
  })

  it('puts both files next to each other with the same columns, split in the middle', async () => {
    const ws = (await roundTrip(input())).getWorksheet('Tickets')!
    const header = rowText(ws, 2)
    const mid = header.indexOf('')
    const left = header.slice(0, mid)
    const right = header.slice(mid + 1)
    expect(left[0]).toBe('🔑 Ticket ID')
    expect(right).toEqual(left)
    expect(ws.views[0]).toMatchObject({ state: 'split' })
    const signs = ws.getColumn(mid + 1).values.slice(3)
    expect(signs.filter((v) => v === '≠')).toHaveLength(4)
    expect(signs).toHaveLength(results.find((d) => d.name === 'Tickets')!.rows.length)
  })

  it('shows the old value on the left, the new one on the right, with a "Was" comment', async () => {
    const ws = (await roundTrip(input())).getWorksheet('Tickets')!
    const notes: string[] = []
    ws.eachRow((row) =>
      row.eachCell((c) => c.note && notes.push(typeof c.note === 'string' ? c.note : JSON.stringify(c.note))),
    )
    expect(notes).toHaveLength(4)
    expect(notes.join()).toContain('Was:')
  })

  it('greys out a column on the side that does not have it', async () => {
    const header = rowText((await roundTrip(input())).getWorksheet('Customers')!, 2)
    expect(header.filter((h) => h === 'Fax (not in this file)')).toHaveLength(1)
    expect(header.filter((h) => h === 'Fax')).toHaveLength(1)
  })

  it('can leave out unchanged rows and the Summary', async () => {
    const wb = await roundTrip(input({ includeUnchanged: false, summarySheet: false }))
    expect(wb.worksheets[0].name).toBe('Orders')
    expect(wb.getWorksheet('Holidays')!.rowCount).toBe(2)
  })

  it('writes dates with the same calendar day and time', async () => {
    const ws = (await roundTrip(input())).getWorksheet('Tickets')!
    const col = rowText(ws, 2).indexOf('Opened') + 1
    const d = ws.getRow(3).getCell(col).value as Date
    const src = results.find((x) => x.name === 'Tickets')!.rows[0].beforeRow!.values.Opened as Date
    expect([d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]).toEqual([
      src.getFullYear(),
      src.getMonth(),
      src.getDate(),
    ])
  })
})

describe('helpers', () => {
  it('keeps tab names valid and unique', () => {
    const name = tabNamer()
    expect(name('Summary')).toBe('Summary')
    expect(name('summary')).toBe('summary 2')
    expect(name('a/b:c')).toBe('a b c')
    expect(name('x'.repeat(40))).toHaveLength(31)
  })
  it('makes a dark text colour from a light fill', () => {
    expect(inkFor('#DCE9FF')).toMatch(/^FF[0-9A-F]{6}$/)
    const n = parseInt(inkFor('#DCE9FF').slice(2), 16)
    expect(n & 255).toBeGreaterThan((n >> 16) & 255) // still blue
    expect(inkFor('#EDEDF0').slice(2, 4)).toBe(inkFor('#EDEDF0').slice(4, 6)) // grey stays grey
  })
  it('cleans the file name', () => {
    expect(fileNameFor(' my: report ', 'xlsx')).toBe('my_ report.xlsx')
    expect(fileNameFor('', 'csv')).toBe('diffy_report.csv')
    expect(fileNameFor('a.xlsx', 'xlsx')).toBe('a.xlsx')
  })
  it('writes a CSV with one line per changed cell', () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""')
    const csv = buildCsv(results, false)
    const lines = csv.replace(/\r\n$/, '').split('\r\n')
    expect(lines[0]).toBe('﻿Sheet,Key,Status,Column,First file,Second file')
    const changedCells = results.reduce((a, d) => a + d.summary.changedCells, 0)
    const addRem = results.reduce((a, d) => a + d.summary.added + d.summary.removed, 0)
    expect(lines).toHaveLength(1 + changedCells + addRem)
  })
})
