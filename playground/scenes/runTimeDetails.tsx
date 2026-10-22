import type { ProcessManagerTotals, ProcessTimeBreakdown } from 'thefactory-tools/types'
import { processTimeDetailsView } from 'thefactory-ui/headless'
// Not on the package's public surface: the time chip opens it itself. The showcase reaches into
// the source for it, as the playground renders the library from source anyway.
import TimeDetailsPanel from '../../src/web/compound/chips/TimeDetailsPanel'
import type { Scene } from '../showcase/types'

const MIN = 60_000

const RUN_TIME: ProcessTimeBreakdown = {
  thinkingMs: 9 * MIN,
  toolMs: 16 * MIN,
  systemMs: 3 * MIN,
  otherMs: 0,
  runningMs: 0,
  waitingMs: 12 * MIN,
  tools: [
    { name: 'runProjectCheck', calls: 4, ms: 6 * MIN },
    { name: 'Bash', calls: 37, ms: 4 * MIN },
    { name: 'mobileTestBuildApp', calls: 1, ms: 2 * MIN },
  ],
}
const RUN_WORK_MS = 28 * MIN

const MANAGER_TIME: ProcessTimeBreakdown = {
  thinkingMs: 3 * MIN,
  toolMs: MIN,
  systemMs: 0,
  otherMs: 0,
  runningMs: 0,
  waitingMs: 0,
  tools: [],
}

const METERED: ProcessManagerTotals = {
  turns: 3,
  workMs: 4 * MIN,
  time: MANAGER_TIME,
  costUsd: 0.38,
  byModel: [
    {
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      billing: 'metered',
      inputTokens: 84_000,
      outputTokens: 6_200,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0.38,
    },
  ],
}

const SUBSCRIPTION: ProcessManagerTotals = {
  turns: 3,
  workMs: 4 * MIN,
  time: MANAGER_TIME,
  costUsd: 0,
  includedTokens: 90_200,
  byModel: [
    {
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      billing: 'subscription',
      inputTokens: 84_000,
      outputTokens: 6_200,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0,
    },
  ],
}

/** The run's time details as its header's time chip opens them. */
function Details({ manager }: { manager?: ProcessManagerTotals }) {
  const view = processTimeDetailsView(RUN_TIME, RUN_WORK_MS, manager)
  if (!view) return null
  return (
    <div className="inline-flex rounded-lg border border-(--border-default) bg-(--surface-raised) p-3">
      <TimeDetailsPanel view={view} title="Time worked" />
    </div>
  )
}

export const RUN_TIME_DETAILS_SCENES: Scene[] = [
  {
    id: 'run-time-details',
    title: 'Run time and cost details',
    component: 'TimeDetailsPanel (RunHead time chip)',
    group: 'Process',
    description:
      'What a run’s time chip opens: where the time went, and — once its agent manager took turns on the run — the manager’s line, its cost and time, counted in the total. A subscription’s share reads $?, never $0.00.',
    states: [
      {
        id: 'no-manager',
        title: 'No manager turns',
        description: 'The look-alike it differs from: a run the manager took no turns on.',
        render: () => <Details />,
      },
      {
        id: 'manager-metered',
        title: 'Agent manager, metered',
        description: 'The manager’s three turns: “Agent manager — $0.38 · 4m”.',
        render: () => <Details manager={METERED} />,
      },
      {
        id: 'manager-subscription',
        title: 'Agent manager, subscription',
        description: 'On a plan its share is unknown: “$? · 4m”.',
        render: () => <Details manager={SUBSCRIPTION} />,
      },
    ],
  },
]
