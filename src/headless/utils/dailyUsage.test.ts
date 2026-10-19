import { describe, expect, it } from 'vitest'
import type {
  CacheEfficiencyAnomaly,
  DailyUsageCohort,
  DailyUsageMeasures,
  DailyUsageTotals,
  LLMDailyUsageSummaryContent,
} from 'thefactory-tools/types'

import {
  dailyUsageChargedCell,
  dailyUsageDayLabel,
  dailyUsageListValueCell,
  dailyUsageRangeEnding,
  dailyUsageTokenCell,
  dailyUsageView,
} from './dailyUsage'

const RULE = {
  ruleVersion: 2,
  thresholds: {
    minEligibleInputTokens: 1,
    minEligibleEvents: 1,
    baselineDays: 7,
    minBaselineDays: 3,
    lookbackDays: 14,
    minAbsoluteChange: 0.1,
    minRelativeChange: 0.25,
    maxIneligibleEventShare: 0.5,
  },
}

const field = (known: number, unavailable = 0) => ({ known, unavailable })

function measures(over: Partial<DailyUsageMeasures> = {}): DailyUsageMeasures {
  return {
    count: 0,
    tokens: { input: field(0), output: field(0), cacheRead: field(0), cacheWrite: field(0) },
    chargedMicroUSD: 0,
    chargeUnknown: 0,
    listValueMicroUSD: 0,
    listValueUnknown: 0,
    ...over,
  }
}

function totals(over: Partial<DailyUsageTotals> = {}): DailyUsageTotals {
  return {
    ...measures(over),
    byChargeStatus: {
      'confirmed-amount': { events: 0, chargedMicroUSD: 0 },
      'included-in-plan-confirmed': { events: 0, chargedMicroUSD: 0 },
      unknown: { events: 0 },
    },
    byCompleteness: { complete: over.count ?? 0, partial: 0, unavailable: 0 },
    ...over,
  }
}

function cohort(over: Partial<DailyUsageCohort> & { totals: DailyUsageTotals }): DailyUsageCohort {
  return {
    source: 'api',
    provider: 'openai',
    model: 'gpt-5.5',
    cacheEfficiency: {
      eligibleEvents: 0,
      eligibleInputTokens: 0,
      eligibleCacheReadTokens: 0,
      cacheReadUnavailableEvents: 0,
      ineligibleEvents: 0,
    },
    ...over,
  }
}

function summary(over: Partial<LLMDailyUsageSummaryContent> = {}): LLMDailyUsageSummaryContent {
  return {
    chatKey: 'all',
    day: '2026-10-18',
    rulesVersion: 3,
    total: totals(),
    cohorts: [],
    tools: [],
    unattributed: {
      'no-tool-calls': measures(),
      'no-metadata': measures(),
      'cli-run-level': measures(),
    },
    cacheAnomalyRule: RULE,
    cacheAnomalies: [],
    ...over,
  }
}

const drop: CacheEfficiencyAnomaly = {
  source: 'cli',
  provider: 'anthropic',
  model: 'claude-opus-5',
  kind: 'drop',
  metric: 'cache-read-share',
  share: 0.12,
  baseline: 0.64,
  absoluteChange: -0.52,
  relativeChange: -0.8125,
  baselineDays: ['2026-10-15', '2026-10-16', '2026-10-17'],
  eligibleEvents: 9,
  eligibleInputTokens: 90_000,
  eligibleCacheReadTokens: 10_800,
  rule: RULE,
}

describe('dailyUsageChargedCell', () => {
  it('states a known charge in dollars, a confirmed nothing as $0.00', () => {
    expect(dailyUsageChargedCell(measures({ count: 2, chargedMicroUSD: 1_234_567 }))).toBe('$1.23')
    expect(dailyUsageChargedCell(measures({ count: 2, chargedMicroUSD: 0 }))).toBe('$0.00')
    expect(dailyUsageChargedCell(measures({ count: 1, chargedMicroUSD: 1_200 }))).toBe('$0.0012')
  })

  it('says unknown when no charge is stated — never $0', () => {
    expect(dailyUsageChargedCell(measures({ count: 3, chargeUnknown: 3 }))).toBe('unknown')
  })

  it('adds the unknown part to a charge that is only partly known', () => {
    expect(
      dailyUsageChargedCell(measures({ count: 3, chargeUnknown: 1, chargedMicroUSD: 500_000 })),
    ).toBe('$0.50 + unknown')
  })

  it('shows nothing for no calls', () => {
    expect(dailyUsageChargedCell(measures())).toBe('—')
  })
})

describe('dailyUsageListValueCell', () => {
  it('marks a list value as an estimate', () => {
    expect(dailyUsageListValueCell(measures({ count: 1, listValueMicroUSD: 4_560_000 }))).toBe(
      '≈ $4.56',
    )
  })

  it('says unknown with no list value, and marks one that leaves calls out', () => {
    expect(dailyUsageListValueCell(measures({ count: 2, listValueUnknown: 2 }))).toBe('unknown')
    expect(
      dailyUsageListValueCell(
        measures({ count: 2, listValueUnknown: 1, listValueMicroUSD: 10_000 }),
      ),
    ).toBe('≈ $0.01 + unknown')
    expect(dailyUsageListValueCell(measures())).toBe('—')
  })
})

describe('dailyUsageTokenCell', () => {
  it('counts what is known, adds the unknown part, and says unknown when nothing was reported', () => {
    expect(dailyUsageTokenCell(field(12_345), 3)).toBe('12,345')
    expect(dailyUsageTokenCell(field(12_345, 1), 3)).toBe('12,345 + unknown')
    expect(dailyUsageTokenCell(field(0, 3), 3)).toBe('unknown')
    expect(dailyUsageTokenCell(field(0), 0)).toBe('—')
  })
})

describe('dailyUsageDayLabel', () => {
  it('names a UTC day by its weekday, date and month', () => {
    expect(dailyUsageDayLabel('2026-10-18')).toBe('Sun 18 Oct')
    expect(dailyUsageDayLabel('2026-03-01')).toBe('Sun 1 Mar')
  })
})

describe('dailyUsageRangeEnding', () => {
  it('is the last `days` UTC days, the day of `now` the last', () => {
    expect(dailyUsageRangeEnding(Date.parse('2026-10-19T23:30:00.000Z'), 7)).toEqual({
      fromDay: '2026-10-13',
      toDay: '2026-10-19',
    })
    expect(dailyUsageRangeEnding(Date.parse('2026-03-02T00:00:00.000Z'), 3)).toEqual({
      fromDay: '2026-02-28',
      toDay: '2026-03-02',
    })
  })
})

describe('dailyUsageView', () => {
  it('lists days newest first, each a complete day stated plainly', () => {
    const view = dailyUsageView([
      summary({
        day: '2026-10-17',
        total: totals({ count: 2, chargedMicroUSD: 20_000, listValueMicroUSD: 20_000 }),
      }),
      summary({
        day: '2026-10-18',
        total: totals({ count: 4, chargedMicroUSD: 1_500_000, listValueMicroUSD: 1_500_000 }),
      }),
    ])
    expect(view.days.map((day) => [day.day, day.label, day.charged, day.listValue])).toEqual([
      ['2026-10-18', 'Sun 18 Oct', '$1.50', '≈ $1.50'],
      ['2026-10-17', 'Sat 17 Oct', '$0.02', '≈ $0.02'],
    ])
    expect(view.days[0]).toMatchObject({ calls: '4 calls', completeness: '', status: 'complete' })
    expect(view.total).toEqual({
      charged: '$1.52',
      listValue: '≈ $1.52',
      calls: '6 calls',
      status: 'complete',
    })
  })

  it('says how much of a partial day is unknown, and calls a day with no usage unknown', () => {
    const view = dailyUsageView([
      summary({
        day: '2026-10-18',
        total: totals({
          count: 5,
          chargeUnknown: 5,
          listValueUnknown: 2,
          listValueMicroUSD: 300_000,
          tokens: {
            input: field(800, 1),
            output: field(0, 5),
            cacheRead: field(0, 5),
            cacheWrite: field(0, 5),
          },
          byCompleteness: { complete: 0, partial: 4, unavailable: 1 },
        }),
      }),
      summary({
        day: '2026-10-17',
        total: totals({
          count: 1,
          chargeUnknown: 1,
          listValueUnknown: 1,
          byCompleteness: { complete: 0, partial: 0, unavailable: 1 },
        }),
      }),
    ])
    expect(view.days[0]).toMatchObject({
      charged: 'unknown',
      listValue: '≈ $0.30 + unknown',
      calls: '5 calls',
      completeness: '4 partial · 1 no usage',
      status: 'partial',
    })
    expect(view.days[1]).toMatchObject({ completeness: '1 no usage', status: 'unknown' })
    expect(view.total.status).toBe('partial')
  })

  it('gives each source, provider and model a row with its counts and cache share, largest first', () => {
    const [day] = dailyUsageView([
      summary({
        cohorts: [
          cohort({ totals: totals({ count: 1, chargedMicroUSD: 10_000 }) }),
          cohort({
            source: 'cli',
            provider: 'anthropic',
            model: 'claude-opus-5',
            totals: totals({
              count: 3,
              chargeUnknown: 3,
              listValueMicroUSD: 2_000_000,
              tokens: {
                input: field(1_000),
                output: field(500),
                cacheRead: field(9_000),
                cacheWrite: field(0, 3),
              },
            }),
            cacheEfficiency: {
              eligibleEvents: 3,
              eligibleInputTokens: 10_000,
              eligibleCacheReadTokens: 9_000,
              cacheReadShare: 0.9,
              cacheReadUnavailableEvents: 0,
              ineligibleEvents: 0,
            },
          }),
        ],
      }),
    ]).days
    expect(day.models).toEqual([
      {
        key: 'cli:anthropic:claude-opus-5',
        source: 'CLI',
        name: 'Anthropic · claude-opus-5',
        calls: '3 calls',
        charged: 'unknown',
        listValue: '≈ $2.00',
        input: '1,000',
        output: '500',
        cacheRead: '9,000',
        cacheWrite: 'unknown',
        cacheShare: '90%',
      },
      {
        key: 'api:openai:gpt-5.5',
        source: 'API',
        name: 'OpenAI · gpt-5.5',
        calls: '1 call',
        charged: '$0.01',
        listValue: '≈ $0.00',
        input: '0',
        output: '0',
        cacheRead: '0',
        cacheWrite: '0',
        cacheShare: '—',
      },
    ])
  })

  it('words each cache anomaly as a spike or a drop against its usual share', () => {
    const spike: CacheEfficiencyAnomaly = {
      ...drop,
      source: 'api',
      provider: 'openai',
      model: 'gpt-5.5',
      kind: 'spike',
      share: 0.4,
      baseline: 0,
      relativeChange: null,
    }
    const [day] = dailyUsageView([summary({ cacheAnomalies: [drop, spike] })]).days
    expect(day.anomalies).toEqual([
      {
        key: 'cli:anthropic:claude-opus-5:drop',
        kind: 'drop',
        title: 'Cache reads down',
        detail: 'Anthropic · claude-opus-5 (CLI): 12% of input, usually 64%',
      },
      {
        key: 'api:openai:gpt-5.5:spike',
        kind: 'spike',
        title: 'Cache reads up',
        detail: 'OpenAI · gpt-5.5 (API): 40% of input, usually 0%',
      },
    ])
  })

  it("splits a day's spend by tool, marks an averaged share, and names what no tool was given", () => {
    const [day] = dailyUsageView([
      summary({
        tools: [
          {
            toolName: 'readFile',
            directOnly: measures({ count: 1, chargedMicroUSD: 100_000 }),
            includingAveraged: {
              ...measures({ count: 3, chargedMicroUSD: 200_000 }),
              averagedCalls: 2,
            },
          },
          {
            toolName: 'writeFile',
            directOnly: measures({ count: 2, chargedMicroUSD: 900_000 }),
            includingAveraged: {
              ...measures({ count: 2, chargedMicroUSD: 900_000 }),
              averagedCalls: 0,
            },
          },
        ],
        unattributed: {
          'no-tool-calls': measures({ count: 4, chargedMicroUSD: 400_000 }),
          'no-metadata': measures(),
          'cli-run-level': measures({ count: 2, chargeUnknown: 2 }),
        },
      }),
    ]).days
    expect(day.tools).toEqual([
      {
        key: 'tool:writeFile',
        name: 'writeFile',
        calls: '2 calls',
        charged: '$0.90',
        averaged: '',
      },
      {
        key: 'tool:readFile',
        name: 'readFile',
        calls: '3 calls',
        charged: '$0.20',
        averaged: '2 shared',
      },
    ])
    expect(day.unattributed).toEqual([
      {
        key: 'unattributed:no-tool-calls',
        name: 'No tool calls',
        calls: '4 calls',
        charged: '$0.40',
      },
      { key: 'unattributed:cli-run-level', name: 'CLI runs', calls: '2 calls', charged: 'unknown' },
    ])
  })

  it('is empty with no summaries', () => {
    expect(dailyUsageView([])).toEqual({
      days: [],
      total: { charged: '—', listValue: '—', calls: '0 calls', status: 'complete' },
    })
  })
})
