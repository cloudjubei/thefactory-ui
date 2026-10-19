import type {
  CacheEfficiencyAnomaly,
  DailyUsageCohort,
  DailyUsageMeasures,
  DailyUsageTotals,
  LLMDailyUsageSummaryContent,
  ModelSpend,
} from 'thefactory-tools/types'
import { dailyUsageView } from 'thefactory-ui/headless'
import type {
  UsageModalCostAggregate,
  UsageModalMessage,
} from '../../src/headless/utils/usageBreakdownTypes'
import { UsageModal } from '../../src/web/compound/UsageModal'
import UsageSettingsView from '../../src/web/compound/settings/UsageSettingsView'
import type { Scene } from '../showcase/types'

const RULE = {
  ruleVersion: 2,
  thresholds: {
    minEligibleInputTokens: 10_000,
    minEligibleEvents: 3,
    baselineDays: 7,
    minBaselineDays: 3,
    lookbackDays: 14,
    minAbsoluteChange: 0.15,
    minRelativeChange: 0.3,
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

function totals(
  over: Partial<DailyUsageTotals> & { confirmed?: number; unknown?: number } = {},
): DailyUsageTotals {
  const { confirmed = 0, unknown = 0, ...rest } = over
  return {
    ...measures(rest),
    byChargeStatus: {
      'confirmed-amount': { events: confirmed, chargedMicroUSD: rest.chargedMicroUSD ?? 0 },
      'included-in-plan-confirmed': { events: 0, chargedMicroUSD: 0 },
      unknown: { events: unknown },
    },
    byCompleteness: { complete: rest.count ?? 0, partial: 0, unavailable: 0 },
    ...rest,
  }
}

const efficiency = (input: number, cacheRead: number, events: number) => ({
  eligibleEvents: events,
  eligibleInputTokens: input,
  eligibleCacheReadTokens: cacheRead,
  ...(input > 0 ? { cacheReadShare: cacheRead / input } : {}),
  cacheReadUnavailableEvents: 0,
  ineligibleEvents: 0,
})

const apiOpus: DailyUsageCohort = {
  source: 'api',
  provider: 'anthropic',
  model: 'claude-opus-5',
  totals: totals({
    count: 14,
    confirmed: 14,
    chargedMicroUSD: 3_412_500,
    listValueMicroUSD: 3_412_500,
    tokens: {
      input: field(42_100),
      output: field(18_900),
      cacheRead: field(388_000),
      cacheWrite: field(61_200),
    },
  }),
  cacheEfficiency: efficiency(491_300, 388_000, 14),
}

const apiGpt: DailyUsageCohort = {
  source: 'api',
  provider: 'openai',
  model: 'gpt-5.5',
  totals: totals({
    count: 6,
    confirmed: 6,
    chargedMicroUSD: 214_000,
    listValueMicroUSD: 214_000,
    tokens: {
      input: field(30_400),
      output: field(4_100),
      cacheRead: field(12_800),
      cacheWrite: field(0),
    },
  }),
  cacheEfficiency: efficiency(43_200, 12_800, 6),
}

const unattributed = (over: Partial<LLMDailyUsageSummaryContent['unattributed']> = {}) => ({
  'no-tool-calls': measures(),
  'no-metadata': measures(),
  'cli-run-level': measures(),
  ...over,
})

const tools: LLMDailyUsageSummaryContent['tools'] = [
  {
    toolName: 'editFile',
    directOnly: measures({ count: 5, chargedMicroUSD: 1_120_000, listValueMicroUSD: 1_120_000 }),
    includingAveraged: {
      ...measures({ count: 7, chargedMicroUSD: 1_480_000, listValueMicroUSD: 1_480_000 }),
      averagedCalls: 2,
    },
  },
  {
    toolName: 'readFile',
    directOnly: measures({ count: 9, chargedMicroUSD: 960_000, listValueMicroUSD: 960_000 }),
    includingAveraged: {
      ...measures({ count: 13, chargedMicroUSD: 1_302_000, listValueMicroUSD: 1_302_000 }),
      averagedCalls: 4,
    },
  },
]

const completeDay: LLMDailyUsageSummaryContent = {
  chatKey: 'all',
  day: '2026-10-18',
  rulesVersion: 3,
  total: totals({
    count: 20,
    confirmed: 20,
    chargedMicroUSD: 3_626_500,
    listValueMicroUSD: 3_626_500,
    tokens: {
      input: field(72_500),
      output: field(23_000),
      cacheRead: field(400_800),
      cacheWrite: field(61_200),
    },
  }),
  cohorts: [apiOpus, apiGpt],
  tools,
  unattributed: unattributed({
    'no-tool-calls': measures({ count: 3, chargedMicroUSD: 844_500, listValueMicroUSD: 844_500 }),
  }),
  cacheAnomalyRule: RULE,
  cacheAnomalies: [],
}

const cursorPlan: DailyUsageCohort = {
  source: 'cli',
  provider: 'cursor',
  model: 'composer-2.5',
  totals: {
    ...totals({
      count: 9,
      unknown: 9,
      chargeUnknown: 9,
      listValueMicroUSD: 410_000,
      listValueUnknown: 4,
      tokens: {
        input: field(51_000, 4),
        output: field(6_300, 4),
        cacheRead: field(120_000, 4),
        cacheWrite: field(0, 9),
      },
    }),
    byCompleteness: { complete: 0, partial: 5, unavailable: 4 },
  },
  cacheEfficiency: {
    eligibleEvents: 5,
    eligibleInputTokens: 171_000,
    eligibleCacheReadTokens: 120_000,
    cacheReadShare: 120_000 / 171_000,
    cacheReadUnavailableEvents: 4,
    ineligibleEvents: 4,
  },
}

const partialDay: LLMDailyUsageSummaryContent = {
  chatKey: 'all',
  day: '2026-10-17',
  rulesVersion: 3,
  total: {
    ...totals({
      count: 15,
      confirmed: 6,
      unknown: 9,
      chargedMicroUSD: 214_000,
      chargeUnknown: 9,
      listValueMicroUSD: 624_000,
      listValueUnknown: 4,
      tokens: {
        input: field(81_400, 4),
        output: field(10_400, 4),
        cacheRead: field(132_800, 4),
        cacheWrite: field(0, 9),
      },
    }),
    byCompleteness: { complete: 6, partial: 5, unavailable: 4 },
  },
  cohorts: [cursorPlan, apiGpt],
  tools: [],
  unattributed: unattributed({
    'no-tool-calls': measures({ count: 6, chargedMicroUSD: 214_000, listValueMicroUSD: 214_000 }),
    'cli-run-level': measures({
      count: 9,
      chargeUnknown: 9,
      listValueMicroUSD: 410_000,
      listValueUnknown: 4,
    }),
  }),
  cacheAnomalyRule: RULE,
  cacheAnomalies: [],
}

const unknownDay: LLMDailyUsageSummaryContent = {
  ...partialDay,
  day: '2026-10-16',
  total: {
    ...totals({
      count: 4,
      unknown: 4,
      chargeUnknown: 4,
      listValueUnknown: 4,
      tokens: {
        input: field(0, 4),
        output: field(0, 4),
        cacheRead: field(0, 4),
        cacheWrite: field(0, 4),
      },
    }),
    byCompleteness: { complete: 0, partial: 0, unavailable: 4 },
  },
  cohorts: [],
  unattributed: unattributed({
    'cli-run-level': measures({ count: 4, chargeUnknown: 4, listValueUnknown: 4 }),
  }),
}

const cacheDrop: CacheEfficiencyAnomaly = {
  source: 'api',
  provider: 'anthropic',
  model: 'claude-opus-5',
  kind: 'drop',
  metric: 'cache-read-share',
  share: 0.18,
  baseline: 0.79,
  absoluteChange: -0.61,
  relativeChange: -0.772,
  baselineDays: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'],
  eligibleEvents: 14,
  eligibleInputTokens: 491_300,
  eligibleCacheReadTokens: 88_434,
  rule: RULE,
}

const anomalyDay: LLMDailyUsageSummaryContent = {
  ...completeDay,
  day: '2026-10-19',
  cohorts: [{ ...apiOpus, cacheEfficiency: efficiency(491_300, 88_434, 14) }, apiGpt],
  cacheAnomalies: [cacheDrop],
}

function Settings({ summaries }: { summaries: LLMDailyUsageSummaryContent[] }) {
  return (
    <div className="max-w-4xl">
      <UsageSettingsView
        view={dailyUsageView(summaries)}
        days={7}
        onDaysChange={() => {}}
        loading={false}
        onRebuild={() => {}}
        rebuilding={false}
      />
    </div>
  )
}

const ledger: UsageModalCostAggregate = {
  chatKey: 'PROJECT:thefactory-ui',
  totalCostUSD: 3.4125,
  totalPromptTokens: 93_100,
  totalCompletionTokens: 25_200,
  totalCachedReadInputTokens: 508_000,
  totalCacheWriteInputTokens: 61_200,
  totalUnpricedTokens: 12_400,
  totalIncludedTokens: 177_300,
  totalListCostUSD: 3.8225,
  breakdown: {
    'anthropic:claude-opus-5': {
      provider: 'anthropic',
      model: 'claude-opus-5',
      billing: 'metered',
      costUSD: 3.4125,
      promptTokens: 42_100,
      completionTokens: 18_900,
      cachedReadInputTokens: 388_000,
      cacheWriteInputTokens: 61_200,
      count: 14,
      listCostUSD: 3.4125,
    },
    'cursor:composer-2.5 (subscription)': {
      provider: 'cursor',
      model: 'composer-2.5',
      label: 'Composer 2.5',
      billing: 'subscription',
      costUSD: 0,
      promptTokens: 51_000,
      completionTokens: 6_300,
      cachedReadInputTokens: 120_000,
      cacheWriteInputTokens: 0,
      count: 9,
      includedTokens: 177_300,
      listCostUSD: 0.41,
      unlistedTokens: 12_400,
      tokensNotReported: true,
      tokenFieldsNotReported: ['cacheRead', 'cacheWrite'],
    },
  },
}

const cliRow = (over: Partial<ModelSpend>): ModelSpend => ({
  provider: 'anthropic',
  model: 'claude-sonnet-5',
  billing: 'metered',
  inputTokens: 1_850,
  outputTokens: 940,
  cacheReadTokens: 42_000,
  cacheWriteTokens: 0,
  costUsd: 0.031,
  listCostUsd: 0.031,
  ...over,
})

const messages: UsageModalMessage[] = [
  {
    role: 'assistant',
    usage: {
      promptTokens: 1_850,
      completionTokens: 940,
      byModel: [
        cliRow({
          tokenFields: { cacheWrite: 'unavailable' },
          incompleteReasons: ['cache-not-reported', 'interrupted'],
        }),
      ],
    },
  },
  {
    role: 'assistant',
    usage: {
      promptTokens: 2_400,
      completionTokens: 0,
      byModel: [
        cliRow({
          model: 'claude-haiku-5',
          inputTokens: 2_400,
          outputTokens: 0,
          cacheReadTokens: 0,
          costUsd: undefined,
          listCostUsd: undefined,
          outputTokensNotReported: true,
          tokenFields: { output: 'unavailable', input: 'derived' },
        }),
      ],
    },
  },
]

const apiTurn: UsageModalMessage = {
  role: 'assistant',
  model: { provider: 'openai', model: 'gpt-5.5' },
  usage: {
    promptTokens: 3_200,
    completionTokens: 410,
    cost: 0.0094,
    tokenFields: { cacheRead: 'unavailable', cacheWrite: 'unavailable' },
    incompleteReasons: ['cache-not-reported'],
  },
}

const planTurn: UsageModalMessage = {
  role: 'assistant',
  usage: {
    promptTokens: 5_100,
    completionTokens: 720,
    billing: 'subscription',
    cost: 0,
    byModel: [
      cliRow({
        provider: 'cursor',
        model: 'composer-2.5',
        label: 'Composer 2.5',
        billing: 'subscription',
        inputTokens: 5_100,
        outputTokens: 720,
        cacheReadTokens: 48_000,
        costUsd: 0,
        listCostUsd: 0.0061,
      }),
    ],
  },
}

const noPrice = async () => undefined

export const USAGE_SCENES: Scene[] = [
  {
    id: 'usage-settings',
    title: 'Usage',
    component: 'UsageSettingsView',
    group: 'Settings',
    kind: 'screen',
    description:
      'Settings › Usage: what LLM calls spent each UTC day, by provider and model, with cache anomalies and the spend per tool. A charge no one stated reads unknown, never $0; ≈ marks a list-price estimate.',
    states: [
      {
        id: 'complete-day',
        title: 'Complete day',
        description:
          'Every call reported its counts and charge: plain dollars, cache shares, tools.',
        render: () => <Settings summaries={[completeDay]} />,
      },
      {
        id: 'partial-day',
        title: 'Partial and unknown days',
        description:
          'A plan’s CLI runs leave the charge unknown and some counts unreported; a day whose calls reported nothing reads unknown throughout.',
        render: () => <Settings summaries={[partialDay, unknownDay]} />,
      },
      {
        id: 'cache-anomaly',
        title: 'Cache anomaly',
        description: 'A cohort’s cache-read share dropped well below its usual level.',
        render: () => <Settings summaries={[anomalyDay, completeDay]} />,
      },
      {
        id: 'empty',
        title: 'Nothing summarized',
        render: () => <Settings summaries={[]} />,
      },
    ],
  },
  {
    id: 'usage-modal-provenance',
    title: 'Usage modal: charge and missing counts',
    component: 'UsageModal',
    group: 'Chat',
    description:
      'The usage modal’s Charge column says how sure each charge is, and the line under a row names what its counts lack — a cache count never reported, an output never reported, an estimate.',
    states: [
      {
        id: 'plan-and-api',
        title: 'A plan’s charge and an API turn’s gaps',
        overlay: true,
        description:
          'A plan turn reads Unknown (subscription), never $0; an API turn that never reported its cache counts is short and its charge unknown.',
        render: () => (
          <UsageModal isOpen onClose={() => {}} messages={[planTurn, apiTurn]} getPrice={noPrice} />
        ),
      },
      {
        id: 'charge-and-gaps',
        title: 'Charge status and missing counts',
        overlay: true,
        render: () => (
          <UsageModal
            isOpen
            onClose={() => {}}
            messages={messages}
            chatKey={ledger.chatKey}
            getPrice={noPrice}
            getCost={async () => ledger}
          />
        ),
      },
    ],
  },
]
