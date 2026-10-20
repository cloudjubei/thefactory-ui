import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { ProcessBaseConflict, ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'
import { processBaseConflictParkMessage } from 'thefactory-tools/utils'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  ProjectsProvider,
  parkNoteCopy,
  parkNoteRequired,
  processDroppedChangeRows,
  signoffDecisionItems,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import DroppedChangesNote from '../../src/web/compound/process/DroppedChangesNote'
import ParkNoteComposer from '../../src/web/compound/process/ParkNoteComposer'
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import SignoffDecisionList from '../../src/web/compound/process/signoff/SignoffDecisionList'
import type { Scene } from '../showcase/types'

const noop = () => {}
const resolved = async () => {}

const TEST_FILE = 'src/routes/completions.integration.test.ts'
const MERGE = 'cf9386d1b7e04a2f9c35d8e6a0b1c2d3e4f5a6b7'
const TIP = '8e41b07c2d9f3a6e5b1c0d7f4a8e2b9c6d3f1a05'
const NOTE = 'dev removed the approval details this test covered, so its test goes too'

const CONFLICT: ProcessBaseConflict = {
  baseRef: 'dev',
  baseSha: '5a0c9e2f7b3d1a8c6e4f2b0d9a7c5e3f1b8d6a42',
  commits: 4,
  paths: [TEST_FILE],
  workSha: TIP,
  keptOneSide: [{ path: TEST_FILE, mergeSha: MERGE, kept: 'base' }],
}

const develop: ProcessLedgerEntry = {
  id: 'develop-1',
  stepId: 'develop',
  iteration: 1,
  status: 'done',
  outcome: 'passed',
  startedAt: 0,
}

const checks: ProcessLedgerEntry = {
  id: 'checks-1',
  stepId: 'checks',
  iteration: 1,
  status: 'done',
  outcome: 'errored',
  startedAt: 1,
  baseConflict: CONFLICT,
}

/** Run 614dc6cf: its checks stopped because an earlier merge of dev kept only dev's side of a test. */
function run(over: Partial<ProcessRun> = {}): ProcessRun {
  return {
    id: '614dc6cf-2b7e-4d1a-9c3f-8a5e0b7d2c41',
    projectId: 'thefactory-backend',
    title: 'Approval details on completions',
    input: { runner: 'cli' },
    status: 'parked',
    loopCounts: {},
    startedAt: 0,
    updatedAt: 0,
    workBranch: {
      name: 'factory/approval-details-on-completions-614dc6cf',
      baseRef: 'dev',
      baseSha: CONFLICT.baseSha,
    },
    workBranchTip: TIP,
    plan: {
      definitionId: 'feature-default',
      definitionScope: 'global',
      definitionVersion: 4,
      name: 'Feature',
      frozenAt: 0,
      steps: [
        { id: 'develop', name: 'Develop', kind: 'agent', agentType: 'developer' },
        { id: 'checks', name: 'Checks', kind: 'check' },
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      ],
      loops: [],
    },
    ledger: [develop, checks],
    park: {
      reason: 'step-errored',
      stepId: 'checks',
      message: processBaseConflictParkMessage(CONFLICT),
      parkedAt: 2,
      baseConflict: CONFLICT,
    },
    ...over,
  }
}

const { park: _stopped, ...afterAccepting } = run({
  status: 'running',
  ledger: [
    develop,
    {
      ...checks,
      override: {
        choice: 'accept-dropped-change',
        at: 3,
        note: NOTE,
        decidedBy: 'person',
        decidedVia: 'web',
      },
    },
    { id: 'checks-2', stepId: 'checks', iteration: 2, status: 'running', startedAt: 4 },
  ],
  droppedChangesAccepted: [
    {
      mergeSha: MERGE,
      files: [{ path: TEST_FILE, kept: 'base' }],
      note: NOTE,
      at: 3,
      stepId: 'checks',
      entryId: 'checks-1',
      decidedBy: 'person',
      decidedVia: 'web',
    },
  ],
  cursor: { stepId: 'checks', iteration: 2 },
})
const ACCEPTED: ProcessRun = afterAccepting

const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const NO_TOKEN = { read: () => null, write: noop }

/** Signed out with no backend and no project in view: nothing is read, so each state draws only what it is given. */
function frame(children: ReactNode): ReactNode {
  return (
    <AuthProvider storage={NO_TOKEN}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <AppSettingsProvider storage={MEMORY}>
          <ProjectsProvider>
            <FilesProvider>
              <MemoryRouter>
                <div className="max-w-[720px] bg-(--surface-base) p-4">{children}</div>
              </MemoryRouter>
            </FilesProvider>
          </ProjectsProvider>
        </AppSettingsProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

export const DROPPED_CHANGE_SCENES: Scene[] = [
  {
    id: 'dropped-change',
    title: 'Accept a dropped change',
    component:
      'ParkBlock (ProcessPipeline) · ParkNoteComposer · DroppedChangesNote · SignoffDecisionList',
    group: 'Process',
    description:
      'An earlier merge of dev into the work branch kept only dev’s side of a test (run 614dc6cf). The checks stop on it, and the person can say dropping the work’s side was right: they must say why, it goes on the run’s record beside the pipeline, the checks run again, and the sign-off lists it with what needs a look.',
    states: [
      {
        id: 'stop-offers-accept',
        title: 'The checks stop on a file a merge kept one side of',
        description:
          '“Accept the dropped change” sits after the lead choice and before “Stop here”, saying it needs a reason, goes on the record and runs the checks again.',
        render: () =>
          frame(
            <ParkBlock
              run={run()}
              managerLine={undefined}
              onChoose={noop}
              onChangeProof={noop}
              onAnswerRequest={noop}
              onDelegate={resolved}
              onDrill={noop}
            />,
          ),
      },
      {
        id: 'accept-note',
        title: 'Why was dropping it right?',
        description:
          'Choosing it opens the note in place of the choices. The reason is the answer: “Accept” stays off while the note is blank — on web, desktop and mobile alike.',
        render: () =>
          frame(
            <ParkNoteComposer
              copy={parkNoteCopy('accept-dropped-change')}
              required={parkNoteRequired('accept-dropped-change')}
              onSend={noop}
              onCancel={noop}
            />,
          ),
      },
      {
        id: 'run-record',
        title: 'On the run’s record',
        description:
          'Beside the pipeline, “Dropped on purpose” lists each accepted file with its merge’s commit chip, who accepted dropping which side, and why.',
        render: () => frame(<DroppedChangesNote run={ACCEPTED} />),
      },
      {
        id: 'signoff-item',
        title: 'In the sign-off’s attention list',
        description:
          'The decision card names each accepted dropped change with what needs a look, in the same words as the run’s record, with nothing to open.',
        render: () =>
          frame(
            <SignoffDecisionList
              items={signoffDecisionItems({
                request: undefined,
                fix: undefined,
                attention: [],
                droppedAccepted: processDroppedChangeRows(ACCEPTED),
              })}
              onOpenPair={noop}
              onShowSection={noop}
              onRequestImage={noop}
            />,
          ),
      },
    ],
  },
]
