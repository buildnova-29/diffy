import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../state/store'
import { DEFAULT_COLOURS, SWATCHES, swatchName, type MatchSettings, type Palette } from '../../state/settings'
import { CheckIcon, ChevronDownIcon } from '../icons'

type Section = 'options' | 'color' | 'download'

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Line({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="s-line">
      <span className="s-line-text">
        <span className="s-line-title">{title}</span>
        {hint && <span className="s-line-hint">{hint}</span>}
      </span>
      <span className="s-line-control">{children}</span>
    </div>
  )
}

const MATCH: { key: keyof MatchSettings; title: string; hint: string; short: string }[] = [
  { key: 'ignoreCase', title: 'Ignore case', hint: '"Pen" and "PEN" count as the same.', short: 'Ignore case' },
  {
    key: 'ignoreSpaces',
    title: 'Ignore extra spaces',
    hint: 'Spaces at the start or end of a cell are skipped.',
    short: 'Ignore spaces',
  },
  {
    key: 'blankEqualsEmpty',
    title: 'Blank equals empty',
    hint: 'An empty cell and empty text count as the same.',
    short: 'Blank = empty',
  },
  {
    key: 'numbersAsText',
    title: 'Numbers stored as text',
    hint: '10 and "10" count as the same.',
    short: 'Numbers as text',
  },
]

/** A colour dropdown: the swatch and its name, opening a grid of ready-made colours plus "Custom…". */
function ColourPicker({ value, onChange, label }: { value: string; onChange: (hex: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLSpanElement>(null)
  const custom = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <span className="picker" ref={box}>
      <button
        type="button"
        className={`picker-btn${open ? ' is-open' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${label} colour: ${swatchName(value)}`}
        onClick={() => setOpen(!open)}
      >
        <span className="sw" style={{ background: value }} />
        {swatchName(value)}
        <ChevronDownIcon size={15} />
      </button>
      {open && (
        <span className="picker-pop" role="group" aria-label={`${label} colour`}>
          <span className="sw-grid">
            {SWATCHES.map((s) => {
              const on = s.hex.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={s.hex}
                  type="button"
                  className={`sw-big${on ? ' on' : ''}`}
                  style={{ background: s.hex }}
                  aria-label={s.name}
                  aria-pressed={on}
                  title={s.name}
                  onClick={() => {
                    onChange(s.hex)
                    setOpen(false)
                  }}
                >
                  {on && <CheckIcon size={14} />}
                </button>
              )
            })}
          </span>
          <button type="button" className="sw-custom" onClick={() => custom.current?.click()}>
            Custom…
          </button>
          <input
            ref={custom}
            type="color"
            className="visually-hidden"
            tabIndex={-1}
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
          />
        </span>
      )}
    </span>
  )
}

/** The three settings, each folded to one line that says what is set. */
export function SettingsCard() {
  const { match, colours, download, setMatch, setColours, setDownload } = useApp()
  const [open, setOpen] = useState<Set<Section>>(() => new Set())
  const flip = (s: Section) =>
    setOpen((o) => {
      const n = new Set(o)
      if (n.has(s)) n.delete(s)
      else n.add(s)
      return n
    })

  const excel = download.format === 'xlsx'
  const onCount = MATCH.filter((m) => match[m.key])
  const summaries: Record<Section, React.ReactNode> = {
    options: onCount.length ? onCount.map((m) => m.short).join(' · ') : 'Exact match: every difference counts',
    color: (
      <>
        {(['changed', 'added', 'removed'] as const).map((k) => (
          <span key={k} className="sw sw-small" style={{ background: colours[k] }} />
        ))}
        <span>{colours.highlight === 'fill' ? 'Fill' : 'Font'}</span>
      </>
    ),
    download: excel
      ? [
          'Excel',
          download.summarySheet && 'Summary sheet',
          'Side by side',
          !download.includeUnchanged && 'Changes only',
        ]
          .filter(Boolean)
          .join(' · ')
      : `CSV · ${download.includeUnchanged ? 'All rows' : 'Changes only'}`,
  }

  const head = (s: Section, title: string) => (
    <button type="button" className="s-head" aria-expanded={open.has(s)} onClick={() => flip(s)}>
      <span className="s-title">{title}</span>
      <span className="s-summary">{summaries[s]}</span>
      <span className={`chev${open.has(s) ? ' up' : ''}`}>
        <ChevronDownIcon size={17} />
      </span>
    </button>
  )

  const preview: Record<keyof Palette, React.ReactNode> = {
    changed: (
      <>
        <s>10</s> → 12
      </>
    ),
    added: <>+ new row</>,
    removed: <s>old row</s>,
  }

  return (
    <section className="settings" aria-label="Settings">
      <div className="s-sec">
        {head('options', 'Options')}
        {open.has('options') && (
          <div className="s-body">
            {MATCH.map((m) => (
              <Line key={m.key} title={m.title} hint={m.hint}>
                <Switch label={m.title} checked={match[m.key]} onChange={(v) => setMatch({ [m.key]: v })} />
              </Line>
            ))}
          </div>
        )}
      </div>

      <div className="s-sec">
        {head('color', 'Color')}
        {open.has('color') && (
          <div className="s-body">
            <div className="s-line">
              <span className="s-line-text s-line-inline">
                <span className="s-line-label">Highlight with</span>
                <Segmented
                  label="Highlight with"
                  value={colours.highlight}
                  onChange={(highlight) => setColours({ highlight })}
                  options={[
                    { value: 'fill', label: 'Fill' },
                    { value: 'font', label: 'Font' },
                  ]}
                />
              </span>
              <button type="button" className="text-link" onClick={() => setColours(DEFAULT_COLOURS)}>
                Reset
              </button>
            </div>
            {(
              [
                ['changed', 'Changed cell'],
                ['added', 'Added row'],
                ['removed', 'Removed row'],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="s-colour">
                <span className="s-line-title">{label}</span>
                <ColourPicker label={label} value={colours[k]} onChange={(hex) => setColours({ [k]: hex })} />
                <span
                  className="hl-preview"
                  style={
                    colours.highlight === 'fill'
                      ? { background: colours[k] }
                      : { color: `color-mix(in srgb, ${colours[k]} 30%, #1d1d24)`, borderColor: colours[k] }
                  }
                >
                  {preview[k]}
                </span>
              </div>
            ))}
            <p className="s-tip">Tip: Blue and Orange are the easiest pair to tell apart for color-blind readers.</p>
          </div>
        )}
      </div>

      <div className="s-sec">
        {head('download', 'Download')}
        {open.has('download') && (
          <div className="s-body">
            <Line title="File name">
              <span className="name-input">
                <input
                  type="text"
                  value={download.fileName}
                  aria-label="File name"
                  onChange={(e) => setDownload({ fileName: e.target.value })}
                />
                <span className="name-ext">.{download.format}</span>
              </span>
            </Line>
            <Line title="Format" hint="Excel keeps the colours. CSV is plain text.">
              <Segmented
                label="Format"
                value={download.format}
                onChange={(format) => setDownload({ format })}
                options={[
                  { value: 'xlsx', label: 'Excel' },
                  { value: 'csv', label: 'CSV' },
                ]}
              />
            </Line>
            <Line title="Include unchanged rows" hint="Turn off to list changes only.">
              <Switch
                label="Include unchanged rows"
                checked={download.includeUnchanged}
                onChange={(v) => setDownload({ includeUnchanged: v })}
              />
            </Line>
            {excel && (
              <>
                <Line title="Summary sheet" hint="A first sheet with the counts.">
                  <Switch
                    label="Summary sheet"
                    checked={download.summarySheet}
                    onChange={(v) => setDownload({ summarySheet: v })}
                  />
                </Line>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
