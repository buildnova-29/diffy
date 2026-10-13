/// <reference types="node" />
/**
 * Regression check against the two sample files in /test-data.
 * diffy gets no hints: it must find header rows, pair sheets and pick keys
 * by itself. Every number below was planted on purpose when the files were made.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compareWorkbooks } from '../compare'
import { buildPlan, planToConfig } from '../plan'
import { readWorkbook } from '../reader'

const load = (n: number) => readWorkbook(readFileSync(resolve(__dirname, `../../../test-data/diffy_test_file_${n}.xlsx`)))
const file1 = load(1)
const file2 = load(2)

const plan = buildPlan(file1, file2)
const byName = (name: string) => plan.find((p) => p.first === name || p.second === name)!
const results = Object.fromEntries(compareWorkbooks(file1, file2, planToConfig(plan)).map((d) => [d.name, d]))

describe('plan: what diffy works out by itself', () => {
  it('pairs sheets by name, flags similar names, and leaves one-file sheets out', () => {
    expect(plan.map((p) => [p.first, p.second, p.status, p.included])).toEqual([
      ['Orders', 'Orders', 'matched', true],
      ['Employees', 'Employees', 'matched', true],
      ['Inventory', 'Inventory', 'matched', true],
      ['Products', 'Products', 'matched', true],
      ['Customers', 'Customers', 'matched', true],
      ['Tickets', 'Tickets', 'matched', true],
      ['Holidays', 'Holidays', 'matched', true],
      ['Discounts', 'Discounts_Apr', 'check', true],
      ['Archive_2024', null, 'onlyFirst', false],
      [null, 'Q2_Forecast', 'onlySecond', false],
    ])
  })

  it.each([
    ['Orders', [], 'none'],
    ['Employees', ['Employee ID'], 'unique'],
    ['Inventory', ['Warehouse', 'SKU'], 'unique'],
    ['Products', ['Product code'], 'unique'],
    ['Customers', ['Customer ID'], 'unique'],
    ['Tickets', ['Ticket ID'], 'mostlyUnique'],
    ['Holidays', ['Code'], 'unique'],
    ['Discounts', ['Discount code'], 'unique'],
  ])('%s: key %j (%s)', (sheet, columns, confidence) => {
    expect(byName(sheet).key).toMatchObject({ columns, confidence })
  })

  it('finds the header row under the title rows', () => {
    expect([byName('Tickets').headerRowFirst, byName('Tickets').headerRowSecond]).toEqual([3, 3])
    expect(byName('Employees').headerRowFirst).toBe(1)
  })
})

describe('results', () => {
  it.each([
    // sheet, changed rows, changed cells (null = not checked), added, removed
    ['Orders', 12, null, 2, 0],
    ['Employees', 8, 9, 6, 5],
    ['Inventory', 7, 13, 2, 3],
    ['Products', 10, 10, 0, 0],
    ['Customers', 4, 4, 0, 0],
    ['Tickets', 4, 4, 1, 1],
    ['Holidays', 0, 0, 0, 0],
    ['Discounts', 5, 5, 3, 2],
  ])('%s: %i changed rows, %s changed cells, %i added, %i removed', (sheet, modified, cells, added, removed) => {
    const s = results[sheet as string].summary
    expect({ modified: s.modified, added: s.added, removed: s.removed }).toEqual({ modified, added, removed })
    if (cells !== null) expect(s.changedCells).toBe(cells)
  })

  it('treats case, spaces, blanks and numbers-as-text as equal', () => {
    const changedKeys = results.Products.rows.filter((r) => r.status === 'modified').map((r) => r.key)
    for (const k of ['P0001', 'P0002', 'P0003', 'P0004', 'P0005']) expect(changedKeys).not.toContain(k)
  })

  it('reports column differences and ignores column order', () => {
    expect(results.Customers.columnsOnlyInBefore).toEqual(['Segment', 'Fax'])
    expect(results.Customers.columnsOnlyInAfter).toEqual(['Customer segment', 'Account manager'])
  })

  it('reports the duplicate ticket key', () => {
    expect(results.Tickets.duplicates.map((d) => d.key)).toContain('T-7050')
  })

  it('compares Orders by position: rows 98-100 changed, 101-102 added', () => {
    const changed = results.Orders.rows.filter((r) => r.status === 'modified').map((r) => r.key)
    expect(changed).toEqual(expect.arrayContaining(['Row 98', 'Row 99', 'Row 100']))
    expect(results.Orders.rows.filter((r) => r.status === 'added').map((r) => r.key)).toEqual(['Row 101', 'Row 102'])
  })
})
