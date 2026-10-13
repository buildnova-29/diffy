/**
 * Makes the report file in the browser and hands it to the user as a download.
 * ExcelJS is large, so it is only loaded when someone actually clicks Download.
 */
import { buildCsv } from './csv'
import type { ReportInput } from './report'

function save(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Cleans a typed file name and makes sure it ends with the right extension. */
export function fileNameFor(name: string, format: 'xlsx' | 'csv'): string {
  const base =
    name
      .trim()
      .replace(/\.(xlsx|csv)$/i, '')
      .replace(/[<>:"/\\|?*]+/g, '_') || 'diffy_report'
  return `${base}.${format}`
}

export async function downloadReport(input: ReportInput): Promise<void> {
  const { format, fileName } = input.download
  const name = fileNameFor(fileName, format)
  if (format === 'csv') {
    save(new Blob([buildCsv(input.results, input.download.includeUnchanged)], { type: 'text/csv;charset=utf-8' }), name)
    return
  }
  const [{ default: ExcelJS }, { buildReport }] = await Promise.all([import('exceljs'), import('./report')])
  const wb = buildReport(new ExcelJS.Workbook(), input)
  const buffer = await wb.xlsx.writeBuffer()
  save(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name)
}
