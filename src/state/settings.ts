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

/** "Color": one highlight colour per kind of change, used on screen and in the report. */
export interface Palette {
  changed: string
  added: string
  removed: string
}

/** The ready-made colours in the picker. All light, so dark text stays readable on them. */
export const SWATCHES: { name: string; hex: string }[] = [
  { name: 'Yellow', hex: '#FFF1C2' },
  { name: 'Orange', hex: '#FFDDB0' },
  { name: 'Red', hex: '#FDECEC' },
  { name: 'Pink', hex: '#FBE1EE' },
  { name: 'Purple', hex: '#ECE5FF' },
  { name: 'Blue', hex: '#DCE9FF' },
  { name: 'Green', hex: '#EAF6EE' },
  { name: 'Grey', hex: '#EDEDF0' },
]

export const swatchName = (hex: string) =>
  SWATCHES.find((s) => s.hex.toLowerCase() === hex.toLowerCase())?.name ?? 'Custom'

export interface ColourSettings extends Palette {
  /** Mark changes with a fill colour (default) or a font colour. */
  highlight: 'fill' | 'font'
}

export const DEFAULT_COLOURS: ColourSettings = {
  changed: '#FFF1C2',
  added: '#EAF6EE',
  removed: '#FDECEC',
  highlight: 'fill',
}

export const isDefaultColours = (c: ColourSettings) =>
  (['changed', 'added', 'removed'] as const).every((k) => c[k].toLowerCase() === DEFAULT_COLOURS[k].toLowerCase())

/** "Download settings": how the report file is built. Downloading is optional. */
export interface DownloadSettings {
  fileName: string
  format: 'xlsx' | 'csv'
  includeUnchanged: boolean
  summarySheet: boolean
  oldValues: 'cell' | 'comment' | 'column'
}

export const DEFAULT_DOWNLOAD: DownloadSettings = {
  fileName: '',
  format: 'xlsx',
  includeUnchanged: true,
  summarySheet: true,
  oldValues: 'comment',
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
