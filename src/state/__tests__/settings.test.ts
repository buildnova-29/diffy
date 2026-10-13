import { describe, expect, it } from 'vitest'
import { DEFAULT_MATCH, defaultFileName, toEngineOptions } from '../settings'

describe('settings', () => {
  it('builds a clean report file name', () => {
    expect(defaultFileName('Price List March.xlsx', 'price-list april.xlsx')).toBe('diffy_price_list_march_vs_price_list_april')
    expect(defaultFileName('diffy_test_file_1.xlsx', 'diffy_test_file_2.xlsx')).toBe('diffy_test_file_1_vs_test_file_2')
  })
  it('maps the switches to engine options', () => {
    expect(toEngineOptions(DEFAULT_MATCH)).toEqual({ caseSensitive: false, trim: true, blankEqualsEmpty: true, coerceNumericText: true })
    expect(toEngineOptions({ ...DEFAULT_MATCH, ignoreCase: false }).caseSensitive).toBe(true)
  })
})
