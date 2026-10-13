import { useApp } from '../state/store'
import { plural } from './format'
import { ArrowLeftIcon } from './icons'

/** Temporary stand-in until the Results screen is built: the counts per sheet. */
export function ResultsPlaceholder() {
  const { results, plan, first, second, goTo } = useApp()
  const notCompared = plan.filter((p) => !(p.included && p.first && p.second))
  return (
    <main className="page">
      <div className="hero hero-left">
        <h1>Here's what changed</h1>
        <p>
          {first?.name} vs {second?.name}. The full Results screen is the next thing we build; for now, the counts:
        </p>
      </div>
      <div className="preview-scroll">
        <table className="counts">
          <thead>
            <tr>
              <th>Sheet</th>
              <th>Key</th>
              <th>Changed rows</th>
              <th>Changed cells</th>
              <th>Added</th>
              <th>Removed</th>
              <th>Unchanged</th>
            </tr>
          </thead>
          <tbody>
            {results?.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.keyColumns.length ? r.keyColumns.join(' + ') : 'row by row'}</td>
                <td>{r.summary.modified}</td>
                <td>{r.summary.changedCells}</td>
                <td>{r.summary.added}</td>
                <td>{r.summary.removed}</td>
                <td>{r.summary.unchanged}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notCompared.length > 0 && (
        <p className="found">
          Not compared ({plural(notCompared.length, 'sheet')}): {notCompared.map((p) => p.first ?? p.second).join(', ')}
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
