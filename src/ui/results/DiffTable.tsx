import { useMemo, useState } from 'react'
import type { SheetDiff } from '../../core'
import { plural } from '../format'
import { AlertIcon, SearchIcon } from '../icons'
import { SideBySide } from './SideBySide'
import { counts, sideColumns, visibleRows, type Filter } from './view'

const PAGE = 200

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'modified', label: 'Changed' },
  { value: 'added', label: 'Added' },
  { value: 'removed', label: 'Removed' },
  { value: 'unchanged', label: 'Unchanged' },
]

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

/** One sheet's differences: filters, search, and the two files side by side. */
export function DiffTable({ diff, ignored, names }: { diff: SheetDiff; ignored: string[]; names: [string, string] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const cols = useMemo(() => sideColumns(diff, ignored), [diff, ignored])
  const n = useMemo(() => counts(diff.rows), [diff])
  const rows = useMemo(() => visibleRows(diff.rows, filter, search), [diff, filter, search])
  const shown = rows.slice(0, limit)

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
        <div className="tools-right">
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
      </div>

      <Notes d={diff} />

      {shown.length === 0 ? (
        <p className="sbs-empty">{search ? `No rows match "${search}".` : 'No rows here.'}</p>
      ) : (
        <SideBySide rows={shown} cols={cols} nameFirst={names[0]} nameSecond={names[1]} />
      )}

      <div className="table-foot">
        <span className="legend-row">
          <span className="key-box key-changed" /> Changed cell
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
