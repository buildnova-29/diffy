/**
 * The settings on the Set up screen, in plain words, and how they map to
 * the comparison engine.
 */
import type { CompareOptions } from '../core'

/** "More options": how values are matched. All on by default. */
export interface MatchSettings {
  ignoreCase: boolean
  ignoreSpaces: boolean
  blankEqualsEmpty: boolean
  numbersAsText: boolean
}

export const DEFAULT_MATCH: MatchSettings = {
  ignoreCase: true,
  ignoreSpaces: true,
  blankEqualsEmpty: true,
  numbersAsText: true,
}

export function toEngineOptions(m: MatchSettings): Partial<CompareOptions> {
  return {
    caseSensitive: !m.ignoreCase,
    trim: m.ignoreSpaces,
    blankEqualsEmpty: m.blankEqualsEmpty,
    coerceNumericText: m.numbersAsText,
  }
}

/** "Colours": the three highlight colours, used on screen and in the report. */
export type ColourPreset = 'default' | 'colourblind' | 'excel' | 'custom'

export interface Palette {
  changed: string
  added: string
  removed: string
}

export const PRESETS: Record<Exclude<ColourPreset, 'custom'>, { label: string; palette: Palette }> = {
  default: { label: 'Default', palette: { changed: '#FFF1C2', added: '#EAF6EE', removed: '#FDECEC' } },
  colourblind: { label: 'Colour-blind safe', palette: { changed: '#FFF1C2', added: '#DCE9FF', removed: '#FDE3CF' } },
  excel: { label: 'Excel classic', palette: { changed: '#FFEB9C', added: '#C6EFCE', removed: '#FFC7CE' } },
}

export interface ColourSettings {
  preset: ColourPreset
  custom: Palette
}

export const DEFAULT_COLOURS: ColourSettings = { preset: 'default', custom: { ...PRESETS.default.palette } }

export function paletteOf(c: ColourSettings): Palette {
  return c.preset === 'custom' ? c.custom : PRESETS[c.preset].palette
}

/** "Download settings": how the report file is built. Downloading is optional. */
export interface DownloadSettings {
  fileName: string
  format: 'xlsx' | 'csv'
  includeUnchanged: boolean
  summarySheet: boolean
  highlight: 'fill' | 'font'
  oldValues: 'cell' | 'comment' | 'column'
}

export const DEFAULT_DOWNLOAD: DownloadSettings = {
  fileName: '',
  format: 'xlsx',
  includeUnchanged: true,
  summarySheet: true,
  highlight: 'fill',
  oldValues: 'cell',
}

/** "price list march.xlsx" + "price list april.xlsx" → "diffy_price_list_march_vs_price_list_april". */
export function defaultFileName(first: string, second: string): string {
  const clean = (n: string) =>
    n
      .replace(/\.[^.]+$/, '')
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
      .replace(/^diffy_/, '')
  return `diffy_${clean(first)}_vs_${clean(second)}`
}
