/**
 * The usage modal's tables, worded once for web and native.
 *
 * Every row keeps three kinds of token apart: tokens that were CHARGED, tokens a
 * subscription or free model INCLUDED (counted, not charged), and metered tokens
 * with no known price (UNPRICED — unknown, never $0). A count a CLI never
 * reported is named as such beside the counted ones — never added as 0 — and a
 * list value that covers only part of a row says so. Pure: the hook feeds it
 * the ledger aggregate, the messages on screen and their models' prices.
 */

import type { BillingBasis } from 'thefactory-tools/types'
import { estimateCostFromUsage, roundMoneyUSD } from 'thefactory-tools/utils'

import {
  isListPartial,
  isUnreported,
  messageUsageCost,
  notReportedBy,
  reportingToolOf,
  spendTokens,
} from './costDetails'
import {
  COST_MODEL_UNRECORDED,
  COST_PROVIDER_NAMES,
  COST_TOKENS_NOT_REPORTED,
} from './costDetailsConstants'
import type { CostSpend } from './costDetailsTypes'
import {
  USAGE_COUNT_PARTIAL,
  USAGE_LEDGER_UNAVAILABLE,
  USAGE_LIST_PARTIAL,
} from './usageBreakdownConstants'
import type {
  UsageModalCostAggregate,
  UsageModalCostBreakdown,
  UsageModalMessage,
  UsageModalModelPrice,
  UsageModalUsage,
  UsageTableRow,
} from './usageBreakdownTypes'

const COUNT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const NONE = '—'

const usd = (n: number) => `$${n.toFixed(4)}`

/** One group's sums, before they are worded. */
type UsageSums = {
  charged: number
  estimated: boolean
  prompt: number
  completion: number
  cachedRead: number
  cacheWrite: number
  included: number
  unpriced: number
  list: number | undefined
  /** Some of these tokens have no list value — no price, or counts a CLI never reported. */
  listPartial: boolean
  /** The tools that reported no counts at all for a turn here: every count is missing their share. */
  unreportedBy: Set<string>
  /** The tools that never reported a turn's output here. */
  outputUnreportedBy: Set<string>
  /** Of those tools, the ones whose unreported turns a plan or a free model covered … */
  includedUnreportedBy: Set<string>
  /** … and the ones whose unreported turns were metered: an unknown charge, never $0. */
  unpricedUnreportedBy: Set<string>
}

const emptySums = (): UsageSums => ({
  charged: 0,
  estimated: false,
  prompt: 0,
  completion: 0,
  cachedRead: 0,
  cacheWrite: 0,
  included: 0,
  unpriced: 0,
  list: undefined,
  listPartial: false,
  unreportedBy: new Set(),
  outputUnreportedBy: new Set(),
  includedUnreportedBy: new Set(),
  unpricedUnreportedBy: new Set(),
})

const totalTokens = (s: UsageSums) => s.prompt + s.completion + s.cachedRead + s.cacheWrite

/** Tokens a plan or a free model covered: counted, charged nothing. */
const isIncluded = (billing: UsageModalUsage['billing']) =>
  billing === 'subscription' || billing === 'free'

/**
 * The charged cell. A group whose every token is unpriced — or whose only
 * uncovered turns reported no counts — was charged an unknown amount, so it
 * reads `—` rather than a `$0` it never was.
 */
function chargedCell(s: UsageSums): string {
  const unknown = s.unpriced > 0 || s.unpricedUnreportedBy.size > 0
  if (s.charged === 0 && unknown && s.included === 0) return NONE
  return s.estimated ? `≈ ${usd(s.charged)}` : usd(s.charged)
}

/**
 * A count cell: the count — marked when a tool left its share out, and
 * `Not reported` rather than a 0 when nothing of it was counted. The tools are
 * named once, on the row ({@link UsageTableRow.notReportedBy}), so a narrow
 * cell never repeats them.
 */
function countCell(n: number, unreportedBy: ReadonlySet<string>): string {
  if (unreportedBy.size === 0) return COUNT.format(n)
  return n > 0 ? `${COUNT.format(n)} ${USAGE_COUNT_PARTIAL}` : COST_TOKENS_NOT_REPORTED
}

const union = (...sets: ReadonlySet<string>[]): Set<string> =>
  new Set(sets.flatMap((set) => [...set]))

function listValueCell(s: UsageSums): string {
  if (s.list === undefined) return NONE
  return s.listPartial ? `${usd(s.list)} ${USAGE_LIST_PARTIAL}` : usd(s.list)
}

function tableRow(key: string, label: string, s: UsageSums, total = false): UsageTableRow {
  const input = s.prompt + s.cachedRead
  const withOutput = union(s.unreportedBy, s.outputUnreportedBy)
  return {
    notReportedBy: withOutput.size > 0 ? notReportedBy([...withOutput]) : '',
    key,
    label,
    total,
    charged: chargedCell(s),
    tokens: countCell(totalTokens(s), withOutput),
    prompt: countCell(s.prompt, s.unreportedBy),
    completion: countCell(s.completion, withOutput),
    cachedRead: countCell(s.cachedRead, s.unreportedBy),
    cacheRatio: input > 0 ? `(${Math.round((s.cachedRead / input) * 100)}%)` : '',
    cacheWrite: countCell(s.cacheWrite, s.unreportedBy),
    included: countCell(s.included, s.includedUnreportedBy),
    unpriced: countCell(s.unpriced, s.unpricedUnreportedBy),
    listValue: listValueCell(s),
  }
}

const byChargedThenTokens = (a: [string, UsageSums], b: [string, UsageSums]) =>
  b[1].charged - a[1].charged || totalTokens(b[1]) - totalTokens(a[1])

/**
 * Note the tool behind a ledger row's calls that reported no counts, or no
 * output — covered or metered by the row's billing. An executor's row sums
 * every basis, so its tool is named on the token counts alone.
 */
function addUnreportedCalls(s: UsageSums, b: UsageModalCostBreakdown) {
  const tool = reportingToolOf(b.provider ?? '')
  const gaps = [
    [b.tokensNotReported === true, s.unreportedBy],
    [b.outputTokensNotReported === true, s.outputUnreportedBy],
  ] as const
  for (const [missing, into] of gaps) {
    if (!missing) continue
    into.add(tool)
    if (b.billing)
      (isIncluded(b.billing) ? s.includedUnreportedBy : s.unpricedUnreportedBy).add(tool)
  }
}

/**
 * A ledger row's sums. Its list value covers only part of it when some of its
 * tokens have none — unlisted (the ledger counts a call's unreported output
 * there), unpriced, or a call that reported no counts at all.
 */
function breakdownSums(b: UsageModalCostBreakdown): UsageSums {
  const s: UsageSums = {
    ...emptySums(),
    charged: b.costUSD,
    prompt: b.promptTokens,
    completion: b.completionTokens,
    cachedRead: b.cachedReadInputTokens,
    cacheWrite: b.cacheWriteInputTokens ?? 0,
    included: b.includedTokens ?? 0,
    unpriced: b.unpricedTokens ?? 0,
    list: b.listCostUSD,
    listPartial:
      (b.unlistedTokens ?? 0) > 0 || (b.unpricedTokens ?? 0) > 0 || b.tokensNotReported === true,
  }
  addUnreportedCalls(s, b)
  return s
}

/** A provider in words, as the cost details name it (`Cursor`, `OpenAI`). */
const providerName = (provider: string) => COST_PROVIDER_NAMES[provider] ?? provider

/**
 * A model's row label in every usage table, named the way the cost details
 * name it: the provider, the tool's name for the model, and the billing when it
 * is not metered — so one model on a plan and on a key reads as two rows.
 */
function modelGroupLabel(
  provider: string,
  name: string,
  billing: BillingBasis | undefined,
): string {
  const basis = billing && billing !== 'metered' ? ` (${billing})` : ''
  return `${providerName(provider)} · ${name}${basis}`
}

/**
 * A ledger row as a label, named by its fields ({@link modelGroupLabel}). A
 * row persisted before its model was kept is named by its key, split on the
 * FIRST colon: model ids carry their own.
 */
function breakdownLabel(key: string, b: UsageModalCostBreakdown): string {
  if (b.provider && b.model) return modelGroupLabel(b.provider, b.label ?? b.model, b.billing)
  const at = key.indexOf(':')
  if (at <= 0 || at === key.length - 1) return key
  return `${providerName(key.slice(0, at))} · ${key.slice(at + 1)}`
}

/** The durable ledger as a table: TOTALS, then one row per model, most charged first. */
export function ledgerUsageRows(agg: UsageModalCostAggregate): UsageTableRow[] {
  const totals: UsageSums = {
    ...emptySums(),
    charged: agg.totalCostUSD,
    prompt: agg.totalPromptTokens,
    completion: agg.totalCompletionTokens,
    cachedRead: agg.totalCachedReadInputTokens,
    cacheWrite: agg.totalCacheWriteInputTokens ?? 0,
    included: agg.totalIncludedTokens ?? 0,
    unpriced: agg.totalUnpricedTokens ?? 0,
    list: agg.totalListCostUSD,
    listPartial: (agg.totalUnlistedTokens ?? 0) > 0 || (agg.totalUnpricedTokens ?? 0) > 0,
  }
  for (const b of Object.values(agg.breakdown)) addUnreportedCalls(totals, b)
  const rows = Object.entries(agg.breakdown)
    .map(([key, b]): [string, UsageSums] => [key, breakdownSums(b)])
    .sort(byChargedThenTokens)
    .map(([key, s]) => tableRow(`ledger:${key}`, breakdownLabel(key, agg.breakdown[key]), s))
  return [tableRow('ledger:TOTALS', 'TOTALS', totals, true), ...rows]
}

/** The ledger table's one row when the ledger could not be read. */
export function unavailableLedgerRows(): UsageTableRow[] {
  return [tableRow('ledger:TOTALS', USAGE_LEDGER_UNAVAILABLE, emptySums(), true)]
}

/** The durable ledger split by executor, API then CLI; undefined when it carries no split. */
export function sourceUsageRows(agg: UsageModalCostAggregate): UsageTableRow[] | undefined {
  const rows = (['api', 'cli'] as const).flatMap((source) => {
    const b = agg.bySource?.[source]
    return b
      ? [tableRow(`source:${source}`, source === 'api' ? 'API' : 'CLI', breakdownSums(b))]
      : []
  })
  return rows.length > 0 ? rows : undefined
}

/** The key a message's model is priced under. */
const priceKey = (provider: string, model: string) => `${provider}::${model}`

type UsedMessage = UsageModalMessage & { usage: UsageModalUsage }

const usageTokens = (u: UsageModalUsage) =>
  (u.promptTokens ?? 0) +
  (u.completionTokens ?? 0) +
  (u.cachedReadInputTokens ?? 0) +
  (u.cacheWriteInputTokens ?? 0)

/** A CLI turn's per-model rows: each model it ran, under the billing it ran on. None on an API turn. */
const rowsOf = (u: UsageModalUsage): readonly CostSpend[] => u.byModel ?? []

/** Whether a row's CLI left some of its counts out: all of them, or its output. */
const lacksCounts = (row: CostSpend) => isUnreported(row) || row.outputTokensNotReported === true

/** A row that measured something: tokens it counted, or a turn its CLI ran and reported none for. */
const isMeasured = (row: CostSpend) => isUnreported(row) || spendTokens(row) > 0

/**
 * An assistant turn that measured something — read as the message's own `$`
 * chip reads it (`messageUsageCost`): a turn that reports tokens, or one whose
 * CLI ran and reported none. A CLI turn stored before its per-model rows were
 * kept carries a zero placeholder and a $0 that is no charge, so it is left out.
 */
const isUsed = (m: UsageModalMessage): m is UsedMessage =>
  m.role === 'assistant' &&
  !!m.usage &&
  (usageTokens(m.usage) > 0 || rowsOf(m.usage).some(lacksCounts))

/** The model an API turn ran on: the message's, else the one an older turn kept on its usage. */
function modelOf(m: UsedMessage): { provider: string; model: string } | undefined {
  if (m.model) return m.model
  const { provider, model } = m.usage
  return provider && model ? { provider, model } : undefined
}

/**
 * The models the API turns on screen ran on, once each — what the modal fetches
 * prices for. A CLI turn needs none: its rows state their own charges and list
 * values, and its message names the CLI's internal tag, which no price matches.
 */
export function usagePriceKeys(
  messages: readonly UsageModalMessage[],
): Array<{ key: string; provider: string; model: string }> {
  const seen = new Map<string, { key: string; provider: string; model: string }>()
  for (const m of messages) {
    if (!isUsed(m) || rowsOf(m.usage).length > 0) continue
    const model = modelOf(m)
    if (!model) continue
    const key = priceKey(model.provider, model.model)
    seen.set(key, { key, provider: model.provider, model: model.model })
  }
  return [...seen.values()]
}

/** Add a turn's list value — or, when it has none, mark the sum as covering only part of its tokens. */
function addListValue(s: UsageSums, value: number | undefined) {
  if (value === undefined) s.listPartial = true
  else s.list = roundMoneyUSD((s.list ?? 0) + value)
}

/**
 * Note the tool that left some of a row's counts out — all of them, or its
 * output — and whether its turn was covered or metered.
 */
function addUnreported(s: UsageSums, row: CostSpend) {
  if (!lacksCounts(row)) return
  const tool = reportingToolOf(row.provider)
  ;(isUnreported(row) ? s.unreportedBy : s.outputUnreportedBy).add(tool)
  ;(isIncluded(row.billing) ? s.includedUnreportedBy : s.unpricedUnreportedBy).add(tool)
}

/**
 * Fold one of a CLI turn's per-model rows into its model's sums: the counts it
 * holds, the tool that left some out — so a count reads as only part, never as
 * the whole (a turn that reported none holds zeros; one cut off before its
 * output holds the output its earlier attempts reported) — and its charge,
 * included and unpriced tokens and list value, read as the turn's `$` chip
 * reads them (`messageUsageCost`). The message's own `cost` and `listCostUsd`
 * are not read: they are stated only when every row states one, so a turn with
 * one priced row and one unpriced would read as wholly unpriced while its chip
 * shows the known charge.
 */
function addSpend(s: UsageSums, row: CostSpend) {
  s.prompt += row.inputTokens
  s.completion += row.outputTokens
  s.cachedRead += row.cacheReadTokens
  s.cacheWrite += row.cacheWriteTokens
  addUnreported(s, row)
  const cost = messageUsageCost({ byModel: [row] }, undefined)
  if (!cost) return
  s.charged = roundMoneyUSD(s.charged + (cost.costUsd ?? 0))
  s.included += cost.includedTokens ?? 0
  s.unpriced += cost.unpricedTokens ?? 0
  if (cost.listCostUsd !== undefined) addListValue(s, cost.listCostUsd)
  if (isListPartial(cost, cost.byModel ?? [])) s.listPartial = true
}

/**
 * Fold an API turn into its model's sums. A stored charge is what was charged.
 * Without one, a subscription or free turn was charged nothing; a metered turn
 * is estimated from its model's current price, and with no price its tokens are
 * unpriced — never an estimated $0.
 */
function addMessage(s: UsageSums, usage: UsageModalUsage, price: UsageModalModelPrice | undefined) {
  const tokens = {
    promptTokens: usage.promptTokens ?? 0,
    completionTokens: usage.completionTokens ?? 0,
    cachedReadInputTokens: usage.cachedReadInputTokens ?? 0,
    cacheWriteInputTokens: usage.cacheWriteInputTokens ?? 0,
  }
  s.prompt += tokens.promptTokens
  s.completion += tokens.completionTokens
  s.cachedRead += tokens.cachedReadInputTokens
  s.cacheWrite += tokens.cacheWriteInputTokens
  const count =
    tokens.promptTokens +
    tokens.completionTokens +
    tokens.cachedReadInputTokens +
    tokens.cacheWriteInputTokens
  const estimate = price ? estimateCostFromUsage(price, tokens) : undefined
  const included = isIncluded(usage.billing)
  if (included) s.included += count
  if (typeof usage.cost === 'number') {
    s.charged = roundMoneyUSD(s.charged + usage.cost)
    addListValue(s, usage.listCostUsd ?? (included ? estimate : usage.cost))
    return
  }
  if (included) {
    addListValue(s, usage.listCostUsd ?? estimate)
    return
  }
  if (estimate === undefined) {
    s.unpriced += count
    addListValue(s, undefined)
    return
  }
  s.charged = roundMoneyUSD(s.charged + estimate)
  s.estimated = true
  addListValue(s, estimate)
}

function addSums(into: UsageSums, s: UsageSums) {
  into.charged = roundMoneyUSD(into.charged + s.charged)
  into.estimated ||= s.estimated
  into.prompt += s.prompt
  into.completion += s.completion
  into.cachedRead += s.cachedRead
  into.cacheWrite += s.cacheWrite
  into.included += s.included
  into.unpriced += s.unpriced
  if (s.list !== undefined) into.list = roundMoneyUSD((into.list ?? 0) + s.list)
  into.listPartial ||= s.listPartial
  for (const [to, from] of [
    [into.unreportedBy, s.unreportedBy],
    [into.outputUnreportedBy, s.outputUnreportedBy],
    [into.includedUnreportedBy, s.includedUnreportedBy],
    [into.unpricedUnreportedBy, s.unpricedUnreportedBy],
  ] as const) {
    for (const tool of from) to.add(tool)
  }
}

/**
 * The messages on screen as a table: TOTALS, then one row per model when more
 * than one ran, each named as the ledger names it ({@link modelGroupLabel}). A
 * CLI turn counts under every model its rows say ran — never under the
 * `cli-agent/<cli>/<model>` tag its message carries, which names the CLI and
 * what it was asked for. An API turn counts under its message's model, and a
 * turn that names none under that, its tokens unpriced unless it stored a
 * charge. Empty when no message measured anything.
 */
export function currentUsageRows(
  messages: readonly UsageModalMessage[],
  prices: Readonly<Record<string, UsageModalModelPrice | undefined>>,
): UsageTableRow[] {
  const byModel = new Map<string, UsageSums>()
  const sumsOf = (label: string): UsageSums => {
    const seen = byModel.get(label)
    if (seen) return seen
    const sums = emptySums()
    byModel.set(label, sums)
    return sums
  }
  for (const m of messages) {
    if (!isUsed(m)) continue
    const rows = rowsOf(m.usage)
    if (rows.length > 0) {
      for (const row of rows.filter(isMeasured)) {
        addSpend(sumsOf(modelGroupLabel(row.provider, row.label ?? row.model, row.billing)), row)
      }
      continue
    }
    const model = modelOf(m)
    const label = model
      ? modelGroupLabel(model.provider, model.model, m.usage.billing)
      : COST_MODEL_UNRECORDED
    addMessage(
      sumsOf(label),
      m.usage,
      model ? prices[priceKey(model.provider, model.model)] : undefined,
    )
  }
  if (byModel.size === 0) return []
  const totals = emptySums()
  for (const s of byModel.values()) addSums(totals, s)
  const head = tableRow('current:TOTALS', 'TOTALS', totals, true)
  if (byModel.size === 1) return [head]
  const rows = [...byModel.entries()]
    .sort(byChargedThenTokens)
    .map(([label, s]) => tableRow(`current:${label}`, label, s))
  return [head, ...rows]
}
