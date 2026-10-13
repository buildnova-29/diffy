import { useEffect, useRef, useState } from 'react'
import { roleOf, type SheetPlan } from '../../core'
import { useApp } from '../../state/store'
import { plural } from '../format'
import { AlertIcon, ChevronDownIcon, ChevronRightIcon, SparkleIcon, XIcon } from '../icons'

const SEP = '\u0001'
const keyLabel = (cols: string[]) => (cols.length ? cols.join(' + ') : 'Row by row (no key)')

/** The violet note at the top: what diffy worked out, in one or two sentences. */
export function Banner() {
  const plan = useApp((s) => s.plan)
  const pairs = plan.filter((p) => p.first && p.second && p.included)
  const keyed = pairs.filter((p) => p.key.columns.length)
  const none = pairs.filter((p) => !p.key.columns.length)
  const renamed = pairs.filter((p) => p.status === 'check')
  const repeats = pairs.filter((p) => p.key.confidence === 'mostlyUnique')

  const names = (list: SheetPlan[]) =>
    list.map((p, i) => (
      <span key={p.first}>
        {i > 0 && (i === list.length - 1 ? ' and ' : ', ')}
        <b>{p.first}</b>
      </span>
    ))

  return (
    <div className="banner" role="note">
      <SparkleIcon size={18} />
      <p>
        <b>diffy checked your files.</b>{' '}
        {keyed.length > 0 && (
          <>
            {plural(keyed.length, 'sheet')} {keyed.length === 1 ? 'has' : 'have'} a column that can match rows by
            key.{' '}
          </>
        )}
        {none.length > 0 && (
          <>
            {names(none)} {none.length === 1 ? 'has' : 'have'} none, so {none.length === 1 ? 'it' : 'they'} will be
            compared row by row.{' '}
          </>
        )}
        {renamed.map((p) => (
          <span key={p.first}>
            <b>{p.first}</b> is paired with <b>{p.second}</b>.{' '}
          </span>
        ))}
        {repeats.length > 0 && <>Some IDs repeat in {names(repeats)}; repeats are matched in order. </>}
        Change any of this below.
      </p>
    </div>
  )
}

/** Opens under the › arrow: which sheet to compare with, a key of several columns, columns to skip. */
function Details({ p, index }: { p: SheetPlan; index: number }) {
  const { second, pairWith, setColumnRole } = useApp()
  const free = p.columns.filter((c) => !p.key.columns.includes(c))
  return (
    <div className="details">
      <div className="d-row">
        <span className="d-label">Compare with</span>
        <span className="d-control">
          <span className="select-wrap">
            <select
              value={p.second ?? ''}
              onChange={(e) => pairWith(index, e.target.value || null)}
              aria-label="Sheet in the second file"
            >
              {second?.sheets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={15} />
          </span>
          <span className="d-hint">in the second file</span>
        </span>
      </div>
      <div className="d-row">
        <span className="d-label">Match rows by</span>
        <span className="d-control">
          {p.key.columns.length === 0 && <span className="d-hint">Row order</span>}
          {p.key.columns.map((c) => (
            <span key={c} className="chip">
              {c}
              <button
                type="button"
                className="chip-x"
                aria-label={`Stop matching by ${c}`}
                onClick={() => setColumnRole(index, c, 'compare')}
              >
                <XIcon size={13} />
              </button>
            </span>
          ))}
          {free.length > 0 && (
            <span className="select-wrap select-add">
              <select
                value=""
                aria-label="Add a column to match by"
                onChange={(e) => e.target.value && setColumnRole(index, e.target.value, 'key')}
              >
                <option value="" disabled>
                  + Add a column
                </option>
                {free.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDownIcon size={15} />
            </span>
          )}
        </span>
      </div>
      <div className="d-row d-row-top">
        <span className="d-label">Columns to compare</span>
        <span className="d-control">
          {free.map((c) => {
            const on = roleOf(c, p.key.columns, p.ignored) === 'compare'
            return (
              <button
                key={c}
                type="button"
                className={`col-toggle${on ? ' on' : ''}`}
                aria-pressed={on}
                title={on ? 'Click to skip this column' : 'Click to compare this column'}
                onClick={() => setColumnRole(index, c, on ? 'ignore' : 'compare')}
              >
                {c}
              </button>
            )
          })}
          {p.columnsOnlyFirst.length + p.columnsOnlySecond.length > 0 && (
            <span className="d-hint d-note">
              In one file only, so not compared: {[...p.columnsOnlyFirst, ...p.columnsOnlySecond].join(', ')}
            </span>
          )}
        </span>
      </div>
    </div>
  )
}

/** The list of sheets, one row each, with the "Match rows by" choice on the right. */
export function SheetTable() {
  const { plan, toggleSheet, setKey, setAllSheets } = useApp()
  const [open, setOpen] = useState<string | null>(null)
  const all = useRef<HTMLInputElement>(null)

  const pairs = plan.map((p, i) => ({ p, i })).filter(({ p }) => p.first && p.second)
  const lonely = plan.filter((p) => !(p.first && p.second))
  const ticked = pairs.filter(({ p }) => p.included).length

  useEffect(() => {
    if (all.current) all.current.indeterminate = ticked > 0 && ticked < pairs.length
  }, [ticked, pairs.length])

  return (
    <section className="sheet-table" aria-label="Sheets to compare">
      <div className="st-head">
        <input
          ref={all}
          type="checkbox"
          checked={ticked === pairs.length && pairs.length > 0}
          onChange={() => setAllSheets(ticked < pairs.length)}
          aria-label="Compare all sheets"
        />
        <span className="st-cap">{plural(pairs.length, 'sheet')}</span>
        <span className="st-cap st-cap-right">Match rows by</span>
        <span className="st-arrow-space" />
      </div>

      <ul className="st-rows">
        {pairs.map(({ p, i }) => {
          const id = `${p.first}|${p.second}`
          const isOpen = open === id && p.included
          const value = p.key.columns.join(SEP)
          const multi = p.key.columns.length > 1
          return (
            <li key={id} className={`st-row${p.included ? '' : ' is-off'}${isOpen ? ' is-open' : ''}`}>
              <div className="st-main">
                <input
                  type="checkbox"
                  checked={p.included}
                  onChange={() => toggleSheet(i)}
                  aria-label={`Compare ${p.first}`}
                />
                <span className="st-name">
                  {p.first}
                  {p.first !== p.second && <span className="st-other">↔ {p.second}</span>}
                  {p.included && p.key.confidence === 'mostlyUnique' && (
                    <span
                      className="st-warn"
                      title={`${plural(p.key.duplicates, 'ID')} appear more than once; repeats are matched in order.`}
                    >
                      <AlertIcon size={14} />
                      {plural(p.key.duplicates, 'repeat')}
                    </span>
                  )}
                  {p.included && p.ignored.length > 0 && (
                    <span className="st-other">· {plural(p.ignored.length, 'column')} skipped</span>
                  )}
                </span>
                <span className="select-wrap st-key">
                  <select
                    value={value}
                    disabled={!p.included}
                    onChange={(e) => setKey(i, e.target.value ? e.target.value.split(SEP) : [])}
                    aria-label={`Match rows of ${p.first} by`}
                  >
                    {multi && <option value={value}>{keyLabel(p.key.columns)}</option>}
                    <option value="">{keyLabel([])}</option>
                    {p.columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon size={15} />
                </span>
                <button
                  type="button"
                  className={`st-arrow${isOpen ? ' up' : ''}`}
                  disabled={!p.included}
                  aria-expanded={isOpen}
                  aria-label={`More for ${p.first}`}
                  title="More choices"
                  onClick={() => setOpen(isOpen ? null : id)}
                >
                  <ChevronRightIcon size={17} />
                </button>
              </div>
              {isOpen && <Details p={p} index={i} />}
            </li>
          )
        })}
      </ul>

      {lonely.length > 0 && (
        <p className="st-foot">
          Only in one file, so not compared: <b>{lonely.map((p) => p.first ?? p.second).join(', ')}</b>
        </p>
      )}
    </section>
  )
}
