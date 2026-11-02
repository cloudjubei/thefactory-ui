import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { ProcessLedgerEntry, ProcessPlan, ProcessRun } from 'thefactory-tools/types'
import { processBaseMovedView, runNeedsYouView } from 'thefactory-ui/headless'
import type {
  ProcessBaseMovedView,
  ProcessManagerEscalationView,
  ProcessRunManagerView,
  RunNeedsYouActions,
  UseProcessCleanup,
} from 'thefactory-ui/headless'
import { PROCESS_MANAGER_STATUS_LOOKING } from 'thefactory-tools/constants'
// Not on the package's public surface: the pipeline draws its stop, its steps and its details
// itself. The showcase reaches into the source for them, as the playground renders the library
// from source.
import ToneBadge from '../../src/web/compound/chips/ToneBadge'
import NeedsYouCards from '../../src/web/compound/process/signoff/NeedsYouCards'
import { ParkBlock } from '../../src/web/compound/process/ProcessPipeline'
import RunDetails from '../../src/web/compound/process/RunDetails'
import RunManagerBar from '../../src/web/compound/process/RunManagerBar'
import RunNeedsYouCard from '../../src/web/compound/process/RunNeedsYouCard'
import RunStepsCard from '../../src/web/compound/process/RunStepsCard'
import type { Scene } from '../showcase/types'

const noop = () => {}
const resolved = async () => {}

const FEATURE_PLAN: ProcessPlan = {
  definitionId: 'feature-default',
  definitionScope: 'global',
  definitionVersion: 1,
  name: 'Feature',
  frozenAt: 0,
  steps: [
    { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
    { id: 'checks', name: 'Checks', kind: 'check' },
    { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
    { id: 'code-review', name: 'Code review', kind: 'judge' },
    { id: 'report', name: 'Report', kind: 'report' },
  ],
  loops: [
    { id: 'checks-fix', from: 'checks', to: 'implement', when: ['failed'], maxIterations: 3 },
  ],
}

const entry = (over: Partial<ProcessLedgerEntry> & Pick<ProcessLedgerEntry, 'id' | 'stepId'>) =>
  ({ iteration: 1, status: 'done', outcome: 'passed', startedAt: 0, ...over }) as ProcessLedgerEntry

/** Feature #37.1 of run ce191781 — "One large-file storage interface, local disk first". */
function featureRun(over: Partial<ProcessRun>): ProcessRun {
  return {
    id: 'fe951c01',
    projectId: 'thefactory-tools',
    storyId: 'b8b0d1c4',
    parentRunId: 'ce191781',
    parentStepId: 'features:98f3d22d',
    title: 'One large-file storage interface, local disk first',
    status: 'parked',
    loopCounts: {},
    startedAt: 0,
    updatedAt: 0,
    input: {},
    plan: FEATURE_PLAN,
    ledger: [],
    workBranch: {
      name: 'factory/online-storage-for-large-project-files-ce191781',
      baseRef: 'main',
      baseSha: '105cc1753b1f0f4c2e0d9a8b7c6d5e4f3a2b1c0d',
    },
    ...over,
  }
}

const CHECKS_FAILED = featureRun({
  ledger: [
    entry({ id: 'i1', stepId: 'implement' }),
    entry({ id: 'c1', stepId: 'checks', outcome: 'failed' }),
  ],
  baseMoved: {
    baseRef: 'main',
    baseSha: '89dc2ff022c6b0c67d36a6098bb7444d6d7bc787',
    commits: 2,
  },
  park: {
    reason: 'step-failed',
    stepId: 'checks',
    message: 'Checks failed on #37.1: the type check found 2 errors in test fixtures.',
    parkedAt: 5,
  },
})

const OUT_OF_TURNS = featureRun({
  ledger: [
    entry({
      id: 'i1',
      stepId: 'implement',
      outcome: 'failed',
      turnLimit: { limitTurns: true, maxTurns: 100 },
    }),
  ],
  baseMoved: {
    baseRef: 'main',
    baseSha: '89dc2ff022c6b0c67d36a6098bb7444d6d7bc787',
    commits: 3,
  },
  park: {
    reason: 'turn-limit',
    stepId: 'implement',
    message: 'Implement ran out of turns (100) before it finished.',
    parkedAt: 5,
  },
})

/** The story fix of run #60: it resolved five conflicts but has no tool to conclude the merge. */
const FIXER_BLOCKED = {
  kind: 'blocker' as const,
  agent: 'fixer',
  title: 'The fixer can’t finish merging main into the work',
  detail:
    'I resolved the five source conflicts, but this run gives me no tool to stage them or conclude the merge, and the generated src/tools/generated/ToolSchemas.ts is still conflicted. I need the base-merge tools for this run, or a supported way to regenerate the schema from the merged sources, stage all six files and conclude the merge.',
}

const BLOCKED_FIX = featureRun({
  id: '60-fix',
  storyId: '60',
  parentRunId: '60',
  parentStepId: 'fix',
  title: 'Fix',
  plan: {
    ...FEATURE_PLAN,
    name: 'Fix',
    steps: [{ id: 'implement', name: 'Fix', kind: 'agent', agentType: 'fixer' }],
    loops: [],
  },
  ledger: [
    entry({ id: 'i3', stepId: 'implement', iteration: 3, outcome: 'waiting', ask: FIXER_BLOCKED }),
  ],
  park: {
    reason: 'step-waiting',
    stepId: 'implement',
    ask: FIXER_BLOCKED,
    message: 'Waiting on you: The fixer can’t finish merging main into the work',
    parkedAt: 5,
  },
})

const escalation = (
  over: Partial<ProcessManagerEscalationView> &
    Pick<ProcessManagerEscalationView, 'recommendation' | 'answers'>,
): ProcessManagerEscalationView => ({
  reason: 'It is a choice about scope or the product',
  what: [],
  found: '',
  tried: [],
  runId: 'fe951c01',
  ...over,
})

const CHECKS_FAILED_MANAGER = escalation({
  reason: 'It went the same way after its own retry',
  found:
    'Both type-check errors are in test fixtures the developer did not touch. A separate base-fix run (643089f8) fixed them and the fix is on main at 89dc2ff; the work branch is still on 105cc175, so it has never been checked with that fix.',
  tried: ['Added a handover note and tried Implement again — the checks failed the same way'],
  recommendation:
    'Bring in main first: it has the fix for these two errors, so trying again on this branch would fail the same way.',
  recommendedChoice: 'update-base',
  answers: [
    {
      choice: 'update-base',
      note: 'main now has the fix for the two fixture type-check errors (89dc2ff), and it is merged into your branch. Don’t fix them again. Carry on from your handover note and run the type check on the new head; if it still fails, report the exact errors.',
      why: 'The two errors come from main’s fixtures, and main has fixed them.',
    },
    {
      choice: 'retry',
      label: 'Try again with a note',
      note: 'Leave the two fixture type-check errors alone; they are fixed on main separately. Record them in your handover and finish the storage interface and its tests.',
      why: 'Not on its own: without main’s fix the checks fail the same way.',
    },
  ],
})

const OUT_OF_TURNS_MANAGER = escalation({
  reason: 'Its tries ran out',
  found:
    'The developer was making real progress: the storage interface and the local backend are committed with passing tests, and it spent its last turns on the Design integration. It wrote a handover note before it stopped.',
  tried: ['Added a note for the working agent: Implement turn-limit handover'],
  recommendation: 'Give it more turns and have it carry on from its handover.',
  recommendedChoice: 'retry',
  moreTries: {
    verdict: 'helps',
    why: 'It finished the storage interface and the local backend with passing tests, and ran out partway through the Design integration.',
  },
  answers: [
    {
      choice: 'retry',
      label: 'Raise the limit and carry on from the handover',
      note: 'Carry on from your handover note: the storage interface and the local backend are done. Finish the Design integration and its tests; don’t rework FileStorage again.',
      why: 'It finished two of the three parts in its first 100 turns.',
    },
    {
      choice: 'continue',
      why: 'Only if the Design integration can come in a later feature.',
    },
  ],
})

const STUCK_MANAGER = escalation({
  reason: 'It went the same way after its own retry',
  found:
    'Both attempts spent their turns rewriting FileStorage.put between a streaming and a buffered writer; each version fails the other’s test (the crash-recovery fixture, then the large-file one). The handover notes say the same thing twice.',
  tried: ['Added a handover note and tried Implement again — it went round the same way'],
  recommendation:
    'Don’t raise the limit: decide the writer first. Keep the streaming writer and make the large-file test stream too.',
  recommendedChoice: 'retry',
  moreTries: {
    verdict: 'pointless',
    why: 'It wrote src/file/FileStorage.ts back and forth six times, and each version fails the other’s test.',
  },
  answers: [
    {
      choice: 'retry',
      label: 'Try again with the writer decided',
      note: 'Keep the streaming writer in FileStorage.put — don’t switch to a buffered one again. Change the large-file test to stream its input, keep the crash-recovery fixture as it is, and finish from your handover.',
      why: 'It removes the choice it keeps going round on.',
    },
    {
      choice: 'continue',
      why: 'Only if the writer can be decided in a follow-up feature.',
    },
  ],
})

const MAIN_HAS_IT_MANAGER = escalation({
  reason: 'Its tries ran out',
  found:
    'The developer spent most of its turns writing its own chunked hashing helper for LargeFileStorage, because the branch has none. main gained hashFileChunks in src/file/fileHashUtils.ts two days ago (3 commits since this branch started), with tests.',
  tried: [],
  recommendation:
    'Bring in main and have it use hashFileChunks: more turns on this branch would only finish a second copy of it.',
  recommendedChoice: 'update-base',
  moreTries: {
    verdict: 'pointless',
    why: 'What it is spending its turns on is already on main.',
  },
  answers: [
    {
      choice: 'update-base',
      note: 'main is merged into your branch: use hashFileChunks from src/file/fileHashUtils.ts and delete your own chunked hashing helper. Carry on from your handover note with the Design integration.',
      why: 'main already has the helper it was writing.',
    },
    {
      choice: 'retry',
      label: 'Raise the limit and carry on',
      why: 'Only if the helper must differ from main’s.',
    },
  ],
})

const BLOCKED_MANAGER = escalation({
  reason: 'It needs something the run cannot give',
  runId: '60-fix',
  found:
    'The fixer reports it resolved five source conflicts while merging main 7a555506 into cf655b5 but cannot stage them or finish the merge; the generated src/tools/generated/ToolSchemas.ts still needs regenerating and staging. Its build passed only in an isolated check tree, which did not repair the merge workspace.',
  recommendation:
    'Hand the merge to another agent. The fixer has no tool to stage files or conclude a merge, so telling it more won’t get it further.',
  recommendedChoice: 'delegate',
  answers: [
    {
      choice: 'delegate',
      label: 'Hand the merge to another agent',
      note: 'Finish merging main (7a555506) into the work branch, in the fixer’s own workspace. Keep the fixer’s five resolved files as they are. Regenerate src/tools/generated/ToolSchemas.ts from the merged sources instead of combining the conflict-marked file by hand, stage all six files and conclude the merge. Then tell the fixer the merge is done and on which commit.',
    },
    {
      choice: 'resolved',
      label: 'I finished the merge myself — carry on',
      note: 'The merge of main (7a555506) is concluded on the work branch, with ToolSchemas.ts regenerated. Carry on from your last commit and run the checks on the new head.',
    },
  ],
})

const frame = (node: ReactNode) => (
  <MemoryRouter>
    <div className="flex max-w-[860px] flex-col pb-4">{node}</div>
  </MemoryRouter>
)

const card = (
  run: ProcessRun,
  where: { feature?: string; step: string },
  manager?: ProcessManagerEscalationView,
) =>
  frame(
    <RunNeedsYouCard
      tone={run.park?.reason === 'gate' ? 'review' : 'on_hold'}
      where={
        <>
          {where.feature ? <ToneBadge tone="on_hold">{where.feature}</ToneBadge> : null}
          <ToneBadge tone="on_hold">{where.step}</ToneBadge>
        </>
      }
      onAskManager={noop}
    >
      <ParkBlock
        run={run}
        managerLine={undefined}
        {...(manager ? { manager } : {})}
        embedded
        onChoose={noop}
        onChangeProof={noop}
        onAnswerRequest={noop}
        onDelegate={resolved}
        onDrill={noop}
      />
    </RunNeedsYouCard>,
  )

const LOOKING: NonNullable<ProcessRunManagerView['status']> = {
  state: 'looking',
  text: PROCESS_MANAGER_STATUS_LOOKING,
}

const CLEANUP: UseProcessCleanup = {
  list: {
    runId: 'ce191781',
    off: false,
    hasStep: true,
    items: [
      {
        id: 'project-note:b8b0d1c4:api-cli-tool-loop',
        kind: 'project-note',
        ref: 'api-cli-tool-loop',
        label: 'API and CLI share one native tool-loop paradigm',
        reason: 'A project note the run wrote for its own agents.',
        registeredBy: 'agent',
        defaultSelected: true,
        selected: false,
      },
      {
        id: 'path:b8b0d1c4:.factory/artifacts/review/3ef5a103',
        kind: 'path',
        ref: '.factory/artifacts/review/3ef5a103-1193-4c07-a382-1d3edeaba8d0',
        label: '.factory/artifacts/review/3ef5a103-1193-4c07-a382-1d3edeaba8d0',
        reason: 'A review artifact of an earlier pass.',
        registeredBy: 'host',
        defaultSelected: true,
        selected: true,
      },
    ],
  },
  loadError: null,
  actionError: null,
  busy: false,
  setItemSelected: resolved,
  setOff: resolved,
}

const STEP_ROWS = [
  '#37.1 · 4 of 6 steps passed',
  'Fix · attempt 5 · 5 of 6 steps passed',
  'Walkthrough · every part judged to show nothing on screen',
  'Code review · approved',
  'Report · the local-first storage feature is implemented',
  'Sign-off · approved',
  'Cleanup · removed 104 items, kept 1',
  'Resolve conflict · finished',
  'Checks · Build ✓ · Type check ✓ · Lint ✓ · Format ✓ · Unit tests ✓',
  'Review the resolution · approved',
  'Confirm the merge · needs you',
]

const BASE_MOVED = {
  baseRef: 'main',
  baseSha: '89dc2ff022c6b0c67d36a6098bb7444d6d7bc787',
  commits: 8,
}

/** A run parked on its checks while main moved on 8 commits: bringing main in is offered. */
const BASE_MOVED_PARKED = processBaseMovedView({ ...CHECKS_FAILED, baseMoved: BASE_MOVED })

/** A running run whose main moved on 8 commits: nothing to choose until it stops. */
const BASE_MOVED_RUNNING = processBaseMovedView(
  featureRun({ status: 'running', baseMoved: BASE_MOVED }),
)

/** A run that brought main in twice and has not fallen behind since. */
const BASE_BROUGHT_IN = processBaseMovedView(
  featureRun({
    status: 'running',
    baseUpdates: [
      { ...BASE_MOVED, commits: 3, sha: '4c1e9a0b7d2f3e5a6b8c9d0e1f2a3b4c5d6e7f80', at: 2 },
      { ...BASE_MOVED, sha: '7d2f3e5a6b8c9d0e1f2a3b4c5d6e7f804c1e9a0b', at: 4 },
    ],
  }),
)

const baseOnly = (base: ProcessBaseMovedView | undefined) =>
  frame(<RunDetails workAdded={[]} {...(base ? { base } : {})} onChooseBase={noop} />)

const folds = (stepsOpen: boolean, base?: ProcessBaseMovedView) =>
  frame(
    <>
      <RunStepsCard line="10 of 11 done" total={STEP_ROWS.length} defaultOpen={stepsOpen}>
        <ol className="m-0 flex list-none flex-col p-0">
          {STEP_ROWS.map((row) => (
            <li
              key={row}
              className="border-b border-(--border-subtle) px-5 py-2.5 text-[13px] text-(--text-secondary) last:border-b-0"
            >
              {row}
            </li>
          ))}
        </ol>
      </RunStepsCard>
      <RunDetails
        preRead={{
          summary:
            'The local-first SHA-256 storage interface and Design integration passed scoped review at 3e7000c; online backup and the full cross-process lifecycle remain pending. Confirming the merge is your decision; do not treat the passing checks as clean-dependency proof.',
          items: [],
        }}
        workAdded={[
          'Added 1 Nov 2026: Resolve conflict, Checks, Confirm the merge. The run had finished and was reopened: its earlier approval was set aside (kept in its history), and it comes back for one new sign-off.',
          'Added 1 Nov 2026: Review the resolution. Resolving the conflict changed code the review had approved, so it is reviewed.',
        ]}
        cleanup={CLEANUP}
        {...(base ? { base } : {})}
        onChooseBase={noop}
      />
    </>,
  )

/** The "Needs you" items of run de8dcffe's report, as its sign-off lists them. */
const NEEDS_YOU_ITEMS = [
  'A client that refetches the roll-up only on projects-group:status-updated will miss a member added or removed. That change stays on projects:updated. GET /projects-groups/:id/status returns the current members. Accept that the live signal does not cover membership.',
  'The integration test shows ending unmerged and abandoned. Other endings this route forwards are classified in thefactory-tools. Accept that classification as that package’s work.',
  'Constellation tests cover systemLevel null. A persisted L4 node is not in the suite.',
  'wakeSenderAgent in `src/utils/featureRequestSenderResume.ts` drops a resumeChatAgent result that does not throw, so ask and auto can finish with no log and the sender still idle. The tests do not show that result. Weigh that before relying on a wake.',
]

const ITEM_ACTIONS: RunNeedsYouActions = {
  resolutions: undefined,
  onDiscuss: noop,
  onResolve: noop,
  onTriage: noop,
}

export const RUN_NEEDS_YOU_SCENES: Scene[] = [
  {
    id: 'run-needs-you',
    title: 'What needs you, at the top of a run',
    component: 'RunNeedsYouCard · ParkBlock · ParkAnswers · ManagerLine · RunManagerBar',
    group: 'Process',
    description:
      'The one thing that needs the person leads the run page: where it stopped, what happened, the manager’s word on it in one line (its reasons behind “Why”) and its prepared answers — its pick shown whole with the words it sends, the other answers one click away under “Or:”, accepting and the endings as quiet links under “Also:”, and “Write my own answer” as the last resort. A stop inside a feature is answered here too; the feature’s row only points up to it. Until the manager has its answers, nothing is asked: a slim line says it is looking.',
    states: [
      {
        id: 'feature-checks-failed',
        title: 'Checks failed inside a feature, and main moved',
        description:
          'Feature #37.1’s checks failed on two type-check errors that main has since fixed. The manager’s pick is “Bring in main (2 new commits) and re-check”, with the note it sends; “Try again with a note” is one click away.',
        render: () =>
          card(CHECKS_FAILED, { feature: '#37.1', step: 'Checks' }, CHECKS_FAILED_MANAGER),
      },
      {
        id: 'feature-out-of-turns',
        title: 'An agent ran out of turns inside a feature',
        description:
          'Implement on #37.1 used all 100 turns. The manager says more tries would help — it was making real progress — and its pick raises the limit and has it carry on from its handover note; how many turns, and whether it carries on or starts fresh, sit under the pick.',
        render: () =>
          card(OUT_OF_TURNS, { feature: '#37.1', step: 'Implement' }, OUT_OF_TURNS_MANAGER),
      },
      {
        id: 'feature-out-of-turns-stuck',
        title: 'Out of turns, and more turns won’t help',
        description:
          'The manager says more tries won’t help, with the evidence, and its pick changes the approach instead of raising the limit.',
        render: () => card(OUT_OF_TURNS, { feature: '#37.1', step: 'Implement' }, STUCK_MANAGER),
      },
      {
        id: 'feature-out-of-turns-main-has-it',
        title: 'Out of turns on something main already has',
        description:
          'Out of turns is offered “Bring in main” too. The manager weighs it every time: here the developer spent its turns writing a helper main already has, so its pick brings main in and tells the developer to use it — raising the limit is the other answer.',
        render: () =>
          card(OUT_OF_TURNS, { feature: '#37.1', step: 'Implement' }, MAIN_HAS_IT_MANAGER),
      },
      {
        id: 'agent-blocked',
        title: 'An agent is blocked on something the run cannot give',
        description:
          'The fixer of #60 cannot conclude a merge. The manager’s pick hands the merge to another agent with the brief it starts from; “I finished the merge myself — carry on” is the other answer.',
        render: () => card(BLOCKED_FIX, { step: 'Fix' }, BLOCKED_MANAGER),
      },
      {
        id: 'plain-choices',
        title: 'No answers from the manager',
        description:
          'When the manager is off, or could not write answers, the card offers the stop’s own choices the same way — the stop’s primary choice in front, “Bring in main” among them when main moved.',
        render: () => card(OUT_OF_TURNS, { feature: '#37.1', step: 'Implement' }),
      },
      {
        id: 'manager-looking',
        title: 'The manager is still looking',
        description:
          'Nothing is asked of the person until the manager hands the stop over with its answers.',
        render: () =>
          frame(
            <RunManagerBar
              status={LOOKING}
              headline="Implement ran out of turns (100) before it finished."
            />,
          ),
      },
    ],
  },
  {
    id: 'run-needs-you-items',
    title: 'The report’s “Needs you” items',
    component: 'NeedsYouCards',
    group: 'Process',
    description:
      'At a sign-off, each open item can be discussed or marked fine as it is — and “Sort these out with the manager” hands them all to the manager in the run’s chat at once: weigh each, say how serious it is, and propose fixing it in this run, filing it as a follow-up, or settling it as fine, then act once agreed.',
    states: [
      {
        id: 'open-items',
        title: 'Four items open',
        render: () =>
          frame(
            <div className="mx-3 mt-3">
              <NeedsYouCards
                view={runNeedsYouView(NEEDS_YOU_ITEMS, undefined)}
                actions={ITEM_ACTIONS}
              />
            </div>,
          ),
      },
    ],
  },
  {
    id: 'run-page-folds',
    title: 'What a run keeps folded',
    component: 'RunStepsCard · RunDetails',
    group: 'Process',
    description:
      'Below the decision and the report, the run keeps the rest one click away: its steps under one line of how far it got, and “More about this run” — its base branch once that moved on, the manager’s pre-read, the work added to the run, and its cleanup list — each folded to a line. “Handled for you” is gone, and Debug stays folded. “main has 8 new commits” no longer sits at the top of the run page: it is the “Base branch” line here, and opening it shows what that means and, while the run’s stop offers it, the choice to bring main in and re-check.',
    states: [
      {
        id: 'folded',
        title: 'Folded',
        render: () => folds(false),
      },
      {
        id: 'steps-open',
        title: 'Steps shown',
        render: () => folds(true),
      },
      {
        id: 'base-moved',
        title: 'main moved on',
        description:
          '“Base branch · main has 8 new commits” leads “More about this run”. Opened, it says the work branch does not have them yet and, as the run is stopped on its checks, offers “Bring in main (8 new commits) and re-check”.',
        render: () => folds(false, BASE_MOVED_PARKED),
      },
      {
        id: 'base-moved-only',
        title: 'main moved on, nothing else to show',
        description:
          'A running run with no pre-read, no added work and no cleanup still shows “More about this run” for its base branch alone. Nothing to choose until the run stops.',
        render: () => baseOnly(BASE_MOVED_RUNNING),
      },
      {
        id: 'base-brought-in',
        title: 'main brought in',
        description:
          'Once main was brought in and has not moved on since, the line says “Brought in main · 2 times”; opened, it names the newest time and the commit the work branch is now at.',
        render: () => baseOnly(BASE_BROUGHT_IN),
      },
    ],
  },
]
