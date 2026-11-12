import type { ProjectProcessDefaultCaps } from 'thefactory-tools/types'

/** A launch's caps, under the names the approval's decision carries them. */
export type LaunchCaps = {
  spendCapUsd?: number
  stepSpendCapUsd?: number
  wallClockMs?: number
  maxIterations?: number
  questionCap?: number
  checkTimeoutMs?: number
}

export type LaunchCapKey = keyof LaunchCaps

/** What the person typed in each field, empty included. */
export type LaunchCapsTyped = Partial<Record<LaunchCapKey, string>>

/** One field of a launch's limits. */
export type LaunchCapFieldView = {
  key: LaunchCapKey
  label: string
  unit: string
  hint: string
  /** What the field holds, in its unit. */
  text: string
  /** Shown while it is empty: what emptying a project's default falls back to. */
  placeholder?: string
  /** It holds the project's default, untouched. */
  fromProject: boolean
  /** Why this cannot be a cap. */
  error?: string
}

/** Where a launch's limits start from. */
export type LaunchCapFieldsInput = {
  /** What the agent asked for. */
  asked?: LaunchCaps
  defaults?: ProjectProcessDefaultCaps
  typed?: LaunchCapsTyped
}

/** The launch's worst case: its attempts across what it works. */
export type LaunchWorstCaseInput = {
  attempts: number | undefined
  count: number
  of: 'feature' | 'leg' | 'variant'
}
