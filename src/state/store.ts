import type { WorkBook } from 'xlsx'
import { create } from 'zustand'
import {
  analyse,
  checkKey,
  compareWorkbooks,
  CompareOptionsSchema,
  planPair,
  planToConfig,
  readWorkbook,
  repair,
  setRole,
  type ColumnRole,
  type SheetDiff,
  type SheetPlan,
  type TablePair,
} from '../core'
import {
  DEFAULT_COLOURS,
  DEFAULT_DOWNLOAD,
  DEFAULT_MATCH,
  defaultFileName,
  toEngineOptions,
  type ColourSettings,
  type DownloadSettings,
  type MatchSettings,
} from './settings'

/** A file the user added, plus what we learned about it. */
export interface LoadedFile {
  name: string
  size: number
  sheets: string[]
  data: ArrayBuffer
}

export type Step = 1 | 2 | 3
export type Slot = 'first' | 'second'

interface AppState {
  step: Step
  first: LoadedFile | null
  second: LoadedFile | null

  /** Both files read in full; filled when the user leaves the Upload screen. */
  wbFirst: WorkBook | null
  wbSecond: WorkBook | null
  /** Which files the plan below was made for, so going Back and Next keeps the user's edits. */
  preparedFor: string
  plan: SheetPlan[]
  tables: TablePair[]
  /** File 1 sheets the user paired by hand (they keep their dropdown). */
  pairedByHand: string[]
  busy: boolean
  error: string | null

  match: MatchSettings
  colours: ColourSettings
  download: DownloadSettings
  results: SheetDiff[] | null

  setFile: (slot: Slot, file: LoadedFile | null) => void
  swap: () => void
  goTo: (step: Step) => void
  /** "Compare new files": clear both files and their results; settings are kept. */
  startOver: () => void

  /** Upload → Set up: read both files and let diffy work out the plan. */
  prepare: () => Promise<void>
  toggleSheet: (index: number) => void
  pairWith: (index: number, second: string | null) => void
  setColumnRole: (index: number, column: string, role: ColumnRole) => void
  /** Replace the key of one sheet; [] means row by row. */
  setKey: (index: number, columns: string[]) => void
  /** Tick or untick every sheet that is in both files. */
  setAllSheets: (on: boolean) => void
  setMatch: (patch: Partial<MatchSettings>) => void
  setColours: (patch: Partial<ColourSettings>) => void
  setDownload: (patch: Partial<DownloadSettings>) => void
  /** Set up → Results. */
  compare: () => Promise<void>
}

const signature = (a: LoadedFile | null, b: LoadedFile | null) =>
  [a, b].map((f) => (f ? `${f.name}:${f.size}` : '-')).join('|')

/** Lets the browser paint (e.g. a "Reading…" label) before heavy work starts. */
const nextFrame = () => new Promise((r) => setTimeout(r, 30))

/** The app's shared memory. Every screen reads from and writes to this. */
export const useApp = create<AppState>((set, get) => ({
  step: 1,
  first: null,
  second: null,
  wbFirst: null,
  wbSecond: null,
  preparedFor: '',
  plan: [],
  tables: [],
  pairedByHand: [],
  busy: false,
  error: null,
  match: DEFAULT_MATCH,
  colours: DEFAULT_COLOURS,
  download: DEFAULT_DOWNLOAD,
  results: null,

  setFile: (slot, file) => set({ ...({ [slot]: file } as Pick<AppState, Slot>), error: null }),
  swap: () => set((s) => ({ first: s.second, second: s.first })),
  goTo: (step) => set({ step }),
  startOver: () =>
    set({
      step: 1,
      first: null,
      second: null,
      wbFirst: null,
      wbSecond: null,
      preparedFor: '',
      plan: [],
      tables: [],
      pairedByHand: [],
      results: null,
      error: null,
    }),

  prepare: async () => {
    const { first, second, preparedFor } = get()
    if (!first || !second) return
    const sig = signature(first, second)
    if (sig === preparedFor) return set({ step: 2 })

    set({ busy: true, error: null })
    await nextFrame()
    try {
      const wbFirst = readWorkbook(first.data)
      const wbSecond = readWorkbook(second.data)
      const { plan, tables } = analyse(wbFirst, wbSecond, toEngineOptions(get().match))
      set({
        wbFirst,
        wbSecond,
        plan,
        tables,
        preparedFor: sig,
        pairedByHand: [],
        results: null,
        download: { ...get().download, fileName: defaultFileName(first.name, second.name) },
        step: 2,
      })
    } catch (e) {
      set({ error: `diffy couldn't read one of the files. ${e instanceof Error ? e.message : ''}`.trim() })
    } finally {
      set({ busy: false })
    }
  },

  toggleSheet: (index) =>
    set((s) => ({
      plan: s.plan.map((p, i) => (i === index && p.first && p.second ? { ...p, included: !p.included } : p)),
    })),

  pairWith: (index, second) => {
    const { plan, tables, wbFirst, wbSecond, match } = get()
    if (!wbFirst || !wbSecond) return
    const { pairs, changed } = repair(plan, index, second)
    if (changed.length === 0) {
      // Same sheet picked again: the user has checked it.
      return set({ plan: plan.map((p, i) => (i === index && p.status === 'check' ? { ...p, status: 'matched' } : p)) })
    }
    // Rows that didn't change keep their plan (and the user's edits); changed rows are planned again.
    const kept = new Map(plan.map((p, i) => [`${p.first}|${p.second}`, i]))
    const nextPlan: SheetPlan[] = []
    const nextTables: TablePair[] = []
    pairs.forEach((p, i) => {
      const old = kept.get(`${p.first}|${p.second}`)
      if (!changed.includes(i) && old !== undefined) {
        nextPlan.push(plan[old])
        nextTables.push(tables[old])
      } else {
        const r = planPair(wbFirst, wbSecond, p.first, p.second, p.status, toEngineOptions(match))
        nextPlan.push(r.plan)
        nextTables.push(r.tables)
      }
    })
    const name = plan[index].first!
    set((s) => ({
      plan: nextPlan,
      tables: nextTables,
      pairedByHand: [...s.pairedByHand.filter((n) => n !== name), name],
    }))
  },

  setColumnRole: (index, column, role) => {
    const { plan, tables, match } = get()
    const p = plan[index]
    const t = tables[index]
    if (!p || !t.first || !t.second) return
    const roles = setRole(column, role, p.key.columns, p.ignored)
    const opts = CompareOptionsSchema.parse(toEngineOptions(match))
    const key = checkKey(t.first, t.second, roles.key, opts)
    set({ plan: plan.map((x, i) => (i === index ? { ...x, key, ignored: roles.ignored } : x)) })
  },

  setKey: (index, columns) => {
    const { plan, tables, match } = get()
    const p = plan[index]
    const t = tables[index]
    if (!p || !t.first || !t.second) return
    const key = checkKey(t.first, t.second, columns, CompareOptionsSchema.parse(toEngineOptions(match)))
    const ignored = p.ignored.filter((c) => !columns.includes(c))
    set({ plan: plan.map((x, i) => (i === index ? { ...x, key, ignored } : x)) })
  },

  setAllSheets: (on) => set((s) => ({ plan: s.plan.map((p) => (p.first && p.second ? { ...p, included: on } : p)) })),

  setMatch: (patch) => {
    const match = { ...get().match, ...patch }
    const opts = CompareOptionsSchema.parse(toEngineOptions(match))
    const { plan, tables } = get()
    // Case and spaces change which values count as repeats, so re-check each key.
    const next = plan.map((p, i) => {
      const t = tables[i]
      return t?.first && t.second && p.key.columns.length
        ? { ...p, key: checkKey(t.first, t.second, p.key.columns, opts) }
        : p
    })
    set({ match, plan: next })
  },
  setColours: (patch) => set((s) => ({ colours: { ...s.colours, ...patch } })),
  setDownload: (patch) => set((s) => ({ download: { ...s.download, ...patch } })),

  compare: async () => {
    const { wbFirst, wbSecond, plan, match } = get()
    if (!wbFirst || !wbSecond) return
    set({ busy: true, error: null })
    await nextFrame()
    try {
      const results = compareWorkbooks(wbFirst, wbSecond, planToConfig(plan, toEngineOptions(match)))
      set({ results, step: 3 })
    } catch (e) {
      set({ error: `Something went wrong while comparing. ${e instanceof Error ? e.message : ''}`.trim() })
    } finally {
      set({ busy: false })
    }
  },
}))
