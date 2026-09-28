/**
 * A cost, the one way every surface shows it.
 *
 * A chip says what was CHARGED, in dollars and nothing else — `$0.00` is a real
 * value for work a subscription covered. Everything else a cost knows (which
 * model ran, how its tokens were paid for, what they are worth at list price,
 * which tokens have no known price) lives in one details view, worded here once
 * so the web popover and the native sheet cannot drift. Pure: no React, no I/O.
 */

import type { BillingBasis, CliRunUsage } from 'thefactory-tools/types'
import { cliRunSpends, roundMoneyUSD } from 'thefactory-tools/utils'

import type { MessageUsageLike } from './chatTypes'
import {
  COST_BILLING_LABELS,
  COST_BILLING_UNRECORDED,
  COST_CHARGE_PENDING,
  COST_CHARGE_PENDING_SHORT,
  COST_CHARGE_UNKNOWN,
  COST_COUNTS_PENDING,
  COST_LIST_OUTPUT_NOT_REPORTED,
  COST_LIST_PARTIAL,
  COST_LIST_PENDING,
  COST_LIST_TOKENS_NOT_REPORTED,
  COST_MODEL_UNRECORDED,
  COST_NO_KNOWN_PRICE,
  COST_NOTE_AUTO,
  COST_NOTE_NO_MODELS,
  COST_NOTE_OUTPUT_NOT_REPORTED_TAIL,
  COST_NOTE_OUTPUT_PENDING_TAIL,
  COST_NOTE_OVERAGE,
  COST_NOTE_PENDING,
  COST_NOTE_TOKENS_NOT_REPORTED_TAIL,
  COST_NOTE_UNPRICED,
  COST_NOTE_UNRECORDED_BILLING,
  COST_PLAN_NAMES,
  COST_PROVIDER_NAMES,
  COST_REPORTING_TOOL_UNKNOWN,
  COST_REPORTING_TOOLS,
  COST_TOKENS_NOT_REPORTED,
  CURSOR_AUTO_MODEL,
  CURSOR_PROVIDERS,
  UNREPORTED_MODEL,
} from './costDetailsConstants'
import type {
  CliRunCostSource,
  CliRunSpendRecord,
  CostDetailsLine,
  CostDetailsRow,
  CostDetailsView,
  CostSource,
  CostSpend,
} from './costDetailsTypes'

const TOKENS = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/**
 * Dollars as a label. Sub-cent amounts keep four decimals so a `$0.0012` run
 * does not read as `$0.00` — which, now that `$0.00` means "covered by a plan",
 * would say something false.
 */
export function formatCostUSD(costUSD: number | undefined): string | undefined {
  if (costUSD == null || !Number.isFinite(costUSD) || costUSD < 0) return undefined
  if (costUSD > 0 && costUSD < 0.01) return `$${costUSD.toFixed(4)}`
  return `$${costUSD.toFixed(2)}`
}

const addOptional = (a: number | undefined, b: number | undefined): number | undefined =>
  a === undefined ? b : b === undefined ? a : a + b

const addMoney = (a: number | undefined, b: number | undefined): number | undefined => {
  const sum = addOptional(a, b)
  return sum === undefined ? undefined : roundMoneyUSD(sum)
}

/** Every token one row counts: input, output, and both cache directions. */
export const spendTokens = (s: CostSpend): number =>
  s.inputTokens + s.outputTokens + s.cacheReadTokens + s.cacheWriteTokens

const isIncluded = (billing: BillingBasis | undefined): boolean =>
  billing === 'subscription' || billing === 'free'

/** A row of turns that ran a model without the CLI reporting a single count — the tools' `tokensNotReported`. */
export const isUnreported = (s: CostSpend): boolean => s.tokensNotReported === true

/** How many turns a row the CLI reported no counts for ({@link isUnreported}) stands for. */
const unreportedTurnsOf = (s: CostSpend): number => s.unreportedTurns ?? 1

/** A row some of whose counts the CLI never reported: all of them, or its output. */
const lacksCounts = (s: CostSpend): boolean => isUnreported(s) || s.outputTokensNotReported === true

/** A row whose missing counts are still to come: its turn is still going. */
const isCountsPending = (s: CostSpend): boolean => s.countsPending === true

/**
 * Whether some of a cost's unpriced tokens have no known price. A metered row
 * cut off before its output was reported is unpriced too — its charge is
 * unknown — but a price IS known for it; when such rows are all a cost's
 * unpriced ones, saying "no known price" would name the wrong reason. A cost
 * whose rows do not account for its unpriced tokens (one kept before per-model
 * rows) has no known price for them.
 */
function lacksPrice(cost: CostSource, rows: readonly CostSpend[]): boolean {
  if (!cost.unpricedTokens) return false
  const unpriced = rows.filter(
    (s) =>
      !isIncluded(s.billing) && s.costUsd === undefined && !s.chargePending && !isUnreported(s),
  )
  return unpriced.length === 0 || unpriced.some((s) => !s.outputTokensNotReported)
}

/**
 * What a cost chip says: the charge in dollars, and never a token count. When
 * no charge is known the chip says why — still to come on a run in flight, no
 * price for its tokens, usage the CLI has not reported yet, or usage it never
 * reported — rather than a `$0.00` it never was. Undefined when nothing was
 * measured.
 */
export function costChipLabel(cost: CostSource | undefined): string | undefined {
  const charged = formatCostUSD(cost?.costUsd)
  if (charged !== undefined || !cost) return charged
  const rows = cost.byModel ?? []
  if (rows.some((s) => s.chargePending)) return COST_CHARGE_PENDING
  if (lacksPrice(cost, rows)) return COST_NO_KNOWN_PRICE
  const lacking = rows.filter(lacksCounts)
  if (lacking.length === 0) return undefined
  return lacking.every(isCountsPending) ? COST_COUNTS_PENDING : COST_TOKENS_NOT_REPORTED
}

/**
 * What makes two rows the same row — the tools' `mergeModelSpends` identity
 * (model, the name it was reported under, billing, and whether its charge and
 * list value are known), plus the states a CLI run's record can put on a row.
 * A sum of a known amount and an unknown one is neither; a turn that reported
 * no tokens, or no output, must never be read as a counted one; a charge still
 * to come is not one already settled.
 */
const spendKey = (s: CostSpend): string =>
  JSON.stringify([
    s.provider,
    s.model,
    s.label ?? null,
    s.billing ?? null,
    s.costUsd !== undefined,
    s.listCostUsd !== undefined,
    isUnreported(s),
    s.outputTokensNotReported === true,
    s.countsPending === true,
    s.chargePending === true,
  ])

/** Rows folded into one per {@link spendKey}, in the order each was first seen. */
function mergeSpends(spends: readonly CostSpend[]): CostSpend[] {
  const merged = new Map<string, CostSpend>()
  for (const s of spends) {
    const key = spendKey(s)
    const seen = merged.get(key)
    if (!seen) {
      merged.set(key, s)
      continue
    }
    const costUsd = addMoney(seen.costUsd, s.costUsd)
    const listCostUsd = addMoney(seen.listCostUsd, s.listCostUsd)
    const unreportedTurns = isUnreported(s)
      ? unreportedTurnsOf(seen) + unreportedTurnsOf(s)
      : undefined
    merged.set(key, {
      ...seen,
      inputTokens: seen.inputTokens + s.inputTokens,
      outputTokens: seen.outputTokens + s.outputTokens,
      cacheReadTokens: seen.cacheReadTokens + s.cacheReadTokens,
      cacheWriteTokens: seen.cacheWriteTokens + s.cacheWriteTokens,
      ...(costUsd !== undefined ? { costUsd } : {}),
      ...(listCostUsd !== undefined ? { listCostUsd } : {}),
      ...(unreportedTurns !== undefined ? { unreportedTurns } : {}),
    })
  }
  return [...merged.values()]
}

/**
 * What a set of per-model rows cost — read the way the tools'
 * `processEntryCostFromSpends` reads a process attempt, so a run's chip and its
 * attempt's chip agree; the parity tests hold the two alike on every row shape
 * the tools write, and this reads the states they never do (no billing, a run
 * still going) on top. The charge is the sum of the charges that are known; a
 * metered row with none is unpriced (unknown, never $0) unless its run is still
 * going; a plan or free model's tokens are included. A row that spent nothing
 * is dropped, unless its CLI simply reported nothing. Undefined with no rows.
 */
function costOfSpends(spends: readonly CostSpend[]): CostSource | undefined {
  const byModel = mergeSpends(spends.filter((s) => isUnreported(s) || spendTokens(s) > 0))
  if (byModel.length === 0) return undefined
  let costUsd: number | undefined
  let listCostUsd: number | undefined
  let included = 0
  let unpriced = 0
  for (const s of byModel) {
    costUsd = addMoney(costUsd, s.costUsd)
    listCostUsd = addMoney(listCostUsd, s.listCostUsd)
    if (isIncluded(s.billing)) included += spendTokens(s)
    else if (s.costUsd === undefined && !s.chargePending) unpriced += spendTokens(s)
  }
  return {
    ...(costUsd !== undefined ? { costUsd } : {}),
    ...(unpriced > 0 ? { unpricedTokens: unpriced } : {}),
    ...(included > 0 ? { includedTokens: included } : {}),
    ...(listCostUsd !== undefined ? { listCostUsd } : {}),
    byModel,
  }
}

const NO_TOKENS: CliRunUsage = { tokensIn: 0, tokensOut: 0 }

const isInFlight = (run: CliRunCostSource): boolean =>
  run.status === 'running' || run.status === 'awaiting-approval'

/**
 * The one row a run with no per-model rows stands for, named and priced by the
 * tools' `cliRunSpends` exactly as the runner will name it. A run that recorded
 * no billing keeps none — whether a plan covered it is not known, and the
 * details say so rather than calling it an API key's spend. A metered run still
 * going is marked pending: its runner prices it with its terminal write. Usage
 * whose output the CLI has not reported comes back from `cliRunSpends` marked
 * so — its output count is a placeholder, never a count to show — and, on a
 * run still going, reads as output still to come: a streaming Claude Code turn
 * carries the mark until the `result` line that ends it, so it is not one that
 * stopped short.
 */
function recordedSpend(run: CliRunCostSource, usage: CliRunUsage): CostSpend {
  const [spend] = cliRunSpends({ ...run, modelUsage: undefined, usage })
  const { billing, ...unbilled } = spend
  const billed: CostSpend = run.billing ? spend : unbilled
  const pending = isInFlight(run) ? { countsPending: true as const } : {}
  const row: CostSpend = billed.outputTokensNotReported ? { ...billed, ...pending } : billed
  return row.costUsd === undefined && run.billing === 'metered' && isInFlight(run)
    ? { ...row, chargePending: true }
    : row
}

/**
 * A CLI run's cost: what it was charged, and per model what it spent under the
 * billing it ran on. Read from the rows its runner stamped; a run without them
 * — one recorded before they were kept, or one still going — from its tokens
 * and billing; a turn whose CLI reported no tokens as its model and billing
 * alone — its counts pending while it is still going. The run's recorded
 * `costUSD` is never read: see {@link CliRunCostSource}. Undefined when the run
 * recorded nothing to go on.
 */
export function cliRunCost(run: CliRunCostSource): CostSource | undefined {
  if (run.modelUsage?.length) return costOfSpends(run.modelUsage)
  if (run.usage) return costOfSpends([recordedSpend(run, run.usage)])
  if (run.tokensNotReported) {
    const pending = isInFlight(run) ? { countsPending: true as const } : {}
    return costOfSpends([{ ...recordedSpend(run, NO_TOKENS), tokensNotReported: true, ...pending }])
  }
  return undefined
}

/**
 * The record a run's spend — its cost and its duration — is read from. A
 * landed review record that mirrors another run (`mirrorOf`) carries none of
 * its own: the runner stamped them on the run whose work it lands, and a copy
 * would count them twice. So its spend is that run's, found among `runs`, and
 * undefined when that run is not at hand — never the mirror's empty record,
 * which would read as a run that measured nothing. Any other run is its own.
 */
export function cliRunSpendRecord<T extends CliRunSpendRecord>(
  run: T,
  runs: readonly T[],
): T | undefined {
  if (run.mirrorOf === undefined) return run
  return runs.find((candidate) => candidate.id === run.mirrorOf)
}

/**
 * The usage a CLI run's first chat message carries, so its `$` chip and
 * details show even when the charge is $0 — a subscription's tokens still
 * count. No model is named on it: the message's `cli-agent/…` tag names the
 * CLI and model it was asked for, and the rows name what ran. A count the CLI
 * never reported is left off rather than passed on as 0 — no counts for a turn
 * that reported none, no output when no model reported its output — and the
 * rows say which. Undefined when the run recorded nothing.
 */
export function cliRunMessageUsage(run: CliRunCostSource): MessageUsageLike | undefined {
  const cost = cliRunCost(run)
  if (!cost) return undefined
  const rows = cost.byModel ?? []
  const counted = rows.filter((s) => !isUnreported(s))
  const outputCounted = counted.filter((s) => !s.outputTokensNotReported)
  const sum = (pick: (s: CostSpend) => number) => counted.reduce((n, s) => n + pick(s), 0)
  return {
    ...(counted.length > 0
      ? {
          promptTokens: sum((s) => s.inputTokens),
          ...(outputCounted.length > 0
            ? { completionTokens: outputCounted.reduce((n, s) => n + s.outputTokens, 0) }
            : {}),
          cachedReadInputTokens: sum((s) => s.cacheReadTokens),
          cacheWriteInputTokens: sum((s) => s.cacheWriteTokens),
        }
      : {}),
    ...(cost.costUsd !== undefined ? { cost: cost.costUsd } : {}),
    ...(run.billing ? { billing: run.billing } : {}),
    ...(cost.listCostUsd !== undefined ? { listCostUsd: cost.listCostUsd } : {}),
    byModel: rows,
  }
}

/**
 * A chat message's usage as a cost. A CLI turn opens by its per-model rows; an
 * API turn is one row under the billing it stored — metered when it stored
 * none, as every API turn was before billing was kept. A message that reports
 * no tokens measured nothing: a stored CLI turn's placeholder carries zeros and
 * a $0 that is no charge.
 */
export function messageUsageCost(
  usage: MessageUsageLike,
  model: string | { model?: string; provider?: string } | undefined,
): CostSource | undefined {
  if (usage.byModel?.length) return costOfSpends(usage.byModel)
  const named = typeof model === 'string' ? { model } : (model ?? {})
  const spend: CostSpend = {
    provider: named.provider ?? usage.provider ?? '',
    model: named.model ?? usage.model ?? '',
    billing: usage.billing ?? 'metered',
    inputTokens: usage.promptTokens ?? 0,
    outputTokens: usage.completionTokens ?? 0,
    cacheReadTokens: usage.cachedReadInputTokens ?? 0,
    cacheWriteTokens: usage.cacheWriteInputTokens ?? 0,
    ...(usage.cost !== undefined ? { costUsd: usage.cost } : {}),
    ...(usage.listCostUsd !== undefined ? { listCostUsd: usage.listCostUsd } : {}),
  }
  return costOfSpends([spend])
}

/**
 * Two costs as one — a sign-off section summing its runs — as the tools'
 * `sumProcessEntryCosts` sums them (held alike by the parity tests). Every
 * field is stated when either side states it; rows merge by {@link spendKey},
 * so a model used on a plan and on a key stays two rows, and so do its priced
 * and unpriced tokens.
 */
export function addCost(
  a: CostSource | undefined,
  b: CostSource | undefined,
): CostSource | undefined {
  if (!a) return b
  if (!b) return a
  const costUsd = addMoney(a.costUsd, b.costUsd)
  const unpricedTokens = addOptional(a.unpricedTokens, b.unpricedTokens)
  const includedTokens = addOptional(a.includedTokens, b.includedTokens)
  const listCostUsd = addMoney(a.listCostUsd, b.listCostUsd)
  const byModel = mergeSpends([...(a.byModel ?? []), ...(b.byModel ?? [])])
  return {
    ...(costUsd !== undefined ? { costUsd } : {}),
    ...(unpricedTokens !== undefined ? { unpricedTokens } : {}),
    ...(includedTokens !== undefined ? { includedTokens } : {}),
    ...(listCostUsd !== undefined ? { listCostUsd } : {}),
    ...(byModel.length > 0 ? { byModel } : {}),
  }
}

/**
 * The cost fields of a record that carries more — a step's totals, with its
 * work time and attempts beside them. Undefined when it measured no cost.
 */
export function pickCost(source: CostSource): CostSource | undefined {
  const { costUsd, unpricedTokens, includedTokens, listCostUsd, byModel } = source
  const cost: CostSource = {
    ...(costUsd !== undefined ? { costUsd } : {}),
    ...(unpricedTokens !== undefined ? { unpricedTokens } : {}),
    ...(includedTokens !== undefined ? { includedTokens } : {}),
    ...(listCostUsd !== undefined ? { listCostUsd } : {}),
    ...(byModel?.length ? { byModel } : {}),
  }
  return Object.keys(cost).length > 0 ? cost : undefined
}

function billingLabel(s: CostSpend): string {
  if (!s.billing) return COST_BILLING_UNRECORDED
  if (s.billing !== 'subscription') return COST_BILLING_LABELS[s.billing]
  const plan = COST_PLAN_NAMES[s.provider]
  return plan ? `Included in your ${plan} subscription` : COST_BILLING_LABELS.subscription
}

/**
 * The tool that ran a row's model and so reported — or failed to report — its
 * counts, in words (`Cursor`, `Claude Code`), named from the row's provider.
 */
export function reportingToolOf(provider: string): string {
  return COST_REPORTING_TOOLS[provider] ?? COST_REPORTING_TOOL_UNKNOWN
}

/** `Cursor`, `Cursor and Codex`, `Cursor, Codex and Claude Code`. */
function wordList(words: readonly string[]): string {
  if (words.length <= 1) return words.join('')
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

const sentenceCase = (words: string): string => words.charAt(0).toUpperCase() + words.slice(1)

/** `not reported by Cursor`, to follow a count it is missing from. */
const notReportedPhrase = (tools: readonly string[]): string =>
  `${COST_TOKENS_NOT_REPORTED.toLowerCase()} by ${wordList(tools)}`

/** Where a count a tool never reported would be — unknown, never 0: `Not reported by Cursor`. */
export function notReportedBy(tools: readonly string[]): string {
  return sentenceCase(notReportedPhrase(tools))
}

/** The tools, once each in first-seen order, that left some count out of these rows. */
function toolsLackingCounts(rows: readonly CostSpend[]): string[] {
  return [...new Set(rows.filter(lacksCounts).map((s) => reportingToolOf(s.provider)))]
}

/**
 * What these rows' counts leave out, as phrases to follow a count: the tools
 * that never reported some of theirs (`not reported by Cursor`), then — when a
 * turn still going has yet to report some — `not reported yet`.
 */
function missingCountPhrases(rows: readonly CostSpend[]): string[] {
  const unreportedBy = toolsLackingCounts(rows.filter((s) => !isCountsPending(s)))
  return [
    ...(unreportedBy.length > 0 ? [notReportedPhrase(unreportedBy)] : []),
    ...(rows.some(isCountsPending) ? [COST_COUNTS_PENDING.toLowerCase()] : []),
  ]
}

function listValue(s: CostSpend): string {
  const money = formatCostUSD(s.listCostUsd)
  if (money) return `≈ ${money} at list price`
  if (isUnreported(s)) return s.countsPending ? COST_COUNTS_PENDING : COST_LIST_TOKENS_NOT_REPORTED
  if (s.outputTokensNotReported) {
    return s.countsPending ? COST_LIST_PENDING : COST_LIST_OUTPUT_NOT_REPORTED
  }
  return s.chargePending ? COST_LIST_PENDING : COST_NO_KNOWN_PRICE
}

const chargedWords = (costUsd: number | undefined, pending: boolean): string =>
  formatCostUSD(costUsd) ?? (pending ? COST_CHARGE_PENDING_SHORT : COST_CHARGE_UNKNOWN)

function rowTokens(
  s: CostSpend,
): Pick<
  CostDetailsRow,
  'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens' | 'tokens'
> {
  const unreported = s.countsPending
    ? COST_COUNTS_PENDING
    : notReportedBy([reportingToolOf(s.provider)])
  if (isUnreported(s)) {
    return { tokens: [{ label: 'Tokens', value: unreported }] }
  }
  const outputReported = !s.outputTokensNotReported
  return {
    inputTokens: s.inputTokens,
    ...(outputReported ? { outputTokens: s.outputTokens } : {}),
    cacheReadTokens: s.cacheReadTokens,
    cacheWriteTokens: s.cacheWriteTokens,
    tokens: [
      { label: 'Input', value: TOKENS.format(s.inputTokens) },
      { label: 'Output', value: outputReported ? TOKENS.format(s.outputTokens) : unreported },
      { label: 'Cache read', value: TOKENS.format(s.cacheReadTokens) },
      { label: 'Cache write', value: TOKENS.format(s.cacheWriteTokens) },
    ],
  }
}

function detailsRow(s: CostSpend): CostDetailsRow {
  const label = s.label?.trim()
  const named = label && label !== s.model
  const model = s.model === UNREPORTED_MODEL ? '' : s.model
  return {
    key: spendKey(s),
    model: (named ? label : model) || COST_MODEL_UNRECORDED,
    ...(named && model ? { modelId: model } : {}),
    provider: COST_PROVIDER_NAMES[s.provider] ?? s.provider,
    ...(s.billing ? { billing: s.billing } : {}),
    billingLabel: billingLabel(s),
    ...rowTokens(s),
    ...(s.costUsd !== undefined ? { chargedUsd: s.costUsd } : {}),
    charged: chargedWords(s.costUsd, s.chargePending === true),
    ...(s.listCostUsd !== undefined ? { listCostUsd: s.listCostUsd } : {}),
    listValue: listValue(s),
  }
}

const isCursorAuto = (s: CostSpend): boolean =>
  CURSOR_PROVIDERS.has(s.provider) && s.model.toLowerCase() === CURSOR_AUTO_MODEL

/**
 * One note per tool for the turns it reported no counts for, saying how many
 * when a sum holds several — so a Cursor resident turn reads "Cursor did not
 * report token counts for this turn". Turns still going get their own note:
 * their counts have not come YET, which is not a failure to report them.
 */
function unreportedTurnNotes(rows: readonly CostSpend[]): string[] {
  const turns = new Map<string, { tool: string; pending: boolean; count: number }>()
  for (const s of rows) {
    if (!isUnreported(s)) continue
    const tool = reportingToolOf(s.provider)
    const pending = s.countsPending === true
    const key = JSON.stringify([tool, pending])
    const seen = turns.get(key) ?? { tool, pending, count: 0 }
    turns.set(key, { ...seen, count: seen.count + unreportedTurnsOf(s) })
  }
  return [...turns.values()].map(({ tool, pending, count }) => {
    const which = count === 1 ? 'this turn' : `${count} turns`
    return pending
      ? `${sentenceCase(tool)} has not reported token counts for ${which} yet.`
      : `${sentenceCase(tool)} did not report token counts for ${which}${COST_NOTE_TOKENS_NOT_REPORTED_TAIL}`
  })
}

/**
 * One note per tool for the turns whose output it left out: cut off before
 * reporting it, then — separately — still going, their output still to come.
 */
function unreportedOutputNotes(rows: readonly CostSpend[]): string[] {
  const noted = (pending: boolean, tail: string) =>
    [
      ...new Set(
        rows
          .filter((s) => s.outputTokensNotReported && isCountsPending(s) === pending)
          .map((s) => reportingToolOf(s.provider)),
      ),
    ].map((tool) => `${sentenceCase(tool)}${tail}`)
  return [
    ...noted(false, COST_NOTE_OUTPUT_NOT_REPORTED_TAIL),
    ...noted(true, COST_NOTE_OUTPUT_PENDING_TAIL),
  ]
}

function detailsNotes(cost: CostSource, rows: CostSpend[]): string[] {
  const notes: string[] = []
  if (rows.some(isCursorAuto)) notes.push(COST_NOTE_AUTO)
  if (rows.some((s) => s.billing === 'subscription')) notes.push(COST_NOTE_OVERAGE)
  if (rows.some((s) => s.chargePending)) notes.push(COST_NOTE_PENDING)
  if (lacksPrice(cost, rows)) notes.push(COST_NOTE_UNPRICED)
  notes.push(...unreportedTurnNotes(rows), ...unreportedOutputNotes(rows))
  if (rows.some((s) => !s.billing)) notes.push(COST_NOTE_UNRECORDED_BILLING)
  if (rows.length === 0) notes.push(COST_NOTE_NO_MODELS)
  return notes
}

/**
 * Whether a cost's list value covers only part of its tokens: some row beside
 * it has none — no price, or a count the CLI never reported — or, on a cost
 * kept before per-model rows, some of its tokens had no price.
 */
export function isListPartial(cost: CostSource, rows: readonly CostSpend[]): boolean {
  if (rows.length === 0) return (cost.unpricedTokens ?? 0) > 0
  return rows.some((s) => s.listCostUsd === undefined)
}

/**
 * The total a cost's rows counted — naming, beside it or in its place, any tool
 * that left counts out and any counts a turn still going has yet to report:
 * `14,701 + not reported by Cursor`, `41,932 + not reported yet`. When nothing
 * of it was counted the phrases stand in its place, never a 0 it never was.
 */
function totalTokensWords(total: number, rows: readonly CostSpend[]): string {
  if (rows.every((s) => isUnreported(s) && s.countsPending)) return COST_COUNTS_PENDING
  const missing = missingCountPhrases(rows)
  if (rows.every(isUnreported)) return sentenceCase(missing.join(' + '))
  return [TOKENS.format(total), ...missing].join(' + ')
}

/**
 * Everything a cost's details show, worded for both clients: the charge, the
 * tokens a plan covered, the tokens with no known price, what it all comes to
 * at list price, a row per model with how it was paid for, and what the record
 * cannot say. Rows the record repeated are listed once, so each has its own
 * key. Undefined when nothing was measured.
 */
export function costDetailsView(cost: CostSource | undefined): CostDetailsView | undefined {
  const charged = costChipLabel(cost)
  const rows = mergeSpends(cost?.byModel ?? [])
  if (!cost || (charged === undefined && rows.length === 0)) return undefined
  const includedTokens = cost.includedTokens ?? 0
  const unpricedTokens = cost.unpricedTokens ?? 0
  const counted = rows.filter((s) => !isUnreported(s))
  const totalTokens =
    rows.length > 0
      ? counted.reduce((n, s) => n + spendTokens(s), 0)
      : includedTokens + unpricedTokens
  const pending = rows.some((s) => s.chargePending)
  const summary: CostDetailsLine[] = [
    { label: 'Charged', value: chargedWords(cost.costUsd, pending) },
  ]
  if (includedTokens > 0) {
    summary.push({ label: 'Included tokens', value: TOKENS.format(includedTokens) })
  }
  if (unpricedTokens > 0) {
    summary.push({ label: 'Unpriced tokens', value: TOKENS.format(unpricedTokens) })
  }
  const list = formatCostUSD(cost.listCostUsd)
  if (list) {
    const partial = isListPartial(cost, rows)
    summary.push({
      label: 'At list price',
      value: partial ? `≈ ${list} ${COST_LIST_PARTIAL}` : `≈ ${list}`,
    })
  }
  if (rows.length > 0)
    summary.push({ label: 'Total tokens', value: totalTokensWords(totalTokens, rows) })
  return {
    ...(cost.costUsd !== undefined ? { chargedUsd: cost.costUsd } : {}),
    charged: charged ?? COST_CHARGE_UNKNOWN,
    totalTokens,
    includedTokens,
    unpricedTokens,
    ...(cost.listCostUsd !== undefined ? { listCostUsd: cost.listCostUsd } : {}),
    summary,
    rows: rows.map(detailsRow),
    notes: detailsNotes(cost, rows),
  }
}
