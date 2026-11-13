import { PlanWindowChip } from 'thefactory-ui/web'
import { processRunModelChipView } from 'thefactory-ui/headless'
// Not on the package's public surface: the pipeline draws its head itself. The showcase reaches
// into the source for it, as the playground renders the library from source.
import { RunHead } from '../../src/web/compound/process/ProcessPipeline'
import RunModelChip from '../../src/web/compound/chat/signoff/RunModelChip'
import type { Scene } from '../showcase/types'
import {
  PLAN_WINDOW_CASES,
  PLAN_WINDOW_SCENE_ID,
  planWindowCase,
  planWindowRun,
  planWindowView,
  type PlanWindowCase,
} from './planWindowFixtures'

const noop = () => {}

/** The real run header, its model chip with the plan-window chip beside it. */
function Header({ item }: { item: PlanWindowCase }) {
  const run = planWindowRun(item)
  const view = processRunModelChipView(run)
  return (
    <div className="overflow-hidden rounded-lg border border-(--border-subtle)">
      <RunHead
        run={run}
        stopHolder={undefined}
        depth={0}
        now={item.now}
        projectName="TheFactory Tools"
        onCrumb={noop}
        onCancel={noop}
        model={{
          view,
          chip: (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <RunModelChip model={view.model} />
              <PlanWindowChip view={planWindowView(item)} />
            </span>
          ),
        }}
      />
    </div>
  )
}

function Raw({ item }: { item: PlanWindowCase }) {
  return (
    <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-(--surface-muted) p-2 text-[11px] text-(--text-secondary)">
      {item.raw === null ? 'No plan usage in the stream.' : JSON.stringify(item.raw)}
    </pre>
  )
}

function Case({ item }: { item: PlanWindowCase }) {
  return (
    <div className="flex w-full max-w-[860px] flex-col gap-2">
      <Header item={item} />
      <p className="m-0 text-[13px] text-(--text-secondary)">{item.note}</p>
      <Raw item={item} />
    </div>
  )
}

/** Every case side by side on the chip alone. */
function Board() {
  return (
    <div className="flex w-full max-w-[860px] flex-col gap-1.5">
      {PLAN_WINDOW_CASES.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-2">
          <span className="w-[130px] shrink-0 text-[12px] text-(--text-muted)">{c.label}</span>
          <PlanWindowChip view={planWindowView(c)} />
        </div>
      ))}
    </div>
  )
}

export const PLAN_WINDOW_SCENES: Scene[] = [
  {
    id: PLAN_WINDOW_SCENE_ID,
    title: 'Plan window chip',
    component: 'PlanWindowChip',
    group: 'Process',
    description:
      'How much of its CLI plan’s rate-limit windows a run has used, beside the run’s model in its header: the window, a ring with its share (a dot and the status when the CLI sends no share), and when it resets. Every value is read from the CLI’s own payload by codexPlanUsage or claudePlanUsage; the codex free and Claude OK cases are real captures. Decided 2026-11-13: the ring, over a small bar and a words-only pill.',
    states: [
      {
        id: 'board',
        title: 'Every case',
        description: 'Each run’s chip side by side.',
        render: () => <Board />,
      },
      ...PLAN_WINDOW_CASES.map((item) => ({
        id: item.id,
        title: item.label,
        description: item.note,
        render: () => <Case item={item} />,
      })),
    ],
    controls: [
      {
        id: 'case',
        label: 'Run',
        kind: 'choice',
        options: PLAN_WINDOW_CASES.map(({ id, label }) => ({ id, label })),
        default: PLAN_WINDOW_CASES[0]!.id,
      },
    ],
    play: (values) => <Case item={planWindowCase(values.case)} />,
  },
]
