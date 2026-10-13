import { create } from 'zustand'

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
  setFile: (slot: Slot, file: LoadedFile | null) => void
  swap: () => void
  goTo: (step: Step) => void
}

/** The app's shared memory. Every screen reads from and writes to this. */
export const useApp = create<AppState>((set) => ({
  step: 1,
  first: null,
  second: null,
  setFile: (slot, file) => set({ [slot]: file } as Pick<AppState, Slot>),
  swap: () => set((s) => ({ first: s.second, second: s.first })),
  goTo: (step) => set({ step }),
}))
