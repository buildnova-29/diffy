import { useApp } from '../state/store'
import { FileDrop } from './FileDrop'
import { ArrowRightIcon, ShieldIcon, SwapIcon } from './icons'

/** Screen 1: add the two files. */
export function UploadScreen() {
  const { first, second, setFile, swap, goTo } = useApp()
  const ready = Boolean(first && second)

  return (
    <main className="page">
      <div className="hero">
        <h1>Spot the difference</h1>
        <p>Let diffy check every row and every cell for you.</p>
      </div>

      <div className="split">
        <FileDrop number={1} label="First file" file={first} onChange={(f) => setFile('first', f)} />
        <FileDrop number={2} label="Second file" file={second} onChange={(f) => setFile('second', f)} />
        <button
          type="button"
          className="swap"
          aria-label="Swap the two files"
          title="Swap files"
          disabled={!first && !second}
          onClick={swap}
        >
          <SwapIcon size={20} />
        </button>
      </div>

      <div className="page-foot">
        <span className="privacy">
          <ShieldIcon size={17} />
          Files stay on your computer. Nothing is uploaded.
        </span>
        <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => goTo(2)}>
          Next
          <ArrowRightIcon />
        </button>
      </div>
    </main>
  )
}
