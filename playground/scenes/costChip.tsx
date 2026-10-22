import type { ModelSpend } from 'thefactory-tools/types'
import { costChipLabel, costDetailsView, type CostSource } from 'thefactory-ui/headless'
import { CostChip } from 'thefactory-ui/web'
// Not on the package's public surface: the chip opens it itself, on hover. The showcase reaches
// into the source to draw it open beside the chip, as the playground renders the library from
// source anyway.
import CostDetailsPanel from '../../src/web/compound/chips/CostDetailsPanel'
import type { Scene } from '../showcase/types'

const SONNET_METERED: ModelSpend = {
  provider: 'anthropic',
  model: 'claude-sonnet-5',
  billing: 'metered',
  inputTokens: 84_000,
  outputTokens: 6_200,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  costUsd: 0.38,
  listCostUsd: 0.38,
}

const SONNET_PLAN: ModelSpend = {
  ...SONNET_METERED,
  billing: 'subscription',
  costUsd: 0,
  listCostUsd: 0.34,
  inputTokens: 76_000,
  outputTokens: 5_400,
}

const { costUsd: _charged, listCostUsd: _list, ...SONNET_UNPRICED } = SONNET_METERED

const CODEX_UNPRICED: ModelSpend = {
  ...SONNET_UNPRICED,
  provider: 'openai',
  model: 'gpt-5.5-codex',
  inputTokens: 40_120,
  outputTokens: 3_010,
  cacheReadTokens: 88_064,
}

const KNOWN: CostSource = { costUsd: 0.38, listCostUsd: 0.38, byModel: [SONNET_METERED] }

const PLAN: CostSource = {
  costUsd: 0,
  includedTokens: 81_400,
  listCostUsd: 0.34,
  byModel: [SONNET_PLAN],
}

const PLAN_AND_KEY: CostSource = {
  costUsd: 0.38,
  includedTokens: 81_400,
  listCostUsd: 0.72,
  byModel: [SONNET_METERED, SONNET_PLAN],
}

const NO_PRICE: CostSource = { unpricedTokens: 131_194, byModel: [CODEX_UNPRICED] }

const NOT_REPORTED: CostSource = {
  byModel: [
    {
      ...CODEX_UNPRICED,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      tokensNotReported: true,
    },
  ],
}

const STILL_GOING: CostSource = {
  byModel: [{ ...SONNET_UNPRICED, chargePending: true }],
}

/** The chip as a run's head shows it, and the details it opens drawn open beneath it. */
function ChipOpen({ cost }: { cost: CostSource }) {
  const view = costDetailsView(cost)
  return (
    <div className="flex flex-col items-start gap-2">
      <CostChip label={costChipLabel(cost) ?? ''} cost={cost} title="This run" />
      {view ? (
        <div className="inline-flex rounded-lg border border-(--border-default) bg-(--surface-raised) p-3">
          <CostDetailsPanel view={view} title="This run" />
        </div>
      ) : null}
    </div>
  )
}

export const COST_CHIP_SCENES: Scene[] = [
  {
    id: 'cost-chip',
    title: 'Cost chip and its details',
    component: 'CostChip · CostDetailsPanel',
    group: 'Process',
    description:
      'A cost chip says the charge in dollars and nothing else: a charge that is not known reads $?, whatever the reason, and the details it opens say why — the plan it ran on, the model with no known price, the tool that did not report its counts, or a run still going.',
    states: [
      {
        id: 'known-charge',
        title: 'Known charge',
        description:
          'The look-alike the unknown states differ from: an API key’s $0.38, no reason.',
        render: () => <ChipOpen cost={KNOWN} />,
      },
      {
        id: 'unknown-subscription',
        title: 'Unknown: subscription',
        description:
          'Ran on a Claude plan: the chip reads $?, the details say the plan includes usage up to its allowance and may bill beyond it.',
        render: () => <ChipOpen cost={PLAN} />,
      },
      {
        id: 'unknown-subscription-and-api-key',
        title: 'Part unknown: subscription beside an API key',
        description:
          'The key’s charge stays in dollars — “$0.38 + $?” — and the plan’s reason states its share in tokens.',
        render: () => <ChipOpen cost={PLAN_AND_KEY} />,
      },
      {
        id: 'unknown-no-price',
        title: 'Unknown: no known price',
        description: 'A metered model with no price: the details name the model.',
        render: () => <ChipOpen cost={NO_PRICE} />,
      },
      {
        id: 'unknown-not-reported',
        title: 'Unknown: counts not reported',
        description: 'A metered turn the CLI reported no counts for: the details name the tool.',
        render: () => <ChipOpen cost={NOT_REPORTED} />,
      },
      {
        id: 'unknown-still-going',
        title: 'Unknown: run still going',
        description:
          'A metered run in flight reads $? too — not “Charge pending” — and the details say it is priced when it ends.',
        render: () => <ChipOpen cost={STILL_GOING} />,
      },
    ],
  },
]
