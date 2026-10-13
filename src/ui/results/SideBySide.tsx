import { useMemo, useRef } from 'react'
import type { RowDiff, RowStatus } from '../../core'
import { formatCell } from '../format'
import { EyeOffIcon, KeyIcon } from '../icons'
import { columnWidth, type Column } from './view'

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
  widths,
  rows,
  onScroll,
}: {
  which: 1 | 2
  title: string
  cols: Column[]
  widths: number[]
  rows: RowDiff[]
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
}) {
  const total = widths.reduce((a, w) => a + w, 0)
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
        <table className="sbs-table" style={{ width: total }}>
          <colgroup>
            {widths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {cols.map((c, i) => {
                const absent = c.kind === 'only' && c.only !== which
                return (
                  <th
                    key={`${c.kind}:${c.name}:${c.only ?? ''}`}
                    className={`th-${c.kind}${absent ? ' th-absent' : ''}${i === 0 ? ' sticky' : ''}`}
                    title={
                      c.kind === 'ignore'
                        ? 'Ignored: not compared'
                        : c.kind === 'only'
                          ? `Only in the ${c.only === 1 ? 'first' : 'second'} file, so not compared`
                          : undefined
                    }
                  >
                    <span className="th-in">
                      {c.kind === 'key' && c.name && <KeyIcon size={14} />}
                      {c.kind === 'ignore' && <EyeOffIcon size={14} />}
                      {c.name || 'Row'}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const row = which === 1 ? r.beforeRow : r.afterRow
              return (
                <tr key={`${r.key}#${i}`} className={`r-${r.status}${row ? '' : ' r-missing'}`}>
                  {cols.map((c, ci) => {
                    const absent = c.kind === 'only' && c.only !== which
                    const changed = r.status === 'modified' && r.changes.some((x) => x.column === c.name)
                    const text =
                      !row || absent ? '' : c.kind === 'key' && !c.name ? r.key : formatCell(row.values[c.name] ?? null)
                    return (
                      <td
                        key={`${c.kind}:${c.name}:${c.only ?? ''}`}
                        className={`td-${c.kind}${changed ? ' cell-changed' : ''}${absent ? ' td-absent' : ''}${ci === 0 ? ' sticky' : ''}`}
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
 * File 1 on the left, File 2 on the right, with the same columns in the same order.
 * Rows are lined up by key. Scrolling either side, up/down or left/right, moves the other
 * side to the same place, so a changed cell is always next to its partner.
 */
export function SideBySide({
  rows,
  cols,
  nameFirst,
  nameSecond,
}: {
  rows: RowDiff[]
  cols: Column[]
  nameFirst: string
  nameSecond: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)
  const widths = useMemo(() => cols.map((c) => columnWidth(c, rows)), [cols, rows])

  /** Copy the scroll position of the side being scrolled to the others. */
  const sync = (e: React.UIEvent<HTMLDivElement>) => {
    if (syncing.current || !root.current) return
    syncing.current = true
    const from = e.currentTarget
    for (const el of root.current.querySelectorAll<HTMLDivElement>('.sbs-pane')) {
      if (el === from) continue
      if (el.scrollTop !== from.scrollTop) el.scrollTop = from.scrollTop
      if (!el.classList.contains('sbs-pane-mid') && el.scrollLeft !== from.scrollLeft) el.scrollLeft = from.scrollLeft
    }
    requestAnimationFrame(() => (syncing.current = false))
  }

  return (
    <div className="sbs" ref={root}>
      <Pane which={1} title={nameFirst} cols={cols} widths={widths} rows={rows} onScroll={sync} />
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
      <Pane which={2} title={nameSecond} cols={cols} widths={widths} rows={rows} onScroll={sync} />
    </div>
  )
}
