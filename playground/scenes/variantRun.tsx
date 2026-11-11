import { useEffect, useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  FilesProvider,
  PROCESS_ACCEPT_REPORT_COPY,
  processRunLaunchGrant,
  useProjects,
} from 'thefactory-ui/headless'
import { ModelChip, ProcessesView } from 'thefactory-ui/web'
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import ProcessPipeline from '../../src/web/compound/process/ProcessPipeline'
import ProcessInputsEditor from '../../src/web/compound/process/ProcessInputsEditor'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import {
  FAKE_VARIANT_NOTES,
  FAKE_VARIANT_PROCESS,
  FAKE_VARIANT_RUN_ID,
  FAKE_VARIANT_TEXTS,
  FAKE_VARIANT_VALUES,
  fakeVariantChildRun,
  fakeVariantEvidence,
  fakeVariantPreview,
  fakeVariantRun,
  type FakeVariantRunState,
} from '../../src/fakeBackend/fixtures/variantRun'
import type { Scene } from '../showcase/types'
import { Click } from './clickOnce'
import { OnFixtures, type FixtureRoutes } from './onFixtures'

const noop = () => {}

function InProject({ children }: { children: ReactNode }) {
  const { projects, activeProjectId, setActiveProjectId } = useProjects()
  useEffect(() => {
    if (projects.length > 0 && activeProjectId !== FAKE_PROJECT_ID) {
      setActiveProjectId(FAKE_PROJECT_ID)
    }
  }, [projects, activeProjectId, setActiveProjectId])
  return activeProjectId === FAKE_PROJECT_ID ? children : null
}

/**
 * The routes a run of variants reads: the run, its evidence, the notes behind
 * the reports, and what its sign-off offers.
 */
function runRoutes(state: FakeVariantRunState, nothingToMerge: boolean): FixtureRoutes {
  const child = (id: string) => id.replace('run-variant-', '') as 'current' | 'short' | 'morning'
  return {
    '/api/v1/process-runs/{runId}': ({ runId }) =>
      runId === FAKE_VARIANT_RUN_ID
        ? fakeVariantRun(state)
        : fakeVariantChildRun(state, child(runId ?? '')),
    '/api/v1/process-runs/{runId}/evidence': () => fakeVariantEvidence(state),
    '/api/v1/process-runs/{runId}/integration-options': () => ({
      title: 'Sign-up trial',
      commits: [],
      fastForward: true,
      identities: [],
      accounts: [],
      defaults: {},
      ...(nothingToMerge ? { nothingToMerge: true } : {}),
    }),
    'POST /api/v1/projects/{projectId}/review-evidence/texts': (_, __, body) =>
      ((body as { ids?: string[] })?.ids ?? []).flatMap((id) =>
        FAKE_VARIANT_TEXTS[id] ? [{ id, text: FAKE_VARIANT_TEXTS[id] }] : [],
      ),
    '/api/v1/projects/{projectId}/review-evidence/{evidenceId}/content': () => '',
    '/api/v1/process-runs/{runId}/ticket-post': () => ({ tickets: [] }),
    '/api/v1/process-runs/{runId}/diagnostics': () => ({}),
    '/api/v1/process-runs/{runId}/cleanup': () => ({ items: [], off: false }),
  }
}

function Run({
  state,
  nothingToMerge = true,
  open,
}: {
  state: FakeVariantRunState
  nothingToMerge?: boolean
  open?: string
}) {
  return (
    <OnFixtures routes={runRoutes(state, nothingToMerge)}>
      <FilesProvider>
        <MemoryRouter>
          <div className="h-[920px] w-full max-w-[1180px] overflow-auto">
            <InProject>
              <Click label={open}>
                <ProcessPipeline runId={FAKE_VARIANT_RUN_ID} />
              </Click>
            </InProject>
          </div>
        </MemoryRouter>
      </FilesProvider>
    </OnFixtures>
  )
}

/** The launch card's agent picker, as a host fills it in. */
function AgentChip() {
  return (
    <ModelChip
      editable
      model="sonnet"
      activeConfig={{ id: 'cfg', name: 'Sonnet', provider: 'anthropic', model: 'sonnet' }}
      recents={[]}
      configs={[]}
      onPick={noop}
      onOpenSettings={noop}
      getPrice={async () => undefined}
      useCli
      onToggleUseCli={noop}
      enabledClis={['claude-code']}
      activeCli="claude-code"
      onPickCli={noop}
      cliModels={[]}
      onPickCliModel={noop}
    />
  )
}

const launchRoutes = (problem?: string): FixtureRoutes => ({
  'POST /api/v1/process-runs/preview': () => fakeVariantPreview(problem),
  '/api/v1/projects/{projectId}/notes': () => FAKE_VARIANT_NOTES,
  '/api/v1/process-runs/statistics': () => [],
})

function Launch({ asked }: { asked?: Record<string, unknown> }) {
  const grant = processRunLaunchGrant({
    processId: 'try-variants',
    chatRunner: 'cli',
    ...(asked ? { agent: { inputValues: asked } } : {}),
    onLaunch: async () => {},
    onCancel: noop,
  })
  return (
    <OnFixtures routes={launchRoutes()}>
      <FilesProvider>
        <MemoryRouter>
          <div className="w-full max-w-[720px]">
            <InProject>
              <ApprovalPanel
                grant={grant}
                projectId={FAKE_PROJECT_ID}
                onDecideLater={noop}
                renderModelChip={() => <AgentChip />}
              />
            </InProject>
          </div>
        </MemoryRouter>
      </FilesProvider>
    </OnFixtures>
  )
}

const TWO_LABELS = {
  ...FAKE_VARIANT_VALUES,
  variants: FAKE_VARIANT_VALUES.variants.map((variant, at) =>
    at === 2 ? { ...variant, id: 'short', label: 'Short sign-up' } : variant,
  ),
}

function Library() {
  return (
    <OnFixtures
      routes={{
        '/api/v1/processes': () => [FAKE_VARIANT_PROCESS],
        '/api/v1/process-runs/statistics': () => [],
      }}
    >
      <MemoryRouter>
        <div className="h-[420px] w-full">
          <InProject>
            <ProcessesView selectedProcessId="try-variants" />
          </InProject>
        </div>
      </MemoryRouter>
    </OnFixtures>
  )
}

function InputsEditor() {
  const [definition, setDefinition] = useState({
    ...FAKE_VARIANT_PROCESS,
    id: 'my-trial',
    seeded: false,
  })
  return (
    <div className="w-full max-w-[720px]">
      <ProcessInputsEditor definition={definition} onChange={setDefinition as never} />
    </div>
  )
}

export const VARIANT_RUN_SCENES: Scene[] = [
  {
    id: 'process-launch-form',
    title: 'Launch form from process inputs',
    component: 'ProcessRunLaunchPanel',
    group: 'Process',
    description:
      'Design proposal 84752bca, one card: today’s launch card with the process’s typed inputs on it. Each variant folds to one line of its refs and patches. Replaces the plain approval for startProcessRun; the same card opens from a page.',
    states: [
      {
        id: 'blank',
        title: 'Blank',
        description: 'Nothing filled. One blank variant is open, and Start run says why it waits.',
        render: () => <Launch />,
      },
      {
        id: 'filled',
        title: 'Filled',
        description:
          'Variants fold to their refs and patches. The agent is picked as on every launch card.',
        render: () => <Launch asked={FAKE_VARIANT_VALUES} />,
      },
      {
        id: 'problem',
        title: 'Problem',
        description:
          'Two variants share a label: the row opens, its field is marked, and the line by Start run says what a launch would refuse.',
        render: () => <Launch asked={TWO_LABELS} />,
      },
    ],
  },
  {
    id: 'variant-pipeline',
    title: 'Variant rows in a run pipeline',
    component: 'ProcessVariantLanes',
    group: 'Process',
    wide: true,
    description:
      'A lane per variant: the run fanned out for it, its steps, status, time and cost, and the last thing it filed by its own label. The real ProcessPipeline on fixtures. A lane opens the variant’s page; Report opens the report at any time..',
    states: [
      {
        id: 'running',
        title: 'Running',
        description:
          'One variant still in its script step, two in review after it. Each lane shows its own steps.',
        render: () => <Run state="running" />,
      },
      {
        id: 'parked',
        title: 'One variant parked',
        description:
          'The variant whose script stopped short leads the page; the others keep going.',
        render: () => <Run state="parked" />,
      },
      {
        id: 'done',
        title: 'All done',
        description: 'Back on the lanes at sign-off: The report is ready.',
        render: () => <Run state="done" open="Lanes" />,
      },
      {
        id: 'variant-page',
        title: 'A variant’s page',
        description:
          'A lane opens its variant: what it filed in the order filed, its script step’s log, then its steps.',
        render: () => <Run state="running" open="Short sign-up" />,
      },
      {
        id: 'variant-page-stopped',
        title: 'A stopped variant’s page',
        description:
          'The script stopped short: its step log ends where it stopped, with the screenshot of where.',
        render: () => <Run state="parked" open="Short sign-up" />,
      },
    ],
  },
  {
    id: 'variant-report',
    title: 'Variant report at sign-off',
    component: 'ProcessVariantReport, RunReportReview',
    group: 'Process',
    wide: true,
    description:
      'Design proposal 06cdc224, by variant: the decision, the final report, then a section per variant, all read from GET /process-runs/:runId/evidence with no story. Nothing to merge makes it Accept report with no merge chooser.',
    states: [
      {
        id: 'running',
        title: 'Running',
        description: 'The final report waits; what is filed so far is below.',
        render: () => <Run state="running" open="Report" />,
      },
      {
        id: 'parked',
        title: 'One variant parked',
        description: 'What the stopped variant needs still leads.',
        render: () => <Run state="parked" open="Report" />,
      },
      {
        id: 'done',
        title: 'All done',
        description: 'Accept report leads: nothing changed, so there is nothing to merge.',
        render: () => <Run state="done" />,
      },
      {
        id: 'variant-open',
        title: 'A variant open',
        description:
          'Recordings beside the reports, each in the order filed and by its own label, then the script step’s log. The one the backend no longer vouches for says Not proof and is left out of the count.',
        render: () => <Run state="done" open="Morning reminder" />,
      },
      {
        id: 'with-changes',
        title: 'Work to merge',
        description: 'A run with commits keeps Approve and its merge chooser.',
        render: () => <Run state="done" nothingToMerge={false} />,
      },
      {
        id: 'accepted-copy',
        title: 'Accepted',
        description: 'What the page says once the report is accepted.',
        render: () => (
          <div className="w-full max-w-[640px] rounded-lg border border-(--status-done-soft-border) bg-(--status-done-soft-bg) px-3 py-2.5 text-[13px] text-(--text-primary)">
            {PROCESS_ACCEPT_REPORT_COPY.accepted}
          </div>
        ),
      },
    ],
  },
  {
    id: 'process-inputs-editor',
    title: 'Process editor: inputs',
    component: 'ProcessInputsEditor, ProcessesView',
    group: 'Process',
    description:
      'The inputs a launch fills, and what a variant holds. A process that ships with Overseer can be edited or copied, never removed.',
    states: [
      { id: 'inputs', title: 'Inputs', render: () => <InputsEditor /> },
      {
        id: 'seeded-detail',
        title: 'A seeded process',
        description: 'Edit and Copy, no Remove: a save makes it the project’s own.',
        render: () => <Library />,
      },
    ],
  },
]
