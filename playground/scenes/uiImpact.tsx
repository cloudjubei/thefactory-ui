import type { ReactNode } from 'react'
import type { ChangeScreensDecision, ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'
import {
  ApiProvider,
  AuthProvider,
  checkCallout,
  checkMethodRows,
  screensDecisionNote,
} from 'thefactory-ui/headless'
// Not on the package's public surface: the pipeline opens the panel, the sign-off draws its
// screens line and the change card its chips itself. The showcase reaches into the source for
// them, as the playground renders the library from source anyway.
import type { VerificationApproachOption } from '../../src/headless/api/generated'
import { CheckChip } from '../../src/web/compound/chips'
import { StepSidePanelView } from '../../src/web/compound/process/pipeline/StepSidePanel'
import ScreensDecisionNote from '../../src/web/compound/process/ScreensDecisionNote'
import type { Scene } from '../showcase/types'

const noop = () => {}
const NO_TOKEN = { read: () => null, write: () => {} }

const PLAN: ProcessRun['plan'] = {
  definitionId: 'feature',
  definitionScope: 'global',
  definitionVersion: 1,
  name: 'Feature',
  steps: [
    { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
    { id: 'code-review', name: 'Code review', kind: 'judge' },
    { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
    { id: 'walkthrough', name: 'Walkthrough', kind: 'capture' },
  ],
  loops: [],
  frozenAt: 0,
}

const entry = (over: Partial<ProcessLedgerEntry>): ProcessLedgerEntry => ({
  id: 'e-implement',
  stepId: 'implement',
  iteration: 1,
  status: 'done',
  outcome: 'passed',
  startedAt: 0,
  endedAt: 10,
  ...over,
})

const IMPLEMENTED = entry({
  summary: 'Points totals are read from the army list’s own field.',
})

const JUDGED_HIDDEN = entry({
  summary: 'Points totals are read from the army list’s own field.',
  uiImpact: {
    visible: false,
    reason: 'Only the points parser changed; every screen draws the same totals.',
    reportedAt: 9,
    by: 'developer',
  },
})

const JUDGED_SHOWN = entry({
  summary: 'The faction’s points cap is sent with the army list.',
  uiImpact: {
    visible: true,
    reason: 'The builder now greys out units over the faction’s points cap.',
    reportedAt: 9,
    by: 'developer',
  },
})

const REVIEWED = entry({
  id: 'e-review',
  stepId: 'code-review',
  startedAt: 11,
  endedAt: 20,
  summary: 'Code review: approved',
  review: { verdict: 'approved', reason: 'The parser change is covered by its tests.' },
})

const REVIEW_DISAGREES = entry({
  id: 'e-review',
  stepId: 'code-review',
  startedAt: 11,
  endedAt: 20,
  summary: 'Code review: changes requested',
  review: {
    verdict: 'changes-requested',
    reason: 'Show the empty army list on screen.',
    uiImpact: {
      visible: true,
      reason: 'An empty army list now reads “No units yet” instead of “0 pts”.',
    },
  },
})

const VERIFIED = entry({
  id: 'e-verify',
  stepId: 'verify',
  startedAt: 21,
  endedAt: 30,
  summary: 'Proven by reading: the totals come from the list’s field, covered by its tests.',
})

const VERIFIER_JUDGED = entry({
  ...VERIFIED,
  uiImpact: {
    visible: false,
    reason: 'Ran the builder before and after: every screen draws the same totals.',
    reportedAt: 29,
    by: 'verifier',
  },
})

const WALKED = entry({
  id: 'e-walkthrough',
  stepId: 'walkthrough',
  outcome: 'skipped',
  startedAt: 31,
  endedAt: 32,
  summary: 'No feature’s proof plan asks for screens, so the story was not walked through.',
})

const WALK_JUDGED = entry({
  ...WALKED,
  summary:
    'Every part of the story was judged to show nothing on screen, so it was not walked through.',
})

const run = (ledger: ProcessLedgerEntry[]): ProcessRun => ({
  id: 'run-feature',
  projectId: 'wargames',
  title: 'Points totals per faction',
  status: 'running',
  loopCounts: {},
  ledger,
  startedAt: 0,
  updatedAt: 32,
  plan: PLAN,
})

/** The step panel over its pipeline column, as the pipeline opens it for one step. */
function StepPanel({
  ledger,
  stepId,
}: {
  ledger: ProcessLedgerEntry[]
  stepId: string
}): ReactNode {
  const shown = run(ledger)
  return (
    <AuthProvider storage={NO_TOKEN}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <div className="relative h-[300px] max-w-[760px] overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-base)">
          <StepSidePanelView run={shown} target={{ runId: shown.id, stepId }} onClose={noop} />
        </div>
      </ApiProvider>
    </AuthProvider>
  )
}

const decision = (over: ChangeScreensDecision): ChangeScreensDecision => over

const FILES_DECIDE = decision({
  need: 'required',
  basis: 'files',
  reason: 'It changes files users see: src/builder/ArmyTotal.tsx.',
})

const JUDGED_NOT_VISIBLE = decision({
  need: 'not-required',
  basis: 'judgement',
  reason:
    'The developer judged that users see nothing of this change: Only the points parser changed; every screen draws the same totals.',
})

const DISPUTED = decision({
  need: 'not-required',
  basis: 'judgement',
  reason:
    'The developer judged that users see nothing of this change: A prop rename; the builder draws the same. It changes files users see (src/builder/ArmyTotal.tsx, src/builder/UnitRow.tsx) — the code review checks that judgement.',
  disputedUiPaths: ['src/builder/ArmyTotal.tsx', 'src/builder/UnitRow.tsx'],
})

const REVIEW_OVERRIDES = decision({
  need: 'required',
  basis: 'review',
  reason:
    'The code review judged that users see this change: An empty army list now reads “No units yet” instead of “0 pts”.',
})

/** The sign-off's screens line, in the column it sits in above the evidence. */
function SignoffScreens({ shown }: { shown: ChangeScreensDecision }): ReactNode {
  const note = screensDecisionNote(shown)
  return (
    <div className="max-w-3xl rounded-md bg-(--surface-base) p-4">
      {note ? <ScreensDecisionNote note={note} /> : null}
    </div>
  )
}

const approach = (
  id: string,
  label: string,
  availability: VerificationApproachOption['availability'],
): VerificationApproachOption => ({
  spec: {
    id,
    label,
    proves: label,
    requires: { default: [] },
  } as VerificationApproachOption['spec'],
  availability,
  drivenBy: [],
})

const UNSERVED =
  'The project declares the viewer app but has no way to serve it: it has no viewer/index.html at 91e4ba5.'

const SERVABLE = [
  approach('screenshot-diff', 'Before/after screenshots', { status: 'available' }),
  approach('screen-recording', 'Screen recording', { status: 'available' }),
  approach('code-explanation', 'Written explanation', { status: 'available' }),
]

const UNSERVABLE = [
  approach('screenshot-diff', 'Before/after screenshots', {
    status: 'unservable',
    reason: UNSERVED,
  }),
  approach('screen-recording', 'Screen recording', { status: 'unservable', reason: UNSERVED }),
  approach('code-explanation', 'Written explanation', { status: 'available' }),
]

/** The capture chips of a change, from the approach menu its host offers, with the screens chip's callout open. */
function Chips({ approaches }: { approaches: VerificationApproachOption[] }): ReactNode {
  const rows = checkMethodRows({ verification: undefined, approaches, evidence: [] })
  const capture = rows.filter((r) => r.id === 'screens' || r.id === 'walkthrough')
  const screens = capture.find((r) => r.id === 'screens')
  const callout = screens ? checkCallout(screens) : undefined
  return (
    <div className="flex max-w-xl flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {capture.map((row) => (
          <CheckChip key={row.id} row={row} inert />
        ))}
      </div>
      {callout ? (
        <div className="flex flex-col gap-1 rounded-md border border-(--border-subtle) bg-(--surface-base) px-3 py-2 text-[12px]">
          <span className="text-(--text-primary)">{callout.lead}</span>
          {callout.detail ? (
            <span className="text-(--text-secondary)">{callout.detail}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export const UI_IMPACT_SCENES: Scene[] = [
  {
    id: 'step-ui-impact',
    title: 'What users see, judged per change',
    component: 'StepSidePanel + UiImpactNote',
    group: 'Process',
    description:
      'Whether a change alters what users see is judged for the change, never from the project having an app: the attempt that judged it says so, and the code review may disagree.',
    states: [
      {
        id: 'nothing-judged',
        title: 'Nothing judged',
        description: 'An implement attempt whose agent reported no judgement.',
        render: () => <StepPanel ledger={[IMPLEMENTED]} stepId="implement" />,
      },
      {
        id: 'judged-not-visible',
        title: 'Judged: nothing on screen',
        description: 'The developer judged its change shows nothing on screen, and why.',
        render: () => <StepPanel ledger={[JUDGED_HIDDEN]} stepId="implement" />,
      },
      {
        id: 'judged-visible-no-ui-files',
        title: 'Judged: shows on screen, no UI files',
        description:
          'The developer judged its change visible though it touches no file users see by name.',
        render: () => <StepPanel ledger={[JUDGED_SHOWN]} stepId="implement" />,
      },
      {
        id: 'code-review-agrees',
        title: 'Code review, no view filed',
        description: 'A code review that left the judgement standing.',
        render: () => <StepPanel ledger={[JUDGED_HIDDEN, REVIEWED]} stepId="code-review" />,
      },
      {
        id: 'code-review-overrides',
        title: 'Code review disagrees',
        description:
          'The code review judged the change visible over the developer’s judgement; its view decides.',
        render: () => <StepPanel ledger={[JUDGED_HIDDEN, REVIEW_DISAGREES]} stepId="code-review" />,
      },
      {
        id: 'verify-nothing-judged',
        title: 'Verify, nothing judged',
        description: 'A verify attempt whose verifier reported no judgement.',
        render: () => <StepPanel ledger={[IMPLEMENTED, VERIFIED]} stepId="verify" />,
      },
      {
        id: 'verifier-judgement',
        title: 'Verifier judged it',
        description: 'The verifier examined the change and judged it shows nothing on screen.',
        render: () => <StepPanel ledger={[IMPLEMENTED, VERIFIER_JUDGED]} stepId="verify" />,
      },
      {
        id: 'walkthrough-not-asked',
        title: 'Walkthrough skipped, nothing asked',
        description: 'No plan asks for screens and nothing says the change shows.',
        render: () => <StepPanel ledger={[IMPLEMENTED, WALKED]} stepId="walkthrough" />,
      },
      {
        id: 'walkthrough-judged-nothing-shown',
        title: 'Walkthrough skipped, judged nothing shown',
        description: 'Every part of the story was judged to show nothing on screen.',
        render: () => <StepPanel ledger={[JUDGED_HIDDEN, WALK_JUDGED]} stepId="walkthrough" />,
      },
    ],
  },
  {
    id: 'signoff-screens-decision',
    title: 'Sign-off: screens needed or not',
    component: 'ScreensDecisionNote',
    group: 'Process',
    description:
      'Whether the story’s change must be shown on screen, and what decided it — how its parts were judged, else its files.',
    states: [
      {
        id: 'files-decide',
        title: 'Decided by the files',
        description: 'Nothing was judged: the files users see decide.',
        render: () => <SignoffScreens shown={FILES_DECIDE} />,
      },
      {
        id: 'judged-not-visible',
        title: 'Judged: no screens needed',
        description: 'The developer judged the change shows nothing on screen.',
        render: () => <SignoffScreens shown={JUDGED_NOT_VISIBLE} />,
      },
      {
        id: 'disputed',
        title: 'Judged not visible, UI files changed',
        description:
          'Judged to show nothing though it changes files users see — named for the code review to check.',
        render: () => <SignoffScreens shown={DISPUTED} />,
      },
      {
        id: 'code-review-overrides',
        title: 'Code review overrides',
        description: 'The story code review judged the change visible; its view decides.',
        render: () => <SignoffScreens shown={REVIEW_OVERRIDES} />,
      },
    ],
  },
  {
    id: 'capture-unservable',
    title: 'Capture of a page that cannot be served',
    component: 'CheckChip + checkCallout',
    group: 'Process',
    description:
      'The approach menu reads one serve check: a page the browser tools cannot serve offers no capture, with why — no install hint.',
    states: [
      {
        id: 'capture-available',
        title: 'Capture available',
        description: 'The page can be served: screenshots and a recording can be captured.',
        render: () => <Chips approaches={SERVABLE} />,
      },
      {
        id: 'capture-unservable',
        title: 'Page cannot be served',
        description: 'The declared App has no page at the commit, so nothing can be captured.',
        render: () => <Chips approaches={UNSERVABLE} />,
      },
    ],
  },
]
