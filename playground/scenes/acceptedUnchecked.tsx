import type { ReactNode } from 'react'
import type {
  ProcessAcceptedUnchecked,
  ProcessLedgerEntry,
  ProcessRun,
} from 'thefactory-tools/types'
import { processStepStates } from 'thefactory-tools/utils'
import { StepsStrip } from 'thefactory-ui/web'
import {
  acceptedVerifyAttempt,
  featureVerifyView,
  processRunStripEntries,
  STEPS_STRIP_LABELS,
  verifyAttemptFacts,
  verifySectionProps,
  type DependencyResolution,
} from 'thefactory-ui/headless'
// Not on the package's public surface: the pipeline draws its rows, a feature's stage chips and a
// step's preview itself, and the sign-off its sections. The showcase reaches into the source for
// them, as the playground renders the library from source.
import FeatureReviewSection from '../../src/web/compound/process/FeatureReviewSection'
import { PipelineNode } from '../../src/web/compound/process/ProcessPipeline'
import StepPreview, { StageChips } from '../../src/web/compound/process/pipeline/StepPreview'
import type { Scene } from '../showcase/types'

const noop = () => {}
const chosen = async () => true
const resolved = async () => {}
const NOW = Date.parse('2026-10-20T09:00:00Z')
const unresolved = (id: string): DependencyResolution => ({
  id,
  code: 'STORY_NOT_FOUND',
  message: '',
})

const STORY_ID = '9d89350a-f31e-436d-be7d-fbc2842bffd4'
const FEATURE_ID = '2fe5f472-78c6-473e-ad25-a774607cca9c'
const FIX_RUN_ID = '430fd523-2a94-45b3-8b29-7ed48dd42d60'
const FEATURE_RUN_ID = 'e0ba3040-0000-4000-8000-000000000000'

const entry = (stepId: string, over: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry => ({
  id: `${stepId}-1`,
  stepId,
  iteration: 1,
  status: 'done',
  outcome: 'passed',
  startedAt: 0,
  endedAt: 0,
  ...over,
})

const VERIFY_BY_YOU: ProcessAcceptedUnchecked = {
  stepId: 'verify',
  stepName: 'Verify',
  at: 1792430645641,
  decidedBy: 'person',
  note: '8 new-screen afters at 0f031b0 are filed under run 2419c65f.',
}

const REPORT_BY_MANAGER: ProcessAcceptedUnchecked = {
  stepId: 'report',
  stepName: 'Report',
  at: 1792431133893,
  decidedBy: 'manager',
}

/** The story run's own pipeline, stopped at its sign-off — as run ff1aa45c stood. */
function storyRun(fix: ProcessLedgerEntry): ProcessRun {
  return {
    id: 'ff1aa45c-afc7-4324-b8e2-2fe05de1f874',
    projectId: 'thefactory-ui',
    storyId: STORY_ID,
    title: 'Agent-to-agent chat messaging: approval preview',
    status: 'parked',
    park: { reason: 'gate', stepId: 'sign-off', message: 'Ready to sign off.', parkedAt: NOW },
    cursor: { stepId: 'sign-off', iteration: 1 },
    loopCounts: {},
    startedAt: 0,
    updatedAt: NOW,
    plan: {
      definitionId: 'story',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Story',
      steps: [
        {
          id: `features:${FEATURE_ID}`,
          name: 'Approval-card preview for sendChatMessage',
          kind: 'process',
          subject: { kind: 'feature', id: FEATURE_ID },
        },
        { id: 'fix', name: 'Fix', kind: 'process' },
        { id: 'walkthrough', name: 'Walkthrough', kind: 'capture' },
        { id: 'code-review', name: 'Code review', kind: 'judge' },
        { id: 'report', name: 'Report', kind: 'report' },
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      ],
      loops: [],
      frozenAt: 0,
    },
    ledger: [
      entry(`features:${FEATURE_ID}`, {
        childRunId: FEATURE_RUN_ID,
        summary: '6 of 6 steps passed.',
      }),
      fix,
      entry('walkthrough', { summary: '1 walkthrough recording(s) filed.' }),
      entry('code-review', {
        summary: 'Code review: approved — All four acceptance criteria are met at 0f031b0.',
        review: { verdict: 'approved', reason: 'All four acceptance criteria are met at 0f031b0.' },
      }),
      entry('report', {
        summary: 'Yes — the sendChatMessage approval preview meets every acceptance criterion.',
      }),
      entry('sign-off', { status: 'running', outcome: undefined, endedAt: undefined }),
    ],
  } as ProcessRun
}

/** A plain pass: the Fix run proved every step it ran. */
const STORY_PASSED = storyRun(
  entry('fix', { childRunId: FIX_RUN_ID, summary: '6 of 6 steps passed.' }),
)

/** As run a96d0620 closed its Fix step: you carried its unchecked Verify on. */
const STORY_ACCEPTED_BY_YOU = storyRun(
  entry('fix', {
    childRunId: 'a96d0620-50aa-4473-9b06-c3da9b5a10df',
    summary:
      'Accepted unchecked: Verify was carried on past by you, never proven. 5 of 6 steps passed.',
    acceptedUnchecked: [VERIFY_BY_YOU],
  }),
)

/** As run 430fd523 closed its Fix step: you carried Verify on, its manager the Report. */
const STORY_ACCEPTED_BY_BOTH = storyRun(
  entry('fix', {
    childRunId: FIX_RUN_ID,
    summary:
      'Accepted unchecked: Verify and Report were carried on past by you and the run’s manager, never proven. 4 of 6 steps passed.',
    acceptedUnchecked: [VERIFY_BY_YOU, REPORT_BY_MANAGER],
  }),
)

const verifyAttempt = (n: number, over: Partial<ProcessLedgerEntry>): ProcessLedgerEntry =>
  entry('verify', {
    id: `verify-${n}`,
    iteration: n,
    startedAt: n * 600_000,
    endedAt: n * 600_000 + 252_000,
    runRef: { runId: `verifier-${n}`, chatContextId: `/projects/thefactory-ui/verify-${n}` },
    ...over,
  })

const NOT_SHOWN =
  'This change alters what users see, and nothing showed it on screen (playground/scenes/sendChatMessage.tsx).'

/** The nested Fix run itself — run 430fd523's shape, with its own verify attempts. */
function fixRun(verify: ProcessLedgerEntry[], report: ProcessLedgerEntry): ProcessRun {
  return {
    id: FIX_RUN_ID,
    projectId: 'thefactory-ui',
    title: 'Fix',
    parentRunId: 'ff1aa45c-afc7-4324-b8e2-2fe05de1f874',
    parentStepId: 'fix',
    status: 'succeeded',
    loopCounts: {},
    startedAt: 0,
    updatedAt: NOW,
    endedAt: NOW,
    plan: {
      definitionId: 'fix',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Fix',
      steps: [
        { id: 'implement', name: 'Fix', kind: 'agent', agentType: 'developer' },
        { id: 'checks', name: 'Checks', kind: 'check' },
        { id: 'code-review', name: 'Code review', kind: 'judge' },
        { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
        { id: 'report', name: 'Report', kind: 'report' },
        { id: 'cleanup', name: 'Cleanup', kind: 'cleanup' },
      ],
      loops: [],
      frozenAt: 0,
    },
    ledger: [
      entry('implement', {
        summary: 'Fixed what was asked at sign-off; the story is walked through again.',
      }),
      entry('checks', {
        summary: 'Build ✓ · Type check ✓ · Format ✓ · Unit tests ✓ — 5131 tests — at 0f031b0',
      }),
      entry('code-review', {
        summary: 'Code review: approved — the showcase scene is ready for Verify to capture.',
        review: { verdict: 'approved', reason: 'The showcase scene is ready for Verify.' },
      }),
      ...verify,
      report,
      entry('cleanup', {
        outcome: 'skipped',
        summary: 'This run has no sign-off of its own: the story run carries out its list.',
      }),
    ],
  } as ProcessRun
}

const FIX_PASSED = fixRun(
  [
    verifyAttempt(1, {
      outcome: 'unchecked',
      summary: NOT_SHOWN,
      override: { choice: 'retry', at: 1, decidedBy: 'person', decidedVia: 'web' },
    }),
    verifyAttempt(2, { summary: 'Verify passed: 8 before/after pairs show the change.' }),
  ],
  entry('report', { summary: 'Yes — the fix meets the request.' }),
)

const FIX_ACCEPTED = fixRun(
  [
    verifyAttempt(1, {
      outcome: 'unchecked',
      summary: NOT_SHOWN,
      override: { choice: 'retry', at: 1, decidedBy: 'person', decidedVia: 'web' },
    }),
    verifyAttempt(2, {
      outcome: 'unchecked',
      summary: NOT_SHOWN,
      override: {
        choice: 'continue',
        at: VERIFY_BY_YOU.at,
        decidedBy: 'person',
        decidedVia: 'web',
        note: VERIFY_BY_YOU.note,
      },
    }),
  ],
  entry('report', {
    outcome: 'unchecked',
    summary: 'Your request is not met: before/after screens — nothing showed it on screen.',
    override: {
      choice: 'continue',
      at: REPORT_BY_MANAGER.at,
      decidedBy: 'manager',
      decidedVia: 'manager',
      toolName: 'answerRunPark',
    },
  }),
)

/** The verify attempt the manager carried on, alone — the other shape of who accepted it. */
const FIX_ACCEPTED_BY_MANAGER = fixRun(
  [
    verifyAttempt(1, {
      outcome: 'unchecked',
      summary: NOT_SHOWN,
      override: {
        choice: 'continue',
        at: 2,
        decidedBy: 'manager',
        decidedVia: 'manager',
        note: 'The verify gate ignored after-only screens; fixed since.',
      },
    }),
  ],
  entry('report', { summary: 'Yes — the fix meets the request.' }),
)

function Frame({ children, width = 820 }: { children: ReactNode; width?: number }) {
  return (
    <div
      className="flex flex-col gap-3 overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-base) p-3"
      style={{ maxWidth: width }}
    >
      {children}
    </div>
  )
}

/** The pipeline's rows for a run, as its page lists them. */
function Rows({ run }: { run: ProcessRun }) {
  return (
    <Frame>
      <ol className="m-0 flex list-none flex-col rounded-xl border border-(--border-subtle) bg-(--surface-raised) p-0 py-1.5">
        {processStepStates(run).map((state) => (
          <PipelineNode
            key={state.step.id}
            run={run}
            root={run}
            state={state}
            now={NOW}
            stopHolder={undefined}
            managerLine={undefined}
            addedTag={undefined}
            resolveDependency={unresolved}
            onChoose={chosen}
            onChangeProof={noop}
            onAnswerRequest={noop}
            onDelegate={resolved}
            onDrill={noop}
            onOpenPanel={noop}
          />
        ))}
      </ol>
    </Frame>
  )
}

/** A Fix step's stages, as its row's chevron opens them. */
function Stages({ child }: { child: ProcessRun }) {
  return (
    <Frame width={640}>
      <StageChips child={child} onOpen={noop} onDrill={noop} />
    </Frame>
  )
}

/** The nested Verify step's preview, with a chip per attempt. */
function Attempts({ run }: { run: ProcessRun }) {
  const state = processStepStates(run).find((s) => s.step.id === 'verify')
  if (!state) return null
  return (
    <Frame width={640}>
      <StepPreview run={run} state={state} kind="attempt" onOpen={noop} onDrill={noop} />
    </Frame>
  )
}

function Strip({ run }: { run: ProcessRun }) {
  const model = { label: STEPS_STRIP_LABELS.steps, entries: processRunStripEntries(run) }
  return (
    <Frame>
      <StepsStrip model={model} />
      <StepsStrip model={model} narrow />
    </Frame>
  )
}

/** The Fix pass's verification in the sign-off: the attempt it was accepted on. */
function SignoffVerify({ run }: { run: ProcessRun }) {
  const attempt = acceptedVerifyAttempt(run)
  if (!attempt) return null
  const view = featureVerifyView(attempt, [])
  const { entry: shown, evidence } = view.accepted
  return (
    <Frame>
      <FeatureReviewSection
        projectId="thefactory-ui"
        kind="overall"
        badge={{ label: 'VERIFY', tone: view.accepted.status.tone }}
        title={view.acceptedLabel}
        facts={verifyAttemptFacts(shown)}
        agents={[]}
        rows={[]}
        verification={undefined}
        statusLine={view.accepted.status}
        {...verifySectionProps(shown, evidence)}
        onOpenPair={noop}
        onRequestImage={noop}
      />
    </Frame>
  )
}

export const ACCEPTED_UNCHECKED_SCENES: Scene[] = [
  {
    id: 'accepted-unchecked',
    title: 'Accepted unchecked',
    component: 'PipelineNode · StageChips · StepPreview · StepsStrip · FeatureReviewSection',
    group: 'Process',
    wide: true,
    description:
      'A step the run carried on past although it was never proven — an unchecked Verify answered with “Accept and carry on”, or a Fix step whose nested run passed only over such steps — reads amber “Accepted unchecked” wherever its status shows, never the green of a pass, and says who accepted it: you or the manager. Each state sits beside its plain-pass base.',
    states: [
      {
        id: 'story-rows-plain-pass',
        title: 'Story rows — plain pass',
        description:
          'Base: the story run at its sign-off, its Fix step a green pass because its nested run proved every step.',
        render: () => <Rows run={STORY_PASSED} />,
      },
      {
        id: 'story-rows-accepted-by-you',
        title: 'Story rows — Fix accepted unchecked by you',
        description:
          'As run a96d0620 closed it: the Fix step wears an amber “!”, the “Accepted unchecked” pill and “Verify accepted by you — never proven”; the plain passes beside it stay green.',
        render: () => <Rows run={STORY_ACCEPTED_BY_YOU} />,
      },
      {
        id: 'story-rows-accepted-by-you-and-manager',
        title: 'Story rows — Fix accepted by you and the manager',
        description:
          'As run 430fd523 closed it: two nested steps carried on past by two people — “Verify accepted by you, Report by the manager — never proven”.',
        render: () => <Rows run={STORY_ACCEPTED_BY_BOTH} />,
      },
      {
        id: 'nested-rows-plain-pass',
        title: 'Nested Fix rows — plain pass',
        description:
          'Base: the Fix run’s own pipeline, its Verify passed on the second attempt and its Report written.',
        render: () => <Rows run={FIX_PASSED} />,
      },
      {
        id: 'nested-rows-accepted',
        title: 'Nested Fix rows — Verify and Report accepted unchecked',
        description:
          'The Fix run’s own steps: Verify carried on past by you on attempt 2, Report by the manager — each amber, never the red of a failure, saying who accepted it.',
        render: () => <Rows run={FIX_ACCEPTED} />,
      },
      {
        id: 'stage-chips-plain-pass',
        title: 'Stage chips — plain pass',
        description: 'Base: the Fix step’s stages, every one a green tick.',
        render: () => <Stages child={FIX_PASSED} />,
      },
      {
        id: 'stage-chips-accepted',
        title: 'Stage chips — accepted unchecked',
        description:
          'Verify and Report tinted amber with “! accepted unchecked”; who accepted each is on their hover.',
        render: () => <Stages child={FIX_ACCEPTED} />,
      },
      {
        id: 'attempt-chips-plain-pass',
        title: 'Verify attempts — plain pass',
        description: 'Base: attempt #1 unproven and tried again, #2 passed in green.',
        render: () => <Attempts run={FIX_PASSED} />,
      },
      {
        id: 'attempt-chips-accepted',
        title: 'Verify attempts — accepted unchecked',
        description:
          'Attempt #1 unproven and tried again stays red; #2, carried on past by you, is amber.',
        render: () => <Attempts run={FIX_ACCEPTED} />,
      },
      {
        id: 'steps-strip-plain-pass',
        title: 'Steps strip — plain pass',
        description: 'Base: wide and narrow, the fold “✓ 5/6” green.',
        render: () => <Strip run={STORY_PASSED} />,
      },
      {
        id: 'steps-strip-accepted',
        title: 'Steps strip — Fix accepted unchecked',
        description:
          'The Fix step’s dot amber on the wide strip; on the narrow one the fold that holds it turns amber, “1 accepted unchecked” on its hover. Where the steps do not fit, as on a phone, the wide strip folds the same way.',
        render: () => <Strip run={STORY_ACCEPTED_BY_BOTH} />,
      },
      {
        id: 'signoff-verify-passed',
        title: 'Sign-off verify — passed',
        description: 'Base: the Fix pass’s verification headed “Verify passed” in green.',
        render: () => <SignoffVerify run={FIX_PASSED} />,
      },
      {
        id: 'signoff-verify-accepted-by-you',
        title: 'Sign-off verify — accepted unchecked by you',
        description:
          'Headed “Accepted unchecked” in amber, “accepted by you” in its attempt line, your note under “Accepted by you”.',
        render: () => <SignoffVerify run={FIX_ACCEPTED} />,
      },
      {
        id: 'signoff-verify-accepted-by-manager',
        title: 'Sign-off verify — accepted unchecked by the manager',
        description:
          'The same section when the manager carried it on: “accepted by the manager”, its note named as the manager’s.',
        render: () => <SignoffVerify run={FIX_ACCEPTED_BY_MANAGER} />,
      },
    ],
  },
]
