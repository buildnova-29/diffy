import { useApp } from '../state/store'
import { ArrowLeftIcon } from './icons'

/** Temporary stand-in until the Set up screen is built. */
export function SetupPlaceholder() {
  const { first, second, goTo } = useApp()
  return (
    <main className="page">
      <div className="hero hero-left">
        <h1>How should diffy compare?</h1>
        <p>
          The Set up screen is the next thing we build. For now, here is what diffy found in your files:
        </p>
      </div>
      <ul className="found">
        {[first, second].map((f, i) =>
          f ? (
            <li key={i}>
              <b>{f.name}</b>: {f.sheets.join(', ')}
            </li>
          ) : null,
        )}
      </ul>
      <div className="page-foot">
        <button type="button" className="btn btn-secondary" onClick={() => goTo(1)}>
          <ArrowLeftIcon />
          Back
        </button>
      </div>
    </main>
  )
}
