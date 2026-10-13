import { Fragment } from 'react'
import type { Step } from '../state/store'
import { CheckIcon, ChevronRightIcon } from './icons'
import { Logo } from './Logo'

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Upload' },
  { n: 2, label: 'Set up' },
  { n: 3, label: 'Results' },
]

/** Top bar: logo on the left, the 1 · 2 · 3 step bar on the right. */
export function Header({ step }: { step: Step }) {
  return (
    <header className="header">
      <div className="header-inner">
        <Logo />
        <nav aria-label="Progress">
          <ol className="steps">
            {STEPS.map((s, i) => {
              const state = s.n < step ? 'done' : s.n === step ? 'current' : 'todo'
              return (
                <Fragment key={s.n}>
                  {i > 0 && (
                    <li className="step-sep" aria-hidden="true">
                      <ChevronRightIcon size={16} />
                    </li>
                  )}
                  <li className={`step step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                    <span className="step-dot">{state === 'done' ? <CheckIcon size={14} /> : s.n}</span>
                    <span>{s.label}</span>
                  </li>
                </Fragment>
              )
            })}
          </ol>
        </nav>
      </div>
    </header>
  )
}
