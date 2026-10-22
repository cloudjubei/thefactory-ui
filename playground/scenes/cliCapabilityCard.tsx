import type { RunCliCapabilityCheckResponse } from 'thefactory-ui/headless'
import { cliCapabilityCardView } from '../../src/headless/utils/cliCapabilityCard'
// Not on the package's public surface: CliConfigForm renders it itself. The showcase reaches into
// the source for it, as the playground renders the library from source anyway.
import { CliCapabilityCardPanel } from '../../src/web/compound/settings/CliCapabilityCardPanel'
import type { Scene } from '../showcase/types'

const CARD: RunCliCapabilityCheckResponse = {
  cli: 'claude-code',
  startedAt: '2026-10-19T10:00:00.000Z',
  finishedAt: '',
  probes: [
    {
      id: 'structured-output',
      label: 'Structured output',
      status: 'pass',
      score: 1,
      detail: 'Valid JSON on every case',
      latencyMs: 4_200,
      cases: [],
    },
    {
      id: 'tool-calls',
      label: 'Tool calls',
      status: 'pass',
      score: 1,
      detail: 'Called the tool with the right arguments',
      latencyMs: 6_100,
      cases: [],
    },
  ],
  passed: 2,
  applicable: 2,
  p50LatencyMs: 5_150,
}

/** The card as the CLI settings form shows it under a credential. */
function Card({ card }: { card: RunCliCapabilityCheckResponse }) {
  return (
    <div className="w-[560px] max-w-full">
      <CliCapabilityCardPanel view={cliCapabilityCardView(card)} />
    </div>
  )
}

export const CLI_CAPABILITY_CARD_SCENES: Scene[] = [
  {
    id: 'cli-capability-card',
    title: 'CLI capability check cost',
    component: 'CliCapabilityCardPanel (CliConfigForm)',
    group: 'Settings',
    description:
      'A CLI capability check’s result line says what its calls cost: dollars when every call stated a charge, and $? for a plan’s share — never $0 — with the plan it ran on said beside it, since the card opens no details.',
    states: [
      {
        id: 'api-key-cost',
        title: 'Known cost',
        description:
          'The look-alike the plan states differ from: every call stated its charge, $0.50.',
        render: () => <Card card={{ ...CARD, totalCostUSD: 0.5 }} />,
      },
      {
        id: 'plan-cost',
        title: 'On a plan',
        description:
          'A Claude Code login: “$? — included in your Claude subscription up to its allowance”.',
        render: () => <Card card={{ ...CARD, costUnknown: true }} />,
      },
      {
        id: 'plan-and-api-key-cost',
        title: 'Part on a plan',
        description:
          'Some calls stated a charge and some ran on the plan: “$0.02 + $? — included in your Claude subscription up to its allowance”.',
        render: () => <Card card={{ ...CARD, totalCostUSD: 0.02, costUnknown: true }} />,
      },
    ],
  },
]
