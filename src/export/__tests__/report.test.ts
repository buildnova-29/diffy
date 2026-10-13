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

describe('Excel report', () => {
  it('has a Summary, then a list tab and a side-by-side tab for every compared sheet', async () => {
    const wb = await roundTrip(input())
    const names = wb.worksheets.map((w) => w.name)
    expect(names[0]).toBe('Summary')
    expect(names).toContain('Employees')
    expect(names).toContain('Employees side by side')
    expect(names).toHaveLength(1 + results.length * 2)
    expect(wb.getWorksheet('Summary')!.getCell('B7').value).toBe('75 rows differ across 7 sheets')
  })

  it('marks a changed cell, keeps the old value in a comment, and lists every row', async () => {
    const ws = (await roundTrip(input())).getWorksheet('Tickets')!
    const header = (ws.getRow(1).values as unknown[]).slice(1)
    expect(header[0]).toBe('Status')
    expect(header[1]).toBe('🔑 Ticket ID')
    const statusCol = ws.getColumn(1).values.slice(2)
    expect(statusCol.filter((v) => v === 'Changed')).toHaveLength(4)
    expect(statusCol).toHaveLength(results.find((d) => d.name === 'Tickets')!.rows.length)
    const noted: string[] = []
    ws.eachRow((row) =>
      row.eachCell((c) => c.note && noted.push(String(typeof c.note === 'string' ? c.note : JSON.stringify(c.note)))),
    )
    expect(noted.length).toBe(4)
    expect(noted.join()).toContain('Was:')
  })

  it('can leave out unchanged rows and the Summary', async () => {
    const wb = await roundTrip(input({ includeUnchanged: false, summarySheet: false }))
    expect(wb.worksheets[0].name).toBe('Orders')
    const status = wb.getWorksheet('Holidays')!.getColumn(1).values.slice(2)
    expect(status).toHaveLength(0)
  })

  it('can put old values in an extra column', async () => {
    const ws = (await roundTrip(input({ oldValues: 'column' }))).getWorksheet('Customers')!
    const header = (ws.getRow(1).values as unknown[]).slice(1).map(String)
    expect(header.some((h) => h.endsWith('(was)'))).toBe(true)
  })

  it('writes dates with the same calendar day and time', async () => {
    const ws = (await roundTrip(input())).getWorksheet('Tickets')!
    const col = (ws.getRow(1).values as unknown[]).indexOf('Opened')
    const d = ws.getRow(2).getCell(col).value as Date
    const src = results.find((x) => x.name === 'Tickets')!.rows[0].afterRow!.values.Opened as Date
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
