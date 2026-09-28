import type { BillingBasis } from 'thefactory-tools/types'

import type { MessageUsageLike } from './chatTypes'

/** A model's price, as the `/pricing` snapshot holds it. */
export type UsageModalModelPrice = {
  provider: string
  model: string
  inputPerMTokensUSD: number
  outputPerMTokensUSD: number
  cacheReadInputPerMTokensUSD?: number
  cacheWriteInputPerMTokensUSD?: number
  currency?: 'USD'
}

/** One group of the durable cost ledger — a model, or an executor. */
export type UsageModalCostBreakdown = {
  /**
   * The model a `breakdown` row sums, read off its fields rather than parsed
   * from its key. Absent on `bySource` rows and on rows persisted before it
   * was kept.
   */
  provider?: string
  model?: string
  /** What the tool called the model, when it differs from `model`. */
  label?: string
  /** How the row's calls were paid for; absent on rows kept before billing was, which were metered. */
  billing?: BillingBasis
  /** What was charged. Metered tokens with no known price are in `unpricedTokens`, never here as $0. */
  costUSD: number
  promptTokens: number
  completionTokens: number
  cachedReadInputTokens: number
  cacheWriteInputTokens?: number
  count?: number
  unpricedTokens?: number
  /** Tokens a subscription or a free model covered — counted, charged nothing. */
  includedTokens?: number
  listCostUSD?: number
  /** Counted tokens with no list value — `listCostUSD` leaves them out. */
  unlistedTokens?: number
  /** Some call here never reported its output: `completionTokens` falls short. */
  outputTokensNotReported?: boolean
  /** Some call here reported no counts at all: it is in `count`, in none of the token figures. */
  tokensNotReported?: boolean
}

/** The durable cost ledger for one chat key, as the costs endpoint returns it. */
export type UsageModalCostAggregate = {
  chatKey: string
  totalCostUSD: number
  totalPromptTokens: number
  totalCompletionTokens: number
  totalCachedReadInputTokens: number
  totalCacheWriteInputTokens?: number
  totalUnpricedTokens?: number
  totalIncludedTokens?: number
  totalListCostUSD?: number
  /** Counted tokens with no list value — `totalListCostUSD` leaves them out. */
  totalUnlistedTokens?: number
  breakdown: Record<string, UsageModalCostBreakdown>
  /** Optional per-executor split (API in-process vs sandboxed CLI agent). */
  bySource?: Partial<Record<'api' | 'cli', UsageModalCostBreakdown>>
}

/**
 * A turn's usage. A CLI turn's per-model rows are read for its charge, its
 * included and unpriced tokens and its list value — the turn's own `cost` and
 * `listCostUsd` are stated only when every row states one — and for the counts
 * the CLI never reported (a turn that reported none, or no output), so they
 * are named, not summed as 0.
 */
export type UsageModalUsage = Pick<
  MessageUsageLike,
  | 'promptTokens'
  | 'completionTokens'
  | 'cachedReadInputTokens'
  | 'cacheWriteInputTokens'
  | 'cost'
  | 'billing'
  | 'listCostUsd'
  | 'provider'
  | 'model'
  | 'byModel'
>

export type UsageModalMessage = {
  role: string
  /** The model the turn ran on — kept on its usage instead by older API turns. */
  model?: { provider: string; model: string }
  usage?: UsageModalUsage
}

/** One row of a usage table, every cell already worded — web and native only lay it out. */
export interface UsageTableRow {
  key: string
  label: string
  /** The TOTALS row, drawn emphasized. */
  total: boolean
  /**
   * The CLIs that left some of this row's counts out — `Not reported by
   * Cursor` — shown under its label; empty when every count was reported.
   */
  notReportedBy: string
  /** What was charged; `≈`-prefixed when part of it is estimated from current prices. */
  charged: string
  /** Each count cell is marked when a CLI left part of it out: `14,701 + not reported`, or `Not reported`. */
  tokens: string
  prompt: string
  completion: string
  cachedRead: string
  /** Cached reads as a share of all input counted, `(42%)`; empty when no input was counted. */
  cacheRatio: string
  cacheWrite: string
  included: string
  unpriced: string
  /** The known part of the tokens' value at list prices — marked when it is only part — or `—`. */
  listValue: string
}

/** The usage modal's three tables; a table is absent when there is nothing for it. */
export interface UsageBreakdown {
  /** The durable ledger per model, TOTALS first. `undefined` until it loads, or with no chat key. */
  ledger?: UsageTableRow[]
  /** The durable ledger per executor (API / CLI). */
  sources?: UsageTableRow[]
  /** The messages on screen per model, TOTALS first. */
  current?: UsageTableRow[]
}
