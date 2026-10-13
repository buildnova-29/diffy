import { describe, expect, it } from 'vitest'
import { parseConfig, resolveOptions } from '../config'

describe('parseConfig', () => {
  it('fills defaults', () => {
    const cfg = parseConfig({ sheets: [{ beforeSheet: 'Products', keyColumns: ['Product'] }] })
    const s = cfg.sheets[0]
    expect(s.name).toBe('Products')
    expect(s.afterSheet).toBe('Products')
    expect(s.headerRow).toBe(1)
    expect(s.compareColumns).toEqual([])
    expect(cfg.options).toEqual({
      trim: true,
      caseSensitive: false,
      numericTolerance: 0,
      coerceNumericText: true,
      blankEqualsEmpty: true,
    })
  })

  it('allows a sheet with no key columns (row by row)', () => {
    const cfg = parseConfig({ sheets: [{ beforeSheet: 'Products' }] })
    expect(cfg.sheets[0].keyColumns).toEqual([])
    expect(cfg.sheets[0].afterHeaderRow).toBe(1)
  })

  it('rejects an empty sheet list', () => {
    expect(() => parseConfig({ sheets: [] })).toThrow()
  })

  it('applies per-sheet option overrides', () => {
    const cfg = parseConfig({
      options: { numericTolerance: 0.5 },
      sheets: [{ beforeSheet: 'Products', keyColumns: ['Product'], options: { caseSensitive: true } }],
    })
    const opts = resolveOptions(cfg, cfg.sheets[0])
    expect(opts.caseSensitive).toBe(true)
    expect(opts.numericTolerance).toBe(0.5)
    expect(opts.trim).toBe(true)
  })
})
