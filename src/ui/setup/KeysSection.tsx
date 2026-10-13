import { useCallback, useState } from 'react'
import { roleOf, type ColumnRole, type Row, type SheetPlan } from '../../core'
import { useApp } from '../../state/store'
import { formatCell, plural } from '../format'
import { AlertIcon, CheckIcon, ChevronDownIcon, EyeOffIcon, KeyIcon, PlusIcon, XIcon } from '../icons'
import { ColumnMenu } from './ColumnMenu'

function KeyStatus({ p }: { p: SheetPlan }) {
  if (p.key.columns.length === 0)
    return (
      <span className="badge badge-warn" title="No column identifies each row, so rows are compared in order: row 1 with row 1, and so on.">
        <AlertIcon size={14} />
        None found · row by row
      </span>
    )
  if (p.key.confidence === 'mostlyUnique')
    return (
      <span className="badge badge-warn" title="Some key values appear more than once. Repeats are matched in the order they appear.">
        <AlertIcon size={14} />
        {plural(p.key.duplicates, 'repeat')}
      </span>
    )
  return (
    <span className="badge badge-ok" title="Every row has its own key value.">
      <CheckIcon size={14} />
      Unique
    </span>
  )
}

interface MenuState {
  sheet: number
  column: string
  anchor: DOMRect
}

/** One file's first rows, with clickable headers. */
function PreviewTable({
  which,
  headers,
  rows,
  p,
  onHeader,
}: {
  which: 1 | 2
  headers: string[]
  rows: Row[]
  p: SheetPlan
  onHeader: (column: string, el: HTMLElement) => void
}) {
  const shared = new Set(p.columns)
  return (
    <div className={`preview preview-${which}`}>
      <div className="preview-label">
        <span className={`num num-${which}`}>{which}</span>
        {which === 1 ? 'First file' : 'Second file'} · first {plural(rows.length, 'row')}
      </div>
      <div className="preview-scroll">
        <table>
          <thead>
            <tr>
              {headers.map((h) => {
                if (!shared.has(h))
                  return (
                    <th key={h} className="col-only" title={`Only in the ${which === 1 ? 'first' : 'second'} file, so it can't be compared`}>
                      <span className="th-static">{h}</span>
                    </th>
                  )
                const role = roleOf(h, p.key.columns, p.ignored)
                return (
                  <th key={h} className={`col-${role}`}>
                    <button
                      type="button"
                      className="th-btn"
                      aria-haspopup="menu"
                      aria-label={`${h}: ${role === 'key' ? 'key column' : role === 'ignore' ? 'ignored' : 'compared'}. Change`}
                      onClick={(e) => onHeader(h, e.currentTarget)}
                    >
                      {role === 'key' && <KeyIcon size={14} />}
                      {role === 'ignore' && <EyeOffIcon size={14} />}
                      <span className="th-name">{h}</span>
                      <ChevronDownIcon size={14} />
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="preview-empty">
                  No rows under the header.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.rowNumber}>
                {headers.map((h) => (
                  <td
                    key={h}
                    className={shared.has(h) ? `col-${roleOf(h, p.key.columns, p.ignored)}` : 'col-only'}
                  >
                    {formatCell(r.values[h])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Section 2: the key column(s) for each sheet, and which columns to ignore. */
export function KeysSection() {
  const { plan, tables, setColumnRole } = useApp()
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const [menu, setMenu] = useState<MenuState | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])

  const sheets = plan.map((p, i) => ({ p, i })).filter(({ p }) => p.included && p.first && p.second)

  const toggle = (i: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })

  return (
    <section className="card" aria-labelledby="keys-title">
      <header className="card-head">
        <h2 id="keys-title">Key columns</h2>
        <p>
          For each sheet, diffy picked a key column to match rows between the two files. Adjust anything that looks
          wrong. Open the preview and click any column to make it the key, compare it or ignore it.
        </p>
      </header>

      {sheets.length === 0 && <p className="card-empty">No sheets are ticked above, so there is nothing to set up.</p>}

      <ul className="key-list">
        {sheets.map(({ p, i }) => {
          const free = p.columns.filter((c) => !p.key.columns.includes(c))
          const id = `${p.first}|${p.second}`
          const isOpen = open.has(id)
          const t = tables[i]
          return (
            <li key={id} className="key-row">
              <div className="key-line">
                <span className="key-sheet" title={p.first === p.second ? p.first! : `${p.first} ↔ ${p.second}`}>
                  {p.first}
                </span>
                <span className="key-chips">
                  {p.key.columns.map((c) => (
                    <span key={c} className="chip">
                      <KeyIcon size={14} />
                      {c}
                      <button
                        type="button"
                        className="chip-x"
                        aria-label={`Remove ${c} from the key`}
                        onClick={() => setColumnRole(i, c, 'compare')}
                      >
                        <XIcon size={13} />
                      </button>
                    </span>
                  ))}
                  {free.length > 0 && (
                    <span className="chip-add">
                      <PlusIcon size={14} />
                      {p.key.columns.length ? 'Add column' : 'Choose column'}
                      <select
                        value=""
                        aria-label={`Add a key column for ${p.first}`}
                        onChange={(e) => e.target.value && setColumnRole(i, e.target.value, 'key')}
                      >
                        <option value="" disabled>
                          Pick a column
                        </option>
                        {free.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </span>
                  )}
                  {p.ignored.length > 0 && (
                    <span className="key-note">· {plural(p.ignored.length, 'column')} ignored</span>
                  )}
                  {p.columnsOnlyFirst.length + p.columnsOnlySecond.length > 0 && (
                    <span
                      className="key-note"
                      title={[
                        p.columnsOnlyFirst.length ? `Only in the first file: ${p.columnsOnlyFirst.join(', ')}` : '',
                        p.columnsOnlySecond.length ? `Only in the second file: ${p.columnsOnlySecond.join(', ')}` : '',
                      ]
                        .filter(Boolean)
                        .join('\n')}
                    >
                      · {plural(p.columnsOnlyFirst.length + p.columnsOnlySecond.length, 'column')} in one file only
                    </span>
                  )}
                </span>
                <span className="key-end">
                  <KeyStatus p={p} />
                  <button type="button" className="link-btn" aria-expanded={isOpen} onClick={() => toggle(id)}>
                    {isOpen ? 'Hide preview' : 'Preview'}
                    <span className={`chev${isOpen ? ' up' : ''}`}>
                      <ChevronDownIcon size={16} />
                    </span>
                  </button>
                </span>
              </div>

              {isOpen && t.first && t.second && (
                <div className="previews">
                  <PreviewTable
                    which={1}
                    headers={t.first.headers}
                    rows={p.previewFirst}
                    p={p}
                    onHeader={(column, el) => setMenu({ sheet: i, column, anchor: el.getBoundingClientRect() })}
                  />
                  <PreviewTable
                    which={2}
                    headers={t.second.headers}
                    rows={p.previewSecond}
                    p={p}
                    onHeader={(column, el) => setMenu({ sheet: i, column, anchor: el.getBoundingClientRect() })}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {menu && (
        <ColumnMenu
          anchor={menu.anchor}
          role={roleOf(menu.column, plan[menu.sheet].key.columns, plan[menu.sheet].ignored)}
          onPick={(role: ColumnRole) => setColumnRole(menu.sheet, menu.column, role)}
          onClose={closeMenu}
        />
      )}
    </section>
  )
}
