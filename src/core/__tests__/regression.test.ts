/// <reference types="node" />
/**
 * Regression check against the two sample files in /test-data.
 * Every number below was planted on purpose when the files were made.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compareWorkbooks } from '../compare'
import { parseConfig } from '../config'
import { readWorkbook } from '../reader'

const load = (n: number) => readWorkbook(readFileSync(resolve(__dirname, `../../../test-data/diffy_test_file_${n}.xlsx`)))
const file1 = load(1)
const file2 = load(2)

const config = parseConfig({
  sheets: [
    { beforeSheet: 'Employees', keyColumns: ['Employee ID'] },
    { beforeSheet: 'Inventory', keyColumns: ['Warehouse', 'SKU'] },
    { beforeSheet: 'Products', keyColumns: ['Product code'] },
    { beforeSheet: 'Customers', keyColumns: ['Customer ID'] },
    { beforeSheet: 'Tickets', keyColumns: ['Ticket ID'], headerRow: 3 },
    { beforeSheet: 'Holidays', keyColumns: ['Code'] },
    { beforeSheet: 'Discounts', afterSheet: 'Discounts_Apr', keyColumns: ['Discount code'] },
  ],
})
const results = Object.fromEntries(compareWorkbooks(file1, file2, config).map((d) => [d.name, d]))

describe('regression files', () => {
  it.each([
    ['Employees', 8, 9, 6, 5],
    ['Inventory', 7, 13, 2, 3],
    ['Products', 10, 10, 0, 0],
    ['Customers', 4, 4, 0, 0],
    ['Tickets', 4, 4, 1, 1],
    ['Holidays', 0, 0, 0, 0],
    ['Discounts', 5, 5, 3, 2],
  ])('%s: %i changed rows, %i changed cells, %i added, %i removed', (sheet, modified, cells, added, removed) => {
    const s = results[sheet].summary
    expect({ modified: s.modified, cells: s.changedCells, added: s.added, removed: s.removed }).toEqual({ modified, cells, added, removed })
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
})
