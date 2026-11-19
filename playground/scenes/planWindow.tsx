import { useState } from 'react'
import { PlanWindowChip, CliConfigForm } from 'thefactory-ui/web'
import { CliConfigsProvider } from '../../src/headless/contexts/CliConfigsContext'
import { OnFixtures, type FixtureRoutes } from './onFixtures'
import {
  PERSISTED_PLAN_CASES,
  PERSISTED_PLAN_NOW,
  PLAN_WINDOW_FALLBACK_CASES,
  planSettingsRoutes,
  planWindowFallbackRun,
} from './planWindowSettingsFixtures'
import { useCliRunArtifact } from '../../src/headless/hooks/useCliRunArtifact'
import type { CliPlanUsage } from '../../src/headless/utils/planWindowUsageTypes'
import { FAKE_CLI_RUN } from '../../src/fakeBackend/fixtures/cliRuns'
import { RunChangesHead } from '../../src/web/compound/chat/RunChangesHead'
import CliRunArtifactPanel from '../../src/web/compound/chat/CliRunArtifactPanel'
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

const SUBSCRIPTION_WINDOWS_ROUTE = '/api/v1/cli-runs/subscription-windows'

function heldSettingsRoutes() {
  const routes = planSettingsRoutes()
  const windows = routes[SUBSCRIPTION_WINDOWS_ROUTE]!({}, new URLSearchParams())
  let release!: () => void
  const pending = new Promise((resolve) => {
    release = () => resolve(windows)
  })
  return { routes: { ...routes, [SUBSCRIPTION_WINDOWS_ROUTE]: () => pending }, release }
}

function Settings({
  rejected = false,
  pending = false,
}: {
  rejected?: boolean
  pending?: boolean
}) {
  const [held] = useState(() => (pending ? heldSettingsRoutes() : undefined))
  const [released, setReleased] = useState(false)
  // Spread the optional clock across both refs: the base form does not accept it,
  // and does not render plan windows. Neither build needs a global clock override.
  const clock = { planWindowNow: PERSISTED_PLAN_NOW }
  return (
    <OnFixtures routes={held?.routes ?? planSettingsRoutes(rejected)}>
      <CliConfigsProvider>
        <div className="w-full max-w-[1000px]">
          {held ? (
            <button
              type="button"
              className="mb-3 rounded-md border border-(--border-default) px-3 py-1.5 text-sm"
              disabled={released}
              onClick={() => {
                held.release()
                setReleased(true)
              }}
            >
              {released ? 'Fixture response released' : 'Release plan-window response'}
            </button>
          ) : null}
          <CliConfigForm {...clock} />
        </div>
      </CliConfigsProvider>
    </OnFixtures>
  )
}

function CapturedRunHeader({ runId, projectId }: { runId: string; projectId: string }) {
  // Read the optional field from this ref’s real hook. On the base it is absent;
  // the fixture must not normalize the payload or render a replacement chip.
  const run: ReturnType<typeof useCliRunArtifact> & { planUsage?: CliPlanUsage } =
    useCliRunArtifact(runId, projectId)
  if (!run.runModel) return <p role="status">Loading captured run…</p>
  const plan = { planUsage: run.planUsage, now: PERSISTED_PLAN_NOW }
  return <RunChangesHead marker="stage" title="Stage output" model={run.runModel} {...plan} />
}

const capturedRuns = new Map(
  PERSISTED_PLAN_CASES.map((item) => [
    `capture-${item.id}`,
    {
      ...FAKE_CLI_RUN,
      id: `capture-${item.id}`,
      cli: { tool: item.cli, version: 'fixture' },
      subscription: item.subscription,
    },
  ]),
)

const capturedRunRoutes: FixtureRoutes = {
  '/api/v1/cli-runs/{runId}': ({ runId }) => {
    const fallback = PLAN_WINDOW_FALLBACK_CASES.find((item) => `capture-${item.id}` === runId)
    const record = fallback ? planWindowFallbackRun(fallback) : capturedRuns.get(runId ?? '')
    if (!record) throw new Error('No matching captured run')
    return record
  },
}

function CapturedRun({ caseId }: { caseId: string }) {
  const run = capturedRuns.get(`capture-${caseId}`)!
  return (
    <OnFixtures routes={capturedRunRoutes}>
      <CapturedRunHeader runId={run.id} projectId={run.projectId} />
    </OnFixtures>
  )
}

export const PLAN_WINDOW_SCENES: Scene[] = [
  {
    id: 'cli-plan-windows',
    title: 'CLI settings plan windows',
    component: 'CliConfigForm',
    group: 'Settings',
    description:
      'Latest captured window per CLI and login: Codex percentage, Claude five_hour warning, Cursor not reported, and a new login without a window.',
    states: [
      {
        id: 'captured',
        title: 'Captured windows',
        render: () => <Settings key="captured" />,
      },
      {
        id: 'rejected',
        title: 'Claude rejected without utilization',
        render: () => <Settings key="rejected" rejected />,
      },
      {
        id: 'pending',
        title: 'Credentials before plan windows',
        description: 'Wait for the credential rows, then release the held plan-window response.',
        overlay: true,
        render: () => <Settings key="pending" pending />,
      },
    ],
  },
  {
    id: 'cli-run-plan-window',
    title: 'CLI run header plan window',
    component: 'RunChangesHead',
    group: 'Process',
    description: 'A run’s own persisted snapshot in its header. No subscription means no chip.',
    states: [
      ...PERSISTED_PLAN_CASES.map((item) => ({
        id: item.id,
        title: item.label,
        render: () => <CapturedRun key={item.id} caseId={item.id} />,
      })),
      ...PLAN_WINDOW_FALLBACK_CASES.map((item) => ({
        id: item.id,
        title: item.label,
        render: () => {
          const run = planWindowFallbackRun(item)
          const clock = { planWindowNow: PERSISTED_PLAN_NOW }
          return (
            <OnFixtures key={item.id} routes={capturedRunRoutes}>
              <div className="w-full max-w-[860px]">
                <CliRunArtifactPanel runId={run.id} projectId={run.projectId} {...clock} />
              </div>
            </OnFixtures>
          )
        },
      })),
    ],
  },
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
