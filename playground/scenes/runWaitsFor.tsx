import { useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { ProcessRun, ProcessWaitAction } from 'thefactory-tools/types'
import { processStepStates } from 'thefactory-tools/utils'

import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  processAmendmentView,
  processProposalWaitLine,
  processRunWaitView,
  processWaitConfirmView,
  processWaitForDraftsProblem,
  type DependencyResolution,
  type SyncKVStorage,
} from '../../src/headless'
import type { ProcessWaitForDrafts } from '../../src/headless/utils/processWaitForDraftTypes'
import LaunchWaitFields from '../../src/web/compound/chat/LaunchWaitFields'
import { ProcessGroupLegCard } from '../../src/web/compound/process/ProcessGroupPipeline'
import { ParkBlock, PipelineNode } from '../../src/web/compound/process/ProcessPipeline'
import RunWaitCard from '../../src/web/compound/process/RunWaitCard'
import type { Scene } from '../showcase/types'
import {
  WAIT_AHEAD,
  WAIT_CLEARED,
  WAIT_CONFLICT,
  WAIT_CONFLICT_RESOLVING,
  WAIT_CONTINUED,
  WAIT_DRAFTS_EMPTY,
  WAIT_DRAFTS_FILLED,
  WAIT_DRAFTS_INVALID,
  WAIT_DRAFTS_TWO,
  WAIT_GROUP_ROWS,
  WAIT_ONE_ON_BASE,
  WAIT_PROJECTS,
  WAIT_PROPOSAL,
  WAIT_STOPPED,
  WAIT_WAITING,
} from './runWaitsForFixtures'

const decided = async () => true
const noop = () => undefined
const handedOn = async () => true
const NOW = new Date(2026, 10, 19, 14, 20).getTime()
const unresolved = (id: string): DependencyResolution => ({
  id,
  code: 'STORY_NOT_FOUND',
  message: '',
})
const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const NO_TOKEN = { read: () => null, write: noop }

function Frame({ children, width = 720 }: { children: ReactNode; width?: number }) {
  return <div style={{ maxWidth: width }}>{children}</div>
}

function card(
  run: ProcessRun,
  opts: { pending?: ProcessWaitAction; confirming?: ProcessWaitAction; width?: number } = {},
) {
  const view = processRunWaitView(
    run,
    opts.pending ? { pending: { action: opts.pending, at: Date.now() } } : {},
  )!
  return (
    <Frame {...(opts.width ? { width: opts.width } : {})}>
      <RunWaitCard
        className=""
        view={view}
        confirmOf={(action) => processWaitConfirmView(action, run)}
        onDecide={decided}
        {...(opts.confirming ? { confirming: opts.confirming } : {})}
      />
    </Frame>
  )
}

function legs(width = 720) {
  const [waiting, ...others] = WAIT_GROUP_ROWS
  const view = processRunWaitView(WAIT_WAITING)!
  return (
    <Frame width={width}>
      <div className="grid gap-2 sm:grid-cols-2">
        <ProcessGroupLegCard
          row={waiting!}
          delivery={undefined}
          now={0}
          onOpen={noop}
          onMarkLanded={noop}
          wait={
            <RunWaitCard
              compact
              view={view}
              confirmOf={(action) => processWaitConfirmView(action, WAIT_WAITING)}
              onDecide={decided}
            />
          }
        />
        {others.map((row) => (
          <ProcessGroupLegCard
            key={row.leg.id}
            row={row}
            delivery={undefined}
            now={0}
            onOpen={noop}
            onMarkLanded={noop}
          />
        ))}
      </div>
    </Frame>
  )
}

function Launch({
  start,
  problem,
  checking = false,
  planned = false,
  width = 560,
}: {
  start: ProcessWaitForDrafts
  problem?: string
  checking?: boolean
  planned?: boolean
  width?: number
}) {
  const [drafts, setDrafts] = useState(start)
  const shown = problem ?? processWaitForDraftsProblem(drafts)
  const planLine = planned ? processProposalWaitLine(WAIT_PROPOSAL) : undefined
  return (
    <Frame width={width}>
      <div className="flex flex-col gap-2 rounded-xl border border-(--border-subtle) bg-(--surface-raised) p-3">
        <LaunchWaitFields
          drafts={drafts}
          onChange={setDrafts}
          {...(shown ? { problem: shown } : {})}
          checking={checking}
          {...(planLine ? { planLine } : {})}
          projects={WAIT_PROJECTS}
        />
      </div>
    </Frame>
  )
}

/** Signed out with no backend: each state draws only what it is given. */
function Providers({ children, width = 720 }: { children: ReactNode; width?: number }) {
  return (
    <AuthProvider storage={NO_TOKEN}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <AppSettingsProvider storage={MEMORY}>
          <ProjectsProvider>
            <FilesProvider>
              <MemoryRouter>
                <div
                  className="flex flex-col gap-3 bg-(--surface-base) p-4"
                  style={{ maxWidth: width }}
                >
                  {children}
                </div>
              </MemoryRouter>
            </FilesProvider>
          </ProjectsProvider>
        </AppSettingsProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

/** The pipeline's rows for a run, with the tag of a step added after it started. */
function Rows({ run }: { run: ProcessRun }) {
  const added = processAmendmentView(run).addedSteps
  return (
    <ol className="m-0 flex list-none flex-col rounded-xl border border-(--border-subtle) bg-(--surface-raised) p-0 py-1.5">
      {processStepStates(run).map((state) => (
        <PipelineNode
          key={state.step.id}
          run={run}
          state={state}
          now={NOW}
          stopHolder={undefined}
          managerLine={undefined}
          addedTag={added[state.step.id]}
          resolveDependency={unresolved}
          onDrill={noop}
          onOpenPanel={noop}
        />
      ))}
    </ol>
  )
}

function conflictStop(width?: number) {
  return (
    <Providers {...(width ? { width } : {})}>
      <Rows run={WAIT_CONFLICT} />
      <ParkBlock
        run={WAIT_CONFLICT}
        managerLine={undefined}
        onChoose={noop}
        onChangeProof={noop}
        onAnswerRequest={noop}
        onDelegate={handedOn}
        onDrill={noop}
      />
    </Providers>
  )
}

export const RUN_WAITS_FOR_SCENES: Scene[] = [
  {
    id: 'run-waits-for',
    title: 'Run waits for other work before its proof',
    component: 'RunWaitCard',
    group: 'Process',
    description:
      'A run launched to wait for another ticket’s work builds, checks and reviews now, then waits before its proof until git shows that work on its base branch. The card says what for, since when, and that it carries on by itself — never that it needs you. Continue now and Stop waiting ask first, with an optional note, and show their outcome at once; Wait again takes either back until the run gets to its wait.',
    states: [
      {
        id: 'ahead',
        title: 'On its way to its wait',
        description:
          'Still building: it says what it will wait for. Both ways out are offered already.',
        render: () => card(WAIT_AHEAD),
      },
      {
        id: 'waiting',
        title: 'Waiting',
        description: 'Parked at its wait since 10:42, with where git last found the work.',
        render: () => card(WAIT_WAITING),
      },
      {
        id: 'one-on-base',
        title: 'One of two already on the base',
        description:
          'The headline names only what is still missing; each entry says where it stands.',
        render: () => card(WAIT_ONE_ON_BASE),
      },
      {
        id: 'confirm-continue',
        title: 'Continue now: the confirm',
        description: 'What carrying on does, with an optional note kept on the run.',
        overlay: true,
        render: () => card(WAIT_WAITING, { confirming: 'continue-now' }),
      },
      {
        id: 'confirm-stop',
        title: 'Stop waiting: the confirm',
        overlay: true,
        render: () => card(WAIT_WAITING, { confirming: 'stop-waiting' }),
      },
      {
        id: 'continuing',
        title: 'Continue now on its way',
        description: 'Shown done at once; the buttons come back if the run refuses it.',
        render: () => card(WAIT_WAITING, { pending: 'continue-now' }),
      },
      {
        id: 'cleared',
        title: 'Cleared and carrying on',
        description:
          'Git showed ENG-780 on dev: the base comes in, the checks run again, then the proof.',
        render: () => card(WAIT_CLEARED),
      },
      {
        id: 'continued',
        title: 'Continued early',
        description: 'Who carried on, when and why; Wait again until the run gets to its wait.',
        render: () => card(WAIT_CONTINUED),
      },
      {
        id: 'stopped',
        title: 'Stopped waiting',
        description: 'The run goes on to its proof as its work is; Wait again takes it back.',
        render: () => card(WAIT_STOPPED),
      },
      {
        id: 'phone',
        title: 'On a phone',
        render: () => card(WAIT_ONE_ON_BASE, { width: 390 }),
      },
    ],
  },
  {
    id: 'wait-base-conflict',
    title: 'Conflict bringing the base in at the wait',
    component: 'PipelineNode · ParkBlock (ProcessPipeline)',
    group: 'Process',
    description:
      'Once the work waited for is on the base, the wait brings the base into the work branch. A conflict there stops the run as at any other base-conflict stop: the wait step reads as stopped, not waiting on other work, and the stop offers an agent to resolve it — never the same merge again. Choosing it, by the person or the manager, adds “Resolve conflict” in front of the wait; the wait then checks the merged work before the proof.',
    states: [
      {
        id: 'stop',
        title: 'Stopped on the conflict',
        description:
          'The wait step’s row says what conflicted and that it waits on you; “Have an agent resolve it” leads, “Stop here” after it.',
        render: () => conflictStop(),
      },
      {
        id: 'resolving',
        title: 'An agent resolving it',
        description:
          '“Resolve conflict”, tagged as added, runs in front of the wait; the wait comes next and checks the merge.',
        render: () => (
          <Providers>
            <Rows run={WAIT_CONFLICT_RESOLVING} />
          </Providers>
        ),
      },
      {
        id: 'phone',
        title: 'On a phone',
        render: () => conflictStop(390),
      },
    ],
  },
  {
    id: 'group-leg-waits-for',
    title: 'Group leg waits for other work',
    component: 'ProcessGroupLegCard + RunWaitCard',
    group: 'Process',
    description:
      'A group’s leg that waits for other work reads as waiting, beside legs that carry on: its run’s wait, with Continue now and Stop waiting on the leg itself.',
    states: [
      { id: 'beside-others', title: 'Beside legs that carry on', render: () => legs() },
      { id: 'phone', title: 'On a phone', render: () => legs(390) },
    ],
  },
  {
    id: 'launch-waits-for',
    title: 'Launch: wait for other work before proof',
    component: 'LaunchWaitFields',
    group: 'Process',
    description:
      'The launch card, single or per group leg, can add work to wait for before the proof: a label, and a branch, commit or pull request link read by its shape, with the project whose base must hold it. The launch preview’s reason shows when it refuses it, and where the plan waits when it takes it.',
    states: [
      {
        id: 'empty',
        title: 'Not used',
        render: () => <Launch start={WAIT_DRAFTS_EMPTY} />,
      },
      {
        id: 'filled',
        title: 'Filled, as the preview planned it',
        render: () => <Launch start={WAIT_DRAFTS_FILLED} planned />,
      },
      {
        id: 'two',
        title: 'Two entries, one in another project',
        render: () => <Launch start={WAIT_DRAFTS_TWO} checking />,
      },
      {
        id: 'invalid',
        title: 'Refused by the preview',
        description:
          'The preview’s 400 reason, under the entries; the launch waits until it is fixed.',
        render: () => <Launch start={WAIT_DRAFTS_INVALID} />,
      },
      {
        id: 'phone',
        title: 'On a phone',
        render: () => <Launch start={WAIT_DRAFTS_TWO} planned width={390} />,
      },
    ],
  },
]
