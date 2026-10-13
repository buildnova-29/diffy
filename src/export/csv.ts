/**
 * The CSV version of the report: one plain-text table, one line per difference.
 * Columns: Sheet, Key, Status, Column, First file, Second file.
 */
import type { SheetDiff } from '../core'
import { formatCell } from '../ui/format'

const STATUS = { modified: 'Changed', added: 'Added', removed: 'Removed', unchanged: 'Unchanged' } as const

/** Quotes a value when it holds a comma, quote or line break (standard CSV rules). */
export function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function buildCsv(results: SheetDiff[], includeUnchanged: boolean): string {
  const lines: string[][] = [['Sheet', 'Key', 'Status', 'Column', 'First file', 'Second file']]
  for (const d of results) {
    for (const r of d.rows) {
      if (r.status === 'modified') {
        for (const c of r.changes)
          lines.push([d.name, r.key, STATUS.modified, c.column, formatCell(c.before), formatCell(c.after)])
      } else if (r.status !== 'unchanged' || includeUnchanged) {
        lines.push([d.name, r.key, STATUS[r.status], '', '', ''])
      }
    }
  }
  // The byte-order mark makes Excel open the file as UTF-8, so accents and symbols survive.
  return '﻿' + lines.map((l) => l.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
