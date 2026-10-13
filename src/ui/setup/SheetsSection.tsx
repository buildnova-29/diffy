import type { SheetPlan } from '../../core'
import { useApp } from '../../state/store'
import { AlertIcon, CheckIcon, ChevronDownIcon, MinusIcon, PairIcon } from '../icons'

/** What the badge on the right of a sheet row says. */
function Status({ p }: { p: SheetPlan }) {
  if (!p.first || !p.second)
    return (
      <span className="badge badge-muted">
        <MinusIcon size={14} />
        Not compared
      </span>
    )
  if (!p.included)
    return (
      <span className="badge badge-muted">
        <MinusIcon size={14} />
        Skipped
      </span>
    )
  if (p.status === 'check')
    return (
      <span className="badge badge-warn" title="The names are similar but not the same. Check the pairing.">
        <AlertIcon size={14} />
        Please check
      </span>
    )
  return (
    <span className="badge badge-ok">
      <CheckIcon size={14} />
      Matched
    </span>
  )
}

/** Section 1: which sheets are compared, and with which. */
export function SheetsSection() {
  const { plan, second, pairedByHand, toggleSheet, pairWith } = useApp()
  const secondSheets = second?.sheets ?? []

  return (
    <section className="card" aria-labelledby="sheets-title">
      <header className="card-head">
        <h2 id="sheets-title">Sheets</h2>
        <p>Every sheet is included and paired by name. Untick a sheet to leave it out.</p>
      </header>
      <ul className="sheet-list">
        {plan.map((p, i) => {
          const both = Boolean(p.first && p.second)
          const off = !both || !p.included
          // A pair diffy guessed, or a File 1 sheet with no partner, can be (re)paired by hand.
          const choices = secondSheets
          const canChoose = Boolean(p.first) && (p.status === 'check' || !p.second || pairedByHand.includes(p.first!)) && choices.length > 0
          const label = `${p.first ?? p.second}`
          return (
            <li key={`${p.first}|${p.second}`} className={`sheet-row${off ? ' is-off' : ''}`}>
              <span className="sheet-check">
                {both && (
                  <input
                    type="checkbox"
                    checked={p.included}
                    onChange={() => toggleSheet(i)}
                    aria-label={`Compare ${label}`}
                  />
                )}
              </span>
              <span className="sheet-pair">
                {p.first ? (
                  <span className="pill pill-1">{p.first}</span>
                ) : (
                  <span className="pill pill-empty">not in first file</span>
                )}
                <span className="pair-icon" aria-hidden="true">
                  <PairIcon size={18} />
                </span>
                {canChoose ? (
                  <span className={`pill pill-2 pill-select${p.second ? '' : ' pill-empty'}`}>
                    <select
                      value={p.second ?? ''}
                      onChange={(e) => pairWith(i, e.target.value || null)}
                      aria-label={`Sheet in the second file to compare with ${p.first}`}
                    >
                      <option value="">not in second file</option>
                      {choices.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon size={15} />
                  </span>
                ) : p.second ? (
                  <span className="pill pill-2">{p.second}</span>
                ) : (
                  <span className="pill pill-empty">not in second file</span>
                )}
              </span>
              <Status p={p} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
