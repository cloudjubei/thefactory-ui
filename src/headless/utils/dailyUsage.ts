/**
 * The daily usage summaries, worded once for web and native.
 *
 * A charge no one stated reads `unknown` — never `$0` — and a figure that
 * leaves some calls out says so (`$0.50 + unknown`). A list-price value is an
 * estimate, marked `≈`, never a charge. A token count no call reported reads
 * `unknown` rather than 0. Pure: the hook feeds it what the backend returns.
 */

import type {
  CacheEfficiencyAnomaly,
  DailyTokenFieldTotal,
  DailyUsageCohort,
  DailyUsageMeasures,
  DailyUsageTotals,
  LLMDailyUsageSummaryContent,
  ToolAllocationUnattributedReason,
} from 'thefactory-tools/types'

import { formatCostUSD } from './costDetails'
import { COST_PROVIDER_NAMES } from './costDetailsConstants'
import {
  DAILY_USAGE_ANOMALY_TITLES,
  DAILY_USAGE_ESTIMATE_MARK,
  DAILY_USAGE_NONE,
  DAILY_USAGE_PART_UNKNOWN,
  DAILY_USAGE_SOURCE_LABELS,
  DAILY_USAGE_UNATTRIBUTED_LABELS,
  DAILY_USAGE_UNKNOWN,
} from './dailyUsageConstants'
import type {
  DailyUsageAnomalyRow,
  DailyUsageDay,
  DailyUsageModelRow,
  DailyUsageRange,
  DailyUsageStatus,
  DailyUsageToolRow,
  DailyUsageUnattributedRow,
  DailyUsageView,
} from './dailyUsageTypes'

const COUNT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const DAY_LABEL = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const MS_PER_DAY = 24 * 60 * 60 * 1000
const MICRO_USD_PER_USD = 1_000_000

const dollars = (microUSD: number): string => formatCostUSD(microUSD / MICRO_USD_PER_USD) ?? ''

/** A known amount, with the part left out of it named: `$0.50 + unknown`, `unknown`, `—` for no calls. */
function moneyCell(microUSD: number, unknown: number, count: number, mark = ''): string {
  if (count === 0) return DAILY_USAGE_NONE
  if (unknown >= count) return DAILY_USAGE_UNKNOWN
  const amount = `${mark}${dollars(microUSD)}`
  return unknown > 0 ? `${amount} ${DAILY_USAGE_PART_UNKNOWN}` : amount
}

/** What was charged — `unknown` when no call stated its charge, never `$0`. Pure. */
export function dailyUsageChargedCell(
  measures: Pick<DailyUsageMeasures, 'count' | 'chargedMicroUSD' | 'chargeUnknown'>,
): string {
  return moneyCell(measures.chargedMicroUSD, measures.chargeUnknown, measures.count)
}

/** The list-price value, marked as an estimate. Pure. */
export function dailyUsageListValueCell(
  measures: Pick<DailyUsageMeasures, 'count' | 'listValueMicroUSD' | 'listValueUnknown'>,
): string {
  return moneyCell(
    measures.listValueMicroUSD,
    measures.listValueUnknown,
    measures.count,
    `${DAILY_USAGE_ESTIMATE_MARK} `,
  )
}

/** A token count over `count` calls: `unknown` when none reported it, marked when some did not. Pure. */
export function dailyUsageTokenCell(total: DailyTokenFieldTotal, count: number): string {
  if (count === 0) return DAILY_USAGE_NONE
  if (total.unavailable >= count) return DAILY_USAGE_UNKNOWN
  const known = COUNT.format(total.known)
  return total.unavailable > 0 ? `${known} ${DAILY_USAGE_PART_UNKNOWN}` : known
}

/** `Sun 18 Oct` for `2026-10-18`, read as a UTC day. Pure. */
export function dailyUsageDayLabel(day: string): string {
  return DAY_LABEL.format(new Date(`${day}T00:00:00.000Z`))
}

const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

/** The last `days` UTC days, the day of `now` the last of them. Pure. */
export function dailyUsageRangeEnding(now: number, days: number): DailyUsageRange {
  const toDay = utcDay(now)
  const start = Date.parse(`${toDay}T00:00:00.000Z`) - (days - 1) * MS_PER_DAY
  return { fromDay: utcDay(start), toDay }
}

const callsCell = (count: number): string =>
  `${COUNT.format(count)} ${count === 1 ? 'call' : 'calls'}`

const percent = (share: number): string => `${Math.round(share * 100)}%`

function statusOf(
  byCompleteness: Pick<DailyUsageTotals['byCompleteness'], 'partial' | 'unavailable'>,
  count: number,
): DailyUsageStatus {
  if (count > 0 && byCompleteness.unavailable >= count) return 'unknown'
  return byCompleteness.partial + byCompleteness.unavailable > 0 ? 'partial' : 'complete'
}

function completenessCell(byCompleteness: DailyUsageTotals['byCompleteness']): string {
  return [
    byCompleteness.partial > 0 ? `${COUNT.format(byCompleteness.partial)} partial` : '',
    byCompleteness.unavailable > 0 ? `${COUNT.format(byCompleteness.unavailable)} no usage` : '',
  ]
    .filter((part) => part !== '')
    .join(' · ')
}

const providerName = (provider: string): string => COST_PROVIDER_NAMES[provider] ?? provider

const modelName = (row: { provider: string; model: string }): string =>
  `${providerName(row.provider)} · ${row.model}`

const sizeOf = (measures: DailyUsageMeasures): number =>
  Math.max(measures.chargedMicroUSD, measures.listValueMicroUSD)

function modelRow(cohort: DailyUsageCohort): DailyUsageModelRow {
  const { totals, cacheEfficiency } = cohort
  const { tokens, count } = totals
  return {
    key: `${cohort.source}:${cohort.provider}:${cohort.model}`,
    source: DAILY_USAGE_SOURCE_LABELS[cohort.source],
    name: modelName(cohort),
    calls: callsCell(count),
    charged: dailyUsageChargedCell(totals),
    listValue: dailyUsageListValueCell(totals),
    input: dailyUsageTokenCell(tokens.input, count),
    output: dailyUsageTokenCell(tokens.output, count),
    cacheRead: dailyUsageTokenCell(tokens.cacheRead, count),
    cacheWrite: dailyUsageTokenCell(tokens.cacheWrite, count),
    cacheShare:
      cacheEfficiency.cacheReadShare !== undefined
        ? percent(cacheEfficiency.cacheReadShare)
        : DAILY_USAGE_NONE,
  }
}

function anomalyRow(anomaly: CacheEfficiencyAnomaly): DailyUsageAnomalyRow {
  const source = DAILY_USAGE_SOURCE_LABELS[anomaly.source]
  return {
    key: `${anomaly.source}:${anomaly.provider}:${anomaly.model}:${anomaly.kind}`,
    kind: anomaly.kind,
    title: DAILY_USAGE_ANOMALY_TITLES[anomaly.kind],
    detail: `${modelName(anomaly)} (${source}): ${percent(anomaly.share)} of input, usually ${percent(anomaly.baseline)}`,
  }
}

function toolRows(summary: LLMDailyUsageSummaryContent): DailyUsageToolRow[] {
  return [...summary.tools]
    .sort(
      (a, b) =>
        sizeOf(b.includingAveraged) - sizeOf(a.includingAveraged) ||
        a.toolName.localeCompare(b.toolName),
    )
    .map((tool) => ({
      key: `tool:${tool.toolName}`,
      name: tool.toolName,
      calls: callsCell(tool.includingAveraged.count),
      charged: dailyUsageChargedCell(tool.includingAveraged),
      averaged:
        tool.includingAveraged.averagedCalls > 0
          ? `${COUNT.format(tool.includingAveraged.averagedCalls)} shared`
          : '',
    }))
}

function unattributedRows(summary: LLMDailyUsageSummaryContent): DailyUsageUnattributedRow[] {
  return (Object.keys(DAILY_USAGE_UNATTRIBUTED_LABELS) as ToolAllocationUnattributedReason[])
    .filter((reason) => summary.unattributed[reason].count > 0)
    .map((reason) => ({
      key: `unattributed:${reason}`,
      name: DAILY_USAGE_UNATTRIBUTED_LABELS[reason],
      calls: callsCell(summary.unattributed[reason].count),
      charged: dailyUsageChargedCell(summary.unattributed[reason]),
    }))
}

function dayOf(summary: LLMDailyUsageSummaryContent): DailyUsageDay {
  const { total } = summary
  return {
    day: summary.day,
    label: dailyUsageDayLabel(summary.day),
    calls: callsCell(total.count),
    charged: dailyUsageChargedCell(total),
    listValue: dailyUsageListValueCell(total),
    completeness: completenessCell(total.byCompleteness),
    status: statusOf(total.byCompleteness, total.count),
    models: [...summary.cohorts]
      .sort((a, b) => sizeOf(b.totals) - sizeOf(a.totals) || b.totals.count - a.totals.count)
      .map(modelRow),
    anomalies: summary.cacheAnomalies.map(anomalyRow),
    tools: toolRows(summary),
    unattributed: unattributedRows(summary),
  }
}

/** The summaries as the usage section shows them: newest day first, and their total. Pure. */
export function dailyUsageView(summaries: readonly LLMDailyUsageSummaryContent[]): DailyUsageView {
  const sum = summaries.reduce(
    (acc, { total }) => ({
      count: acc.count + total.count,
      chargedMicroUSD: acc.chargedMicroUSD + total.chargedMicroUSD,
      chargeUnknown: acc.chargeUnknown + total.chargeUnknown,
      listValueMicroUSD: acc.listValueMicroUSD + total.listValueMicroUSD,
      listValueUnknown: acc.listValueUnknown + total.listValueUnknown,
      partial: acc.partial + total.byCompleteness.partial,
      unavailable: acc.unavailable + total.byCompleteness.unavailable,
    }),
    {
      count: 0,
      chargedMicroUSD: 0,
      chargeUnknown: 0,
      listValueMicroUSD: 0,
      listValueUnknown: 0,
      partial: 0,
      unavailable: 0,
    },
  )
  return {
    days: [...summaries].sort((a, b) => b.day.localeCompare(a.day)).map(dayOf),
    total: {
      calls: callsCell(sum.count),
      charged: dailyUsageChargedCell(sum),
      listValue: dailyUsageListValueCell(sum),
      status: statusOf(sum, sum.count),
    },
  }
}
