import type { BillingBasis, CliRun, ModelSpend, ProcessEntryCost } from 'thefactory-tools/types'

/**
 * One model's spend as a cost's details read it.
 *
 * `billing` may be absent: CLI runs recorded before billing was kept carry
 * tokens but no word on whether they were included in a plan. The details say
 * so rather than guess.
 */
export type CostSpend = Omit<ModelSpend, 'billing'> & {
  billing?: BillingBasis
  /**
   * How many turns a `tokensNotReported` row stands for once the details have
   * summed rows (absent: one), so a sum can say how many turns it lacks counts
   * for. A row the tools summed before it arrived counts as one.
   */
  unreportedTurns?: number
  /**
   * A row whose turn is still going, so the counts it lacks are still to come:
   * all of them (`tokensNotReported`), or its output (`outputTokensNotReported`
   * — a streaming Claude Code turn states its output only in the `result` line
   * that ends it). Said as pending, not as counts the CLI failed to report.
   */
  countsPending?: true
  /**
   * A metered run still in flight: the runner prices its tokens with its
   * terminal write, so until then the charge is still to come, not unknown.
   */
  chargePending?: true
}

/**
 * A cost a chip can open: a pipeline ledger cost ({@link ProcessEntryCost}),
 * or one derived from a CLI run or a chat message's usage. One shape so every
 * surface opens the same details view.
 */
export type CostSource = Omit<ProcessEntryCost, 'byModel'> & { byModel?: CostSpend[] }

/**
 * The CLI-run fields a cost is read from. Structural, so both the tools
 * `CliRun` and the API's generated one fit without a cast: both state the mark
 * a turn reported no tokens as `true`, and it is handed on to the tools'
 * `cliRunSpends` as that.
 *
 * `costUSD` is left out on purpose: before billing was kept it held Claude
 * Code's list-price estimate on a subscription and Cursor's "no price found"
 * $0, so a cost is read from the per-model rows and the billing instead.
 */
export type CliRunCostSource = Partial<
  Pick<
    CliRun,
    | 'cli'
    | 'status'
    | 'usage'
    | 'modelUsage'
    | 'billing'
    | 'reportedModel'
    | 'modelId'
    | 'tokensNotReported'
  >
>

/**
 * A CLI-run record as the record its spend is read from is found: its id and,
 * on a landed review record, the id of the run whose work it lands.
 */
export type CliRunSpendRecord = Pick<CliRun, 'id'> & Partial<Pick<CliRun, 'mirrorOf'>>

/** One `label: value` line of the details. */
export interface CostDetailsLine {
  label: string
  value: string
}

/** One model under one billing basis, as the details list it. */
export interface CostDetailsRow {
  key: string
  /** The name the tool used (Cursor's `Composer 2.5`), else the priced id. */
  model: string
  /** The priced catalogue id, when the tool's name for the model differs from it. */
  modelId?: string
  /** Who serves or bills the model, in words (`Cursor`, `Anthropic`). */
  provider: string
  billing?: BillingBasis
  /** How these tokens are paid for, in words. */
  billingLabel: string
  /** The counts, absent when the CLI reported none — `outputTokens` alone when only the output went unreported. */
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  /**
   * Input, output, cache read and cache write, formatted — a count the CLI
   * never reported reads `Not reported by <tool>`, and a turn that reported
   * none is one such line.
   */
  tokens: CostDetailsLine[]
  chargedUsd?: number
  /** What was charged: `Unknown` for metered tokens with no known price, `Pending` mid-run. */
  charged: string
  listCostUsd?: number
  /** `≈ $X at list price`, `No known price`, `Priced when the run ends`, or why the tokens' value is unknown. */
  listValue: string
}

/** Everything a cost's details view shows, worded once for web and native. */
export interface CostDetailsView {
  chargedUsd?: number
  /** What was charged — exactly what the chip says. */
  charged: string
  /** Every token counted; a count the CLI never reported adds nothing here. */
  totalTokens: number
  /** Tokens included in a subscription or on a free model: counted, not charged. */
  includedTokens: number
  /** Metered tokens with no known price: their cost is unknown, not $0. */
  unpricedTokens: number
  listCostUsd?: number
  /**
   * The head of the details: charged, included, unpriced, list value, total
   * tokens. A list value that covers only the tokens with a known price says
   * so, and a total missing counts a tool never reported names that tool.
   */
  summary: CostDetailsLine[]
  rows: CostDetailsRow[]
  /** What the numbers cannot say, said plainly. */
  notes: string[]
}
