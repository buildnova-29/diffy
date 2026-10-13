import { describe, expect, it } from 'vitest'
import { CompareOptionsSchema } from '../config'
import { checkKey } from '../detect'
import { repair, roleOf, setRole, type Pairing } from '../edit'
import { readTable } from '../reader'
import { makeWorkbook } from './helpers'

const pairs: Pairing[] = [
  { first: 'Prices', second: 'Prices', status: 'matched' },
  { first: 'Discounts', second: 'Discounts_Apr', status: 'check' },
  { first: 'Archive', second: null, status: 'onlyFirst' },
  { first: null, second: 'Forecast', status: 'onlySecond' },
]

describe('repair', () => {
  it('confirms a "please check" pair when the same sheet is picked', () => {
    expect(repair(pairs, 1, 'Discounts_Apr').changed).toEqual([])
  })

  it('pairs a one-file sheet with a lone File 2 sheet', () => {
    const r = repair(pairs, 2, 'Forecast')
    expect(r.pairs).toEqual([
      pairs[0],
      pairs[1],
      { first: 'Archive', second: 'Forecast', status: 'matched' },
    ])
    expect(r.changed).toEqual([2])
  })

  it('moves a sheet from another pair and lists the freed sheet', () => {
    const r = repair(pairs, 1, 'Prices')
    expect(r.pairs).toEqual([
      { first: 'Prices', second: null, status: 'onlyFirst' },
      { first: 'Discounts', second: 'Prices', status: 'matched' },
      pairs[2],
      pairs[3],
      { first: null, second: 'Discounts_Apr', status: 'onlySecond' },
    ])
    expect(r.changed).toEqual([0, 1, 4])
  })

  it('can unpair a sheet', () => {
    const r = repair(pairs, 0, null)
    expect(r.pairs[0]).toEqual({ first: 'Prices', second: null, status: 'onlyFirst' })
    expect(r.pairs.at(-1)).toEqual({ first: null, second: 'Prices', status: 'onlySecond' })
  })
})

describe('column roles', () => {
  it('a column is a key, compared or ignored', () => {
    expect(roleOf('A', ['A'], [])).toBe('key')
    expect(roleOf('B', ['A'], ['B'])).toBe('ignore')
    expect(roleOf('C', ['A'], ['B'])).toBe('compare')
  })
  it('ignoring a key column removes it from the key', () => {
    expect(setRole('A', 'ignore', ['A', 'B'], [])).toEqual({ key: ['B'], ignored: ['A'] })
    expect(setRole('A', 'key', [], ['A'])).toEqual({ key: ['A'], ignored: [] })
    expect(setRole('A', 'compare', ['A'], [])).toEqual({ key: [], ignored: [] })
  })
})

describe('checkKey', () => {
  const opts = CompareOptionsSchema.parse({})
  const t = readTable(makeWorkbook({ S: [['Store', 'SKU'], ['A', 'S1'], ['B', 'S1'], ['A', 'S2']] }), 'S')
  it('says unique, repeats, or row by row', () => {
    expect(checkKey(t, t, ['Store', 'SKU'], opts)).toEqual({ columns: ['Store', 'SKU'], confidence: 'unique', duplicates: 0 })
    expect(checkKey(t, t, ['SKU'], opts)).toMatchObject({ confidence: 'mostlyUnique', duplicates: 1 })
    expect(checkKey(t, t, [], opts).confidence).toBe('none')
  })
})
