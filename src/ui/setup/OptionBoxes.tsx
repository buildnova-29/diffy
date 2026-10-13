import { useApp } from '../../state/store'
import { PRESETS, paletteOf, type ColourPreset, type MatchSettings, type Palette } from '../../state/settings'
import { CheckIcon, ChevronDownIcon, DownloadIcon, PaletteIcon, SlidersIcon } from '../icons'

/** A folded box: closed by default, and shows its current setting when closed. */
function Fold({
  icon,
  title,
  summary,
  children,
}: {
  icon: React.ReactNode
  title: string
  summary: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <details className="fold">
      <summary>
        <span className="fold-icon">{icon}</span>
        <span className="fold-text">
          <span className="fold-title">{title}</span>
          <span className="fold-summary">{summary}</span>
        </span>
        <span className="fold-chev">
          <ChevronDownIcon size={18} />
        </span>
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  )
}

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

function SettingRow({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="setting">
      <div className="setting-text">
        <span className="setting-title">{title}</span>
        <span className="setting-hint">{hint}</span>
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

const MATCH_ROWS: { key: keyof MatchSettings; title: string; hint: string; short: string }[] = [
  { key: 'ignoreCase', title: 'Ignore case', hint: '"Pen" and "PEN" count as the same.', short: 'Ignore case' },
  { key: 'ignoreSpaces', title: 'Ignore extra spaces', hint: 'Spaces at the start or end of a cell are skipped.', short: 'Ignore spaces' },
  { key: 'blankEqualsEmpty', title: 'Blank equals empty', hint: 'An empty cell and a cell with empty text count as the same.', short: 'Blank equals empty' },
  { key: 'numbersAsText', title: 'Numbers stored as text', hint: '10 and "10" count as the same.', short: 'Numbers as text' },
]

function Swatches({ p }: { p: Palette }) {
  return (
    <span className="swatches" aria-hidden="true">
      <span style={{ background: p.changed }}>±</span>
      <span style={{ background: p.added }}>+</span>
      <span style={{ background: p.removed }}>−</span>
    </span>
  )
}

export function OptionBoxes() {
  const { match, colours, download, setMatch, setColours, setDownload } = useApp()
  const on = MATCH_ROWS.filter((r) => match[r.key]).map((r) => r.short)
  const presetLabel = colours.preset === 'custom' ? 'Custom' : PRESETS[colours.preset].label
  const excel = download.format === 'xlsx'

  return (
    <div className="folds">
      <Fold icon={<SlidersIcon size={20} />} title="More options" summary={on.length ? on.join(' · ') : 'Exact match: every difference counts'}>
        <p className="fold-intro">How values are matched. The header row is found automatically.</p>
        {MATCH_ROWS.map((r) => (
          <SettingRow key={r.key} title={r.title} hint={r.hint}>
            <Switch label={r.title} checked={match[r.key]} onChange={(v) => setMatch({ [r.key]: v })} />
          </SettingRow>
        ))}
      </Fold>

      <Fold
        icon={<PaletteIcon size={20} />}
        title="Colours"
        summary={
          <>
            <Swatches p={paletteOf(colours)} /> {presetLabel}
          </>
        }
      >
        <p className="fold-intro">Used on screen and in the Excel report.</p>
        <div className="presets" role="radiogroup" aria-label="Colour set">
          {(Object.keys(PRESETS) as Exclude<ColourPreset, 'custom'>[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={colours.preset === k}
              className="preset"
              onClick={() => setColours({ preset: k })}
            >
              <span className="preset-name">
                {PRESETS[k].label}
                {colours.preset === k && <CheckIcon size={15} />}
              </span>
              <Swatches p={PRESETS[k].palette} />
            </button>
          ))}
          <div className={`preset${colours.preset === 'custom' ? ' is-on' : ''}`}>
            <button
              type="button"
              role="radio"
              aria-checked={colours.preset === 'custom'}
              className="preset-name preset-name-btn"
              onClick={() => setColours({ preset: 'custom' })}
            >
              Custom
              {colours.preset === 'custom' && <CheckIcon size={15} />}
            </button>
            <span className="custom-pickers">
              {(['changed', 'added', 'removed'] as const).map((k) => (
                <label key={k} className="picker" title={`${k[0].toUpperCase()}${k.slice(1)} colour`}>
                  <input
                    type="color"
                    value={colours.custom[k]}
                    aria-label={`${k} colour`}
                    onChange={(e) => setColours({ preset: 'custom', custom: { ...colours.custom, [k]: e.target.value.toUpperCase() } })}
                  />
                </label>
              ))}
            </span>
          </div>
        </div>
        <p className="legend">± Changed cell · + Added row · − Removed row</p>
      </Fold>

      <Fold
        icon={<DownloadIcon size={20} />}
        title="Download settings"
        summary={
          excel
            ? ['Excel', download.includeUnchanged ? 'Unchanged rows included' : 'Changes only', download.summarySheet ? 'Summary sheet' : '']
                .filter(Boolean)
                .join(' · ')
            : `CSV · ${download.includeUnchanged ? 'Unchanged rows included' : 'Changes only'}`
        }
      >
        <p className="fold-intro">How the report is built. Downloading is optional: you choose on the results screen.</p>
        <SettingRow title="File name" hint="You can rename it before downloading.">
          <span className="name-input">
            <input
              type="text"
              value={download.fileName}
              aria-label="File name"
              onChange={(e) => setDownload({ fileName: e.target.value })}
            />
            <span className="name-ext">.{download.format}</span>
          </span>
        </SettingRow>
        <SettingRow title="Format" hint="Excel keeps colours. CSV is plain text, one file per sheet.">
          <Segmented
            label="Format"
            value={download.format}
            onChange={(format) => setDownload({ format })}
            options={[
              { value: 'xlsx', label: 'Excel (.xlsx)' },
              { value: 'csv', label: 'CSV' },
            ]}
          />
        </SettingRow>
        <SettingRow title="Include unchanged rows" hint="Every row is listed, with changes highlighted. Turn off for changes only.">
          <Switch label="Include unchanged rows" checked={download.includeUnchanged} onChange={(v) => setDownload({ includeUnchanged: v })} />
        </SettingRow>
        {excel && (
          <>
            <SettingRow title="Summary sheet" hint="A first sheet with counts per sheet and sheets not compared.">
              <Switch label="Summary sheet" checked={download.summarySheet} onChange={(v) => setDownload({ summarySheet: v })} />
            </SettingRow>
            <SettingRow title="Highlight with" hint="How changes are marked in Excel.">
              <Segmented
                label="Highlight with"
                value={download.highlight}
                onChange={(highlight) => setDownload({ highlight })}
                options={[
                  { value: 'fill', label: 'Fill colour' },
                  { value: 'font', label: 'Font colour' },
                ]}
              />
            </SettingRow>
            <SettingRow title="Show old values" hint="Where the value from the first file appears.">
              <Segmented
                label="Show old values"
                value={download.oldValues}
                onChange={(oldValues) => setDownload({ oldValues })}
                options={[
                  { value: 'cell', label: 'In the cell' },
                  { value: 'comment', label: 'As a comment' },
                  { value: 'column', label: 'Extra column' },
                ]}
              />
            </SettingRow>
          </>
        )}
      </Fold>
    </div>
  )
}
