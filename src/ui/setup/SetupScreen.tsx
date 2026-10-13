import { useApp } from '../../state/store'
import { plural } from '../format'
import { ArrowLeftIcon, ArrowRightIcon } from '../icons'
import { KeysSection } from './KeysSection'
import { OptionBoxes } from './OptionBoxes'
import { SheetsSection } from './SheetsSection'
import './setup.css'

/** Screen 2: check what diffy worked out, and adjust it. */
export function SetupScreen() {
  const { plan, busy, error, goTo, compare } = useApp()
  const count = plan.filter((p) => p.included && p.first && p.second).length

  return (
    <main className="page page-setup">
      <div className="hero hero-left">
        <h1>How should diffy compare?</h1>
      </div>

      <SheetsSection />
      <KeysSection />
      <OptionBoxes />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="page-foot">
        <button type="button" className="btn btn-secondary" onClick={() => goTo(1)}>
          <ArrowLeftIcon />
          Back
        </button>
        <button type="button" className="btn btn-primary" disabled={count === 0 || busy} onClick={() => void compare()}>
          {busy ? 'Comparing…' : `Compare ${plural(count, 'sheet')}`}
          {!busy && <ArrowRightIcon />}
        </button>
      </div>
    </main>
  )
}
