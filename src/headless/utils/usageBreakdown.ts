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

import type {
  BillingBasis,
  ChargeStatus,
  UsageCompletenessReason,
  UsageTokenFields,
} from 'thefactory-tools/types'
import {
  estimateCostFromUsage,
  roundMoneyUSD,
  usageCompletenessReasons,
} from 'thefactory-tools/utils'

import {
  isListPartial,
  isUnreported,
  messageUsageCost,
  notReportedBy,
  reportingToolOf,
  sentenceCase,
  spendTokens,
  wordList,
} from './costDetails'
import {
  COST_CHARGE_UNKNOWN_CHIP,
  COST_MODEL_UNRECORDED,
  COST_PLAN_NAMES,
  COST_PROVIDER_NAMES,
  COST_TOKENS_NOT_REPORTED,
} from './costDetailsConstants'
import type { CostSpend } from './costDetailsTypes'
import {
  USAGE_CHARGE_CONFIRMED,
  USAGE_CHARGE_IN_PLAN,
  USAGE_CHARGE_PART_UNKNOWN,
  USAGE_CHARGE_UNKNOWN,
  USAGE_COUNT_PARTIAL,
  USAGE_INCOMPLETE_REASON_LABELS,
  USAGE_INCOMPLETE_SEPARATOR,
  USAGE_LEDGER_UNAVAILABLE,
  USAGE_LIST_PARTIAL,
  USAGE_REASON_NO_PRICE,
  USAGE_REASON_PLAN,
  USAGE_REASON_SEPARATOR,
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
  /** The tools that left one count of a turn here unavailable, per count. */
  fieldUnreportedBy: Record<'input' | 'cacheRead' | 'cacheWrite', Set<string>>
  /** How sure each call's charge here is. */
  charges: Set<ChargeStatus>
  /** Why the counts here fall short. */
  reasons: Set<UsageCompletenessReason>
  /**
   * The plans some tokens here were a plan's, by name — `''` for one the record
   * names no provider of. Their charge is unknown: a plan can bill overage.
   */
  plans: Set<string>
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
  fieldUnreportedBy: { input: new Set(), cacheRead: new Set(), cacheWrite: new Set() },
  charges: new Set(),
  reasons: new Set(),
  plans: new Set(),
})

const totalTokens = (s: UsageSums) => s.prompt + s.completion + s.cachedRead + s.cacheWrite

/** Tokens a plan or a free model covered: counted, charged nothing. */
const isIncluded = (billing: UsageModalUsage['billing']) =>
  billing === 'subscription' || billing === 'free'

/** Note that some of a group's tokens ran on the plan `provider`'s login draws on. */
const addPlan = (s: UsageSums, provider: string | undefined) =>
  s.plans.add(COST_PLAN_NAMES[provider ?? ''] ?? '')

/**
 * Whether a group's charge is unknown in whole or part, as its cell says it:
 * a plan's share (a plan can bill overage), or — with nothing charged or
 * included beside them — tokens with no known price or turns whose CLI
 * reported no counts. Beside a charge, unpriced tokens leave the charge as it
 * is, as a cost chip does.
 */
function chargeUnknown(s: UsageSums): boolean {
  if (s.plans.size > 0) return true
  const unknown = s.unpriced > 0 || s.unpricedUnreportedBy.size > 0
  return s.charged === 0 && unknown && s.included === 0
}

/**
 * The charged cell, as a cost chip says it: a charge that is not known reads
 * `$?` rather than a `$0` it never was — after the stated part, on a plan's
 * group that also has one.
 */
function chargedCell(s: UsageSums): string {
  const amount = s.estimated ? `≈ ${usd(s.charged)}` : usd(s.charged)
  if (!chargeUnknown(s)) return amount
  const known =
    s.plans.size > 0 &&
    (s.charges.has('confirmed-amount') || s.charges.has('included-in-plan-confirmed'))
  return known ? `${amount} + ${COST_CHARGE_UNKNOWN_CHIP}` : COST_CHARGE_UNKNOWN_CHIP
}

/**
 * Why a group's `$?` charge is unknown, said under its label: the plans it ran
 * on, then how many of its tokens have no known price. The CLIs that reported
 * no counts are already named there ({@link UsageTableRow.notReportedBy}).
 * Empty when the charge is known.
 */
function chargeReasonCell(s: UsageSums): string {
  if (!chargeUnknown(s)) return ''
  const named = [...s.plans].filter((plan) => plan !== '')
  const plans =
    s.plans.size === 0
      ? []
      : named.length === 0
        ? [`${USAGE_REASON_PLAN} subscription`]
        : [
            `${USAGE_REASON_PLAN} ${wordList(named)} ${named.length === 1 ? 'subscription' : 'subscriptions'}`,
          ]
  const unpriced =
    s.unpriced > 0
      ? [
          `${USAGE_REASON_NO_PRICE} ${COUNT.format(s.unpriced)} ${s.unpriced === 1 ? 'token' : 'tokens'}`,
        ]
      : []
  return sentenceCase([...plans, ...unpriced].join(USAGE_REASON_SEPARATOR))
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

/** How sure a group's charge is, from its calls' charge statuses. */
function chargeCell(charges: ReadonlySet<ChargeStatus>): string {
  if (charges.size === 0) return NONE
  if (charges.has('unknown'))
    return charges.size > 1 ? USAGE_CHARGE_PART_UNKNOWN : USAGE_CHARGE_UNKNOWN
  return charges.has('confirmed-amount') ? USAGE_CHARGE_CONFIRMED : USAGE_CHARGE_IN_PLAN
}

/** Why a group's counts fall short, in words, each once, in the tools' order. */
function incompleteCell(reasons: ReadonlySet<UsageCompletenessReason>): string {
  const words = [...reasons].sort().map((reason) => USAGE_INCOMPLETE_REASON_LABELS[reason])
  return [...new Set(words)].join(USAGE_INCOMPLETE_SEPARATOR)
}

function listValueCell(s: UsageSums): string {
  if (s.list === undefined) return NONE
  return s.listPartial ? `${usd(s.list)} ${USAGE_LIST_PARTIAL}` : usd(s.list)
}

function tableRow(key: string, label: string, s: UsageSums, total = false): UsageTableRow {
  const input = s.prompt + s.cachedRead
  const withOutput = union(s.unreportedBy, s.outputUnreportedBy)
  const field = s.fieldUnreportedBy
  const anyGap = union(withOutput, field.input, field.cacheRead, field.cacheWrite)
  return {
    notReportedBy: anyGap.size > 0 ? notReportedBy([...anyGap]) : '',
    incomplete: incompleteCell(s.reasons),
    key,
    label,
    total,
    charged: chargedCell(s),
    chargeReason: chargeReasonCell(s),
    charge: chargeCell(s.charges),
    tokens: countCell(totalTokens(s), anyGap),
    prompt: countCell(s.prompt, union(s.unreportedBy, field.input)),
    completion: countCell(s.completion, withOutput),
    cachedRead: countCell(s.cachedRead, union(s.unreportedBy, field.cacheRead)),
    cacheRatio: input > 0 ? `(${Math.round((s.cachedRead / input) * 100)}%)` : '',
    cacheWrite: countCell(s.cacheWrite, union(s.unreportedBy, field.cacheWrite)),
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

/** Every count reported, but those `unavailable` says were not. */
function fieldsOf(unavailable: Iterable<keyof UsageTokenFields>): UsageTokenFields {
  const fields: UsageTokenFields = {
    input: 'reported',
    output: 'reported',
    cacheRead: 'reported',
    cacheWrite: 'reported',
  }
  for (const field of unavailable) fields[field] = 'unavailable'
  return fields
}

/** Note the tool behind each count a call left unavailable, and why the counts fall short. */
function addFieldGaps(s: UsageSums, tool: string, fields: UsageTokenFields) {
  if (fields.output === 'unavailable') s.outputUnreportedBy.add(tool)
  for (const field of ['input', 'cacheRead', 'cacheWrite'] as const) {
    if (fields[field] === 'unavailable') s.fieldUnreportedBy[field].add(tool)
  }
  for (const reason of usageCompletenessReasons(fields)) s.reasons.add(reason)
}

/**
 * How sure a ledger row's charges are. A plan's are unknown — it can bill
 * overage — and a free model's a confirmed nothing; a metered row's are
 * confirmed where it was charged and unknown where tokens had no price or a
 * call's counts fall short. An executor's row sums every basis, so what it
 * includes may be a plan's.
 */
function addLedgerCharges(s: UsageSums, b: UsageModalCostBreakdown) {
  if (b.billing === 'subscription') addPlan(s, b.provider)
  if (b.billing === 'free') {
    s.charges.add('included-in-plan-confirmed')
    return
  }
  if (b.billing === 'subscription' || (b.billing === undefined && (b.includedTokens ?? 0) > 0)) {
    s.charges.add('unknown')
    if (b.billing === 'subscription') return
  }
  const short =
    (b.unpricedTokens ?? 0) > 0 ||
    b.tokensNotReported === true ||
    b.outputTokensNotReported === true ||
    (b.tokenFieldsNotReported?.length ?? 0) > 0
  if (short) s.charges.add('unknown')
  if (b.costUSD > 0 || !short) s.charges.add('confirmed-amount')
}

/** A ledger row's charges, and the counts its calls left unavailable. */
function addLedgerProvenance(s: UsageSums, b: UsageModalCostBreakdown) {
  addLedgerCharges(s, b)
  const unavailable = new Set(b.tokenFieldsNotReported ?? [])
  if (b.tokensNotReported === true) s.reasons.add('usage-not-reported')
  if (b.outputTokensNotReported === true) unavailable.add('output')
  if (unavailable.size > 0)
    addFieldGaps(s, reportingToolOf(b.provider ?? ''), fieldsOf(unavailable))
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
  addLedgerProvenance(s, b)
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
  for (const b of Object.values(agg.breakdown)) {
    addUnreportedCalls(totals, b)
    addLedgerProvenance(totals, b)
  }
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

/** A CLI row's counts as reported, derived or unavailable — its not-reported marks included. */
function spendFields(row: CostSpend): UsageTokenFields {
  if (isUnreported(row)) return fieldsOf(['input', 'output', 'cacheRead', 'cacheWrite'])
  return {
    input: row.tokenFields?.input ?? 'reported',
    output: row.outputTokensNotReported ? 'unavailable' : (row.tokenFields?.output ?? 'reported'),
    cacheRead: row.tokenFields?.cacheRead ?? 'reported',
    cacheWrite: row.tokenFields?.cacheWrite ?? 'reported',
  }
}

/**
 * A CLI row's charge status and the reasons its counts fall short, as the
 * ledger records them: a plan's charge unknown, a free model's a confirmed
 * nothing, a metered one confirmed only when stated over counts that were all
 * reported. A row whose turn is still going adds nothing yet — its counts and
 * charge are still to come.
 */
function addSpendProvenance(s: UsageSums, row: CostSpend) {
  if (row.countsPending === true || row.chargePending === true) return
  const fields = spendFields(row)
  const tool = reportingToolOf(row.provider)
  for (const field of ['input', 'cacheRead', 'cacheWrite'] as const) {
    if (fields[field] === 'unavailable' && !isUnreported(row)) s.fieldUnreportedBy[field].add(tool)
  }
  const reasons = [...usageCompletenessReasons(fields), ...(row.incompleteReasons ?? [])]
  for (const reason of reasons) s.reasons.add(reason)
  if (row.billing === 'subscription') addPlan(s, row.provider)
  if (row.billing === 'free') s.charges.add('included-in-plan-confirmed')
  else if (row.billing === 'subscription') s.charges.add('unknown')
  else if (reasons.length === 0 && typeof row.costUsd === 'number')
    s.charges.add('confirmed-amount')
  else s.charges.add('unknown')
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
  addSpendProvenance(s, row)
  const cost = messageUsageCost({ byModel: [row] }, undefined)
  if (!cost) return
  s.charged = roundMoneyUSD(s.charged + (cost.costUsd ?? 0))
  s.included += cost.includedTokens ?? 0
  s.unpriced += cost.unpricedTokens ?? 0
  if (cost.listCostUsd !== undefined) addListValue(s, cost.listCostUsd)
  if (isListPartial(cost, cost.byModel ?? [])) s.listPartial = true
}

/**
 * How sure an API turn's charge is: a stored metered charge over counts all
 * reported is confirmed; an estimate, none, or one over short counts is unknown.
 */
function apiTurnCharge(usage: UsageModalUsage, short: boolean): ChargeStatus {
  if (usage.billing === 'free') return 'included-in-plan-confirmed'
  if (usage.billing === 'subscription') return 'unknown'
  return typeof usage.cost === 'number' && !short ? 'confirmed-amount' : 'unknown'
}

/** An API turn's counts left out and why it is short, as its ledger entry records them. */
function addApiProvenance(s: UsageSums, usage: UsageModalUsage, tool: string): boolean {
  const fields: UsageTokenFields = {
    input: usage.tokenFields?.input ?? 'reported',
    output: usage.tokenFields?.output ?? 'reported',
    cacheRead: usage.tokenFields?.cacheRead ?? 'reported',
    cacheWrite: usage.tokenFields?.cacheWrite ?? 'reported',
  }
  const reasons = [...usageCompletenessReasons(fields), ...(usage.incompleteReasons ?? [])]
  addFieldGaps(s, tool, fields)
  for (const reason of reasons) s.reasons.add(reason)
  return reasons.length > 0
}

/**
 * Fold an API turn into its model's sums. A stored charge is what was charged.
 * Without one, a subscription or free turn was charged nothing; a metered turn
 * is estimated from its model's current price, and with no price its tokens are
 * unpriced — never an estimated $0.
 */
function addMessage(
  s: UsageSums,
  usage: UsageModalUsage,
  price: UsageModalModelPrice | undefined,
  provider: string,
) {
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
  const short = addApiProvenance(s, usage, providerName(provider))
  s.charges.add(apiTurnCharge(usage, short))
  if (usage.billing === 'subscription') addPlan(s, provider)
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
  for (const plan of s.plans) into.plans.add(plan)
  for (const [to, from] of [
    [into.unreportedBy, s.unreportedBy],
    [into.outputUnreportedBy, s.outputUnreportedBy],
    [into.includedUnreportedBy, s.includedUnreportedBy],
    [into.unpricedUnreportedBy, s.unpricedUnreportedBy],
    [into.fieldUnreportedBy.input, s.fieldUnreportedBy.input],
    [into.fieldUnreportedBy.cacheRead, s.fieldUnreportedBy.cacheRead],
    [into.fieldUnreportedBy.cacheWrite, s.fieldUnreportedBy.cacheWrite],
  ] as const) {
    for (const tool of from) to.add(tool)
  }
  for (const charge of s.charges) into.charges.add(charge)
  for (const reason of s.reasons) into.reasons.add(reason)
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
      model?.provider ?? '',
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
