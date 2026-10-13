import { useState } from 'react'
import { downloadReport } from '../../export/download'
import { useApp } from '../../state/store'
import { isDefaultColours } from '../../state/settings'
import { plural } from '../format'
import { ArrowLeftIcon, DownloadIcon, InfoIcon } from '../icons'
import { DiffTable } from './DiffTable'
import { differing } from './view'
import './results.css'

/** Screen 3: what changed, sheet by sheet. */
export function ResultsScreen() {
  const { results, plan, first, second, colours, match, download, goTo, startOver } = useApp()
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const onDownload = async () => {
    if (!results) return
    setSaving(true)
    setSaveError(null)
    try {
      await downloadReport({
        results,
        plan,
        firstName: first?.name ?? 'First file',
        secondName: second?.name ?? 'Second file',
        match,
        colours,
        download,
      })
    } catch (e) {
      setSaveError(`The report could not be made. ${e instanceof Error ? e.message : ''}`.trim())
    } finally {
      setSaving(false)
    }
  }
  if (!results) return null

  const total = results.reduce(
    (t, d) => ({
      modified: t.modified + d.summary.modified,
      added: t.added + d.summary.added,
      removed: t.removed + d.summary.removed,
      unchanged: t.unchanged + d.summary.unchanged,
    }),
    { modified: 0, added: 0, removed: 0, unchanged: 0 },
  )
  const current = results[Math.min(tab, results.length - 1)]
  const ignored = plan.find((p) => p.first === current?.name)?.ignored ?? []

  const notCompared = plan
    .filter((p) => !(p.included && p.first && p.second))
    .map((p) => ({
      name: (p.first ?? p.second)!,
      why: !p.second ? 'only in the first file' : !p.first ? 'only in the second file' : 'skipped',
    }))

  // The chosen colours. The defaults keep the built-in light and dark shades.
  const style = isDefaultColours(colours)
    ? undefined
    : ({
        '--hl-changed': colours.changed,
        '--hl-added': colours.added,
        '--hl-removed': colours.removed,
      } as React.CSSProperties)

  return (
    <main className={`page page-results${style ? ' custom-colours' : ''}`} style={style}>
      <div className="results-head">
        <div className="hero hero-left">
          <h1>Here’s what changed</h1>
          <p className="files-line">
            <span className="num num-1">1</span>
            <span className="fname">{first?.name}</span>
            <span className="vs">vs</span>
            <span className="num num-2">2</span>
            <span className="fname">{second?.name}</span>
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-secondary" onClick={startOver}>
            Compare new files
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void onDownload()}
            title={`Saves ${download.format === 'csv' ? 'a CSV file' : 'an Excel file'}. Change this under Download on the Set up screen.`}
          >
            <DownloadIcon />
            {saving ? 'Preparing…' : 'Download report'}
          </button>
        </div>
      </div>

      {saveError && (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      )}

      <div className="totals" aria-label="Totals across all compared sheets">
        <b>All {plural(results.length, 'sheet')}</b>
        <span>
          <span className="dot dot-modified" />
          <b>{total.modified.toLocaleString()}</b> changed
        </span>
        <span>
          <span className="dot dot-added" />
          <b>{total.added.toLocaleString()}</b> added
        </span>
        <span>
          <span className="dot dot-removed" />
          <b>{total.removed.toLocaleString()}</b> removed
        </span>
        <span>
          <span className="dot dot-unchanged" />
          <b>{total.unchanged.toLocaleString()}</b> unchanged
        </span>
      </div>

      {results.length > 0 && (
        <section className="card results-card">
          <div className="tabs" role="tablist" aria-label="Sheets">
            {results.map((d, i) => (
              <button
                key={d.name}
                type="button"
                role="tab"
                aria-selected={i === tab}
                className={`tab${i === tab ? ' on' : ''}`}
                onClick={() => setTab(i)}
              >
                {d.name}
                <span className={`tab-n${differing(d) ? '' : ' zero'}`} title="Rows that differ">
                  {differing(d).toLocaleString()}
                </span>
                {d.keyColumns.length === 0 && <span className="tab-tag">row by row</span>}
              </button>
            ))}
          </div>
          <div role="tabpanel">
            <DiffTable
              key={current.name}
              diff={current}
              ignored={ignored}
              names={[first?.name ?? 'First file', second?.name ?? 'Second file']}
            />
          </div>
        </section>
      )}

      {notCompared.length > 0 && (
        <p className="not-compared">
          <InfoIcon size={18} />
          <span>
            Not compared:{' '}
            {notCompared.map((s, i) => (
              <span key={s.name}>
                {i > 0 && (i === notCompared.length - 1 ? ' and ' : ', ')}
                <b>{s.name}</b> ({s.why})
              </span>
            ))}
            . {notCompared.length === 1 ? 'It is' : 'They are'} listed in the report.
          </span>
        </p>
      )}

      <div className="page-foot">
        <button type="button" className="btn btn-secondary" onClick={() => goTo(2)}>
          <ArrowLeftIcon />
          Back to set up
        </button>
      </div>
    </main>
  )
}
