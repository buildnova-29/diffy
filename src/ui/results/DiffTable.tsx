import { useMemo, useState } from 'react'
import type { CellValue, RowDiff, RowStatus, SheetDiff } from '../../core'
import { formatCell, plural } from '../format'
import { AlertIcon, EyeOffIcon, KeyIcon, SearchIcon } from '../icons'
import { columnsOf, counts, valueOf, visibleRows, type Filter } from './view'

const PAGE = 200

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'modified', label: 'Changed' },
  { value: 'added', label: 'Added' },
  { value: 'removed', label: 'Removed' },
  { value: 'unchanged', label: 'Unchanged' },
]

/** Status shown as a symbol too, so it never depends on colour alone. */
const MARK: Record<RowStatus, { sign: string; label: string }> = {
  modified: { sign: '○', label: 'Changed' },
  added: { sign: '+', label: 'Added: only in the second file' },
  removed: { sign: '−', label: 'Removed: only in the first file' },
  unchanged: { sign: '=', label: 'Unchanged' },
}

function Old({ v }: { v: CellValue }) {
  const s = formatCell(v)
  return <s className={`old${s ? '' : ' blank'}`}>{s || 'blank'}</s>
}
function New({ v }: { v: CellValue }) {
  const s = formatCell(v)
  return <b className={`new${s ? '' : ' blank'}`}>{s || 'blank'}</b>
}

function Notes({ d }: { d: SheetDiff }) {
  const notes: string[] = []
  if (d.columnsOnlyInBefore.length)
    notes.push(`Only in the first file, so not compared: ${d.columnsOnlyInBefore.join(', ')}.`)
  if (d.columnsOnlyInAfter.length)
    notes.push(`Only in the second file, so not compared: ${d.columnsOnlyInAfter.join(', ')}.`)
  for (const dup of d.duplicates.slice(0, 3))
    notes.push(
      `Key ${dup.key} appears ${dup.rowNumbers.length} times in the ${dup.side === 'before' ? 'first' : 'second'} file (rows ${dup.rowNumbers.join(', ')}). Repeats were matched in order.`,
    )
  if (d.duplicates.length > 3) notes.push(`${plural(d.duplicates.length - 3, 'more key')} repeat as well.`)
  if (!notes.length) return null
  return (
    <ul className="sheet-notes">
      {notes.map((n) => (
        <li key={n}>
          <AlertIcon size={15} />
          {n}
        </li>
      ))}
    </ul>
  )
}

/** One sheet's differences: filters, search and the table. */
export function DiffTable({ diff, ignored }: { diff: SheetDiff; ignored: string[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const cols = useMemo(() => columnsOf(diff, ignored), [diff, ignored])
  const n = useMemo(() => counts(diff.rows), [diff])
  const rows = useMemo(() => visibleRows(diff.rows, filter, search), [diff, filter, search])
  const shown = rows.slice(0, limit)

  const cell = (r: RowDiff, name: string, kind: string) => {
    if (kind === 'key' && !name) return r.key
    const change = r.status === 'modified' ? r.changes.find((c) => c.column === name) : undefined
    if (change)
      return (
        <span className="change">
          <Old v={change.before} />
          <span className="arrow" aria-label="changed to">
            ›
          </span>
          <New v={change.after} />
        </span>
      )
    return formatCell(valueOf(r, name))
  }

  return (
    <>
      <div className="tools">
        <div className="filters" role="radiogroup" aria-label="Show rows">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={filter === f.value}
              className={`filter${filter === f.value ? ' on' : ''}`}
              onClick={() => {
                setFilter(f.value)
                setLimit(PAGE)
              }}
            >
              {f.value !== 'all' && <span className={`dot dot-${f.value}`} />}
              {f.label}
              <span className="filter-n">{n[f.value].toLocaleString()}</span>
            </button>
          ))}
        </div>
        <label className="search">
          <SearchIcon size={17} />
          <input
            type="search"
            placeholder="Search rows"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setLimit(PAGE)
            }}
          />
        </label>
      </div>

      <Notes d={diff} />

      <div className="diff-scroll">
        <table className="diff">
          <thead>
            <tr>
              <th className="mark-col">
                <span className="visually-hidden">Status</span>
              </th>
              {cols.map((c) => (
                <th key={`${c.kind}:${c.name}`} className={`th-${c.kind}`} title={c.kind === 'ignore' ? 'Ignored: not compared' : undefined}>
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
            {shown.length === 0 && (
              <tr>
                <td className="diff-empty" colSpan={cols.length + 1}>
                  {search ? `No rows match "${search}".` : 'No rows here.'}
                </td>
              </tr>
            )}
            {shown.map((r, i) => (
              <tr key={`${r.key}#${i}`} className={`r-${r.status}`}>
                <td className="mark-col">
                  <span className={`mark mark-${r.status}`} title={MARK[r.status].label} aria-label={MARK[r.status].label}>
                    {MARK[r.status].sign}
                  </span>
                </td>
                {cols.map((c) => {
                  const changed = r.status === 'modified' && r.changes.some((x) => x.column === c.name)
                  return (
                    <td key={`${c.kind}:${c.name}`} className={`td-${c.kind}${changed ? ' cell-changed' : ''}`}>
                      {cell(r, c.name, c.kind)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-foot">
        <span className="legend-row">
          <span className="key-box key-changed" /> Changed cell: old › new
          <span className="key-box key-added" /> Only in second file
          <span className="key-box key-removed" /> Only in first file
        </span>
        <span className="showing">
          Showing {shown.length.toLocaleString()} of {plural(rows.length, 'row')}
          {shown.length < rows.length && (
            <button type="button" className="link-btn" onClick={() => setLimit((l) => l + PAGE)}>
              Show more
            </button>
          )}
        </span>
      </div>
    </>
  )
}
