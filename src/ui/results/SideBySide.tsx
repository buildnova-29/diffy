import { useRef } from 'react'
import type { RowDiff, RowStatus } from '../../core'
import { formatCell } from '../format'
import { EyeOffIcon, KeyIcon } from '../icons'
import type { Column } from './view'

const SIGN: Record<RowStatus, { sign: string; label: string }> = {
  modified: { sign: '≠', label: 'Changed' },
  added: { sign: '+', label: 'Added: only in the second file' },
  removed: { sign: '−', label: 'Removed: only in the first file' },
  unchanged: { sign: '=', label: 'Unchanged' },
}

function Pane({
  which,
  title,
  cols,
  rows,
  onScroll,
}: {
  which: 1 | 2
  title: string
  cols: Column[]
  rows: RowDiff[]
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
}) {
  return (
    <div className={`sbs-side sbs-side-${which}`}>
      <div className={`sbs-name sbs-name-${which}`}>
        <span className={`num num-${which}`}>{which}</span>
        <span className="sbs-file">{title}</span>
      </div>
      <div
        className="sbs-pane"

        onScroll={onScroll}
        tabIndex={0}
        aria-label={`${which === 1 ? 'First' : 'Second'} file`}
      >
        <table className="sbs-table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={`${c.kind}:${c.name}`} className={`th-${c.kind}`}>
                  <span className="th-in">
                    {c.kind === 'key' && c.name && <KeyIcon size={14} />}
                    {c.kind === 'ignore' && <EyeOffIcon size={14} />}
                    {c.name || 'Row'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const row = which === 1 ? r.beforeRow : r.afterRow
              const missing = !row
              return (
                <tr key={`${r.key}#${i}`} className={`r-${r.status}${missing ? ' r-missing' : ''}`}>
                  {cols.map((c) => {
                    const changed = r.status === 'modified' && r.changes.some((x) => x.column === c.name)
                    const text = missing
                      ? ''
                      : c.kind === 'key' && !c.name
                        ? r.key
                        : formatCell(row.values[c.name] ?? null)
                    return (
                      <td
                        key={`${c.kind}:${c.name}`}
                        className={`td-${c.kind}${changed ? ' cell-changed' : ''}`}
                        title={text || undefined}
                      >
                        {text}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * File 1 on the left, File 2 on the right. Rows are lined up by key.
 * Each side scrolls left/right on its own; scrolling up/down moves both together.
 */
export function SideBySide({
  rows,
  colsFirst,
  colsSecond,
  nameFirst,
  nameSecond,
}: {
  rows: RowDiff[]
  colsFirst: Column[]
  colsSecond: Column[]
  nameFirst: string
  nameSecond: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)

  /** When one side scrolls up or down, move the other two to the same place. */
  const sync = (e: React.UIEvent<HTMLDivElement>) => {
    if (syncing.current || !root.current) return
    syncing.current = true
    const from = e.currentTarget
    for (const el of root.current.querySelectorAll<HTMLDivElement>('.sbs-pane'))
      if (el !== from && el.scrollTop !== from.scrollTop) el.scrollTop = from.scrollTop
    requestAnimationFrame(() => (syncing.current = false))
  }

  return (
    <div className="sbs" ref={root}>
      <Pane which={1} title={nameFirst} cols={colsFirst} rows={rows} onScroll={sync} />
      <div className="sbs-mid">
        <div className="sbs-name sbs-name-mid" aria-hidden="true" />
        <div className="sbs-pane sbs-pane-mid" onScroll={sync}>
          <table className="sbs-table">
            <thead>
              <tr>
                <th>
                  <span className="visually-hidden">Status</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.key}#${i}`} className={`r-${r.status}`}>
                  <td
                    className={`sbs-sign sign-${r.status}`}
                    title={SIGN[r.status].label}
                    aria-label={SIGN[r.status].label}
                  >
                    {SIGN[r.status].sign}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pane which={2} title={nameSecond} cols={colsSecond} rows={rows} onScroll={sync} />
    </div>
  )
}
