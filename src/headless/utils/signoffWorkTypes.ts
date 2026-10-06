import type { CostSource } from './costDetailsTypes'
import type { RunModel } from './runModel'
import type { SignoffScope } from './storySignoffTypes'

/** Where a stretch of work went, as the Time tile's bar splits it. */
export type SignoffTimePart = 'thinking' | 'tools' | 'system' | 'checks' | 'other'

/** One step's work across the runs a sign-off reads — every feature's "Implement" added up. */
export type SignoffWorkStep = {
  key: string
  label: string
  workMs: number
  parts: Record<SignoffTimePart, number>
}

/** One agent role's spend across those runs. */
export type SignoffWorkRole = {
  /** The step's agent type, or its kind for a step that runs its own agent (`judge`, `report`). */
  role: string
  /** How many agent runs the role's steps started. */
  runs: number
  cost: CostSource | undefined
  /** The models the role's steps ran on, each once. */
  models: RunModel[]
}

/**
 * The time and spend behind a sign-off, read off the totals of the runs it
 * shows: each feature's latest run, each fix pass and the story run's own
 * steps — the same runs the head's time and cost chips add up.
 */
export type SignoffWork = {
  steps: SignoffWorkStep[]
  workMs: number
  /** Every park those runs sat in — waiting for a person, never work. */
  waitingMs: number
  roles: SignoffWorkRole[]
  cost: CostSource | undefined
  agentRuns: number
  /** Every model the work ran on, each once. */
  models: RunModel[]
}

/** The runs a sign-off's work is read from. */
export type SignoffWorkScope = Pick<SignoffScope, 'storyRun' | 'featureRuns' | 'fixPasses'>

/** One part of a time bar: its share of the whole sign-off's work. */
export type SignoffTimeSegment = {
  part: SignoffTimePart
  label: string
  value: string
  /** Of the whole sign-off's work, so every bar shares one scale. */
  fraction: number
}

/** One step's row under the Time tile: its name, its bar and its total. */
export type SignoffTimeRow = {
  key: string
  label: string
  total: string
  segments: SignoffTimeSegment[]
}

/** What the Time tile says, and the per-step breakdown it opens. */
export type SignoffTimeView = {
  /** "1h 20m of work". */
  headline: string
  segments: SignoffTimeSegment[]
  /** "+ 17h 43m waiting for you" — beside the work, never in it. */
  waiting: string | undefined
  /** The legend: each part that has time, with its total. */
  legend: SignoffTimeSegment[]
  /** "Waiting for you 17h 43m (not counted)". */
  waitingLegend: string | undefined
  rows: SignoffTimeRow[]
}

/** One role's row under the Cost tile: its name and runs, a list-price bar and the amount. */
export type SignoffCostRow = {
  key: string
  label: string
  amount: string
  fraction: number
  /** The models the role ran on, as read-only chips. */
  models: RunModel[]
}

/** A single-agent run's model and how its tokens split. */
export type SignoffCostTokens = {
  model: RunModel
  rows: { label: string; value: string }[]
}

/** What the Cost tile says, and the breakdown it opens. */
export type SignoffCostView = {
  /** "$0.00 billed". */
  headline: string
  /** "subscription · list price $11.76". */
  billing: string | undefined
  /** "14 agent runs". */
  runs: string | undefined
  /** The models those runs ran on, as read-only chips. */
  models: RunModel[]
  /** What billed and list price mean for this kind of billing. */
  note: string | undefined
  /** Per agent role — absent for a single agent run, which shows its tokens instead. */
  rows: SignoffCostRow[]
  tokens: SignoffCostTokens | undefined
}
