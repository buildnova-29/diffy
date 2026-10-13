import { z } from 'zod'

const optionFields = {
  /** Trim leading/trailing whitespace from text. */
  trim: z.boolean(),
  /** "abc" vs "ABC" counts as a change. */
  caseSensitive: z.boolean(),
  /** Numbers within this absolute difference are treated as equal. */
  numericTolerance: z.number().min(0),
  /** Compare "10" and 10 as the same value. */
  coerceNumericText: z.boolean(),
  /** Treat null, undefined and "" as the same (blank). */
  blankEqualsEmpty: z.boolean(),
}

/** How values are normalised before they are compared. */
export const CompareOptionsSchema = z.object({
  trim: optionFields.trim.default(true),
  caseSensitive: optionFields.caseSensitive.default(false),
  numericTolerance: optionFields.numericTolerance.default(0),
  coerceNumericText: optionFields.coerceNumericText.default(true),
  blankEqualsEmpty: optionFields.blankEqualsEmpty.default(true),
})

/** Per-sheet overrides: no defaults, so unset fields fall back to the global options. */
const OptionOverridesSchema = z.object(optionFields).partial()

export type CompareOptions = z.infer<typeof CompareOptionsSchema>

const DEFAULT_OPTIONS: CompareOptions = CompareOptionsSchema.parse({})

/** One sheet pairing: which Before sheet maps to which After sheet, and how. */
export const SheetConfigSchema = z
  .object({
    /** Label used in the report. Defaults to the Before sheet name. */
    name: z.string().min(1).optional(),
    beforeSheet: z.string().min(1),
    /** Defaults to the same name as the Before sheet. */
    afterSheet: z.string().min(1).optional(),
    /** 1-based row number holding the column headers (in the first file). */
    headerRow: z.number().int().min(1).default(1),
    /** Header row in the second file. Defaults to the same as the first file. */
    afterHeaderRow: z.number().int().min(1).optional(),
    /** Columns that together identify a row. Empty = compare rows by position (row by row). */
    keyColumns: z.array(z.string().min(1)).default([]),
    /** Columns to compare. Empty = every shared column except keys and ignored ones. */
    compareColumns: z.array(z.string().min(1)).default([]),
    /** Columns never compared. */
    ignoreColumns: z.array(z.string().min(1)).default([]),
    /** Per-sheet overrides of the global options. */
    options: OptionOverridesSchema.default({}),
  })
  .transform((s) => ({
    ...s,
    name: s.name ?? s.beforeSheet,
    afterSheet: s.afterSheet ?? s.beforeSheet,
    afterHeaderRow: s.afterHeaderRow ?? s.headerRow,
  }))

export type SheetConfig = z.output<typeof SheetConfigSchema>

/** Top-level comparison config. */
export const DiffConfigSchema = z.object({
  sheets: z.array(SheetConfigSchema).min(1, 'Configure at least one sheet'),
  options: CompareOptionsSchema.default(DEFAULT_OPTIONS),
})

export type DiffConfig = z.output<typeof DiffConfigSchema>
export type DiffConfigInput = z.input<typeof DiffConfigSchema>

/** Validate raw config (e.g. loaded from JSON). Throws a ZodError on bad input. */
export function parseConfig(raw: unknown): DiffConfig {
  return DiffConfigSchema.parse(raw)
}

/** Effective options for one sheet: global options with sheet overrides applied. */
export function resolveOptions(config: DiffConfig, sheet: SheetConfig): CompareOptions {
  const overrides = Object.fromEntries(
    Object.entries(sheet.options).filter(([, v]) => v !== undefined),
  )
  return { ...config.options, ...overrides }
}
