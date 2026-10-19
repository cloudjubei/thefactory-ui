/** How much of a stretch of usage is known: every count, some, or none. */
export type DailyUsageStatus = 'complete' | 'partial' | 'unknown'

/** A UTC day range, both days included, `YYYY-MM-DD`. */
export interface DailyUsageRange {
  fromDay: string
  toDay: string
}

/** One source/provider/model's day, every cell worded. */
export interface DailyUsageModelRow {
  key: string
  /** `API` or `CLI`. */
  source: string
  name: string
  calls: string
  charged: string
  listValue: string
  input: string
  output: string
  cacheRead: string
  cacheWrite: string
  /** Cache reads as a share of input, over the calls that reported both; `—` with none. */
  cacheShare: string
}

/** A cache-read share that moved notably away from its usual level. */
export interface DailyUsageAnomalyRow {
  key: string
  kind: 'spike' | 'drop'
  title: string
  detail: string
}

/** One tool's share of the day — the spend of the responses that asked for it. */
export interface DailyUsageToolRow {
  key: string
  name: string
  calls: string
  charged: string
  /** How many of its calls carry an equal share of a response that asked for several; empty when none. */
  averaged: string
}

/** Spend no tool was given, by why. */
export interface DailyUsageUnattributedRow {
  key: string
  name: string
  calls: string
  charged: string
}

/** One UTC day of usage, every cell worded — web and native only lay it out. */
export interface DailyUsageDay {
  day: string
  label: string
  calls: string
  charged: string
  /** A list-price estimate, never a charge — marked `≈`. */
  listValue: string
  /** How many calls are short — `4 partial · 1 no usage` — or empty. */
  completeness: string
  status: DailyUsageStatus
  models: DailyUsageModelRow[]
  anomalies: DailyUsageAnomalyRow[]
  tools: DailyUsageToolRow[]
  unattributed: DailyUsageUnattributedRow[]
}

/** The range's total, worded like a day's. */
export interface DailyUsageTotal {
  calls: string
  charged: string
  listValue: string
  status: DailyUsageStatus
}

/** The days of a range, newest first, and what they add up to. */
export interface DailyUsageView {
  days: DailyUsageDay[]
  total: DailyUsageTotal
}
