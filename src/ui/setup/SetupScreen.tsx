import { useApp } from '../../state/store'
import { plural } from '../format'
import { ArrowLeftIcon, ArrowRightIcon } from '../icons'
import { SettingsCard } from './SettingsCard'
import { Banner, SheetTable } from './SheetTable'
import './setup.css'

/** Screen 2: check what diffy worked out, and adjust it if needed. */
export function SetupScreen() {
  const { plan, busy, error, goTo, compare } = useApp()
  const count = plan.filter((p) => p.included && p.first && p.second).length

  return (
    <main className="page page-setup">
      <div className="hero hero-left">
        <h1>How should diffy compare?</h1>
      </div>

      <Banner />
      <SheetTable />
      <SettingsCard />

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
