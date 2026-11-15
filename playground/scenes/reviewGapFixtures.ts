import type { ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'

const NO_PROOF =
  'The visible resizing change has no on-screen proof, and the walkthrough was skipped; no later capture step remains.'

const done = (id: string, stepId: string, outcome: ProcessLedgerEntry['outcome']) =>
  ({ id, stepId, iteration: 1, status: 'done', outcome, startedAt: 0 }) as ProcessLedgerEntry

const review = (over: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry => ({
  id: 'review-1',
  stepId: 'code-review',
  iteration: 1,
  status: 'done',
  outcome: 'unchecked',
  startedAt: 2,
  summary: `Code review: changes requested — ${NO_PROOF} The review says only the proof is missing, not that the code is wrong — so nothing goes back to the developer, and you decide.`,
  review: { verdict: 'changes-requested', reason: NO_PROOF, cause: 'proof-impossible' },
  ...over,
})

/** A story run stopped at its code review, which asked only for proof no later step can capture. */
export function reviewGapRun(over: Partial<ProcessRun> = {}): ProcessRun {
  return {
    id: '3c1d7a52-0e94-4b6f-a8d2-5f7e1c9b4a60',
    projectId: 'mobile-app',
    title: 'Keep long profile text visible while editing',
    storyId: '8e2f4b17-6c3a-4d59-b0e1-7a9c2d5f3b84',
    status: 'parked',
    loopCounts: {},
    startedAt: 0,
    updatedAt: 3,
    plan: {
      definitionId: 'story-default',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Story',
      frozenAt: 0,
      steps: [
        { id: 'features', name: 'Features', kind: 'process' },
        { id: 'walkthrough', name: 'Walkthrough', kind: 'capture' },
        { id: 'code-review', name: 'Code review', kind: 'judge' },
        { id: 'report', name: 'Report', kind: 'report' },
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      ],
      loops: [
        { id: 'auto-fix', from: 'code-review', to: 'features', when: ['failed'], maxIterations: 3 },
      ],
    },
    ledger: [
      done('features-1', 'features', 'passed'),
      done('walkthrough-1', 'walkthrough', 'skipped'),
      review(),
    ],
    park: {
      reason: 'step-unchecked',
      stepId: 'code-review',
      message: 'Code review could not check anything, so nothing was proven.',
      parkedAt: 3,
    },
    ...over,
  }
}

/** The same stop while this host cannot capture screens for the project: no recapture, and why. */
export const REVIEW_GAP_BLOCKED_RUN = reviewGapRun({
  proofUnavailable: [
    {
      kind: 'ui-before-after',
      reason:
        'Device automation is off for this project — only an explicit opt-in turns it on — so its runs drive no emulator or simulator.',
    },
    {
      kind: 'ui-video',
      reason:
        'Device automation is off for this project — only an explicit opt-in turns it on — so its runs drive no emulator or simulator.',
    },
  ],
})

/** The same stop on a review that names a defect, kept as follow-ups: no recapture offered. */
export const REVIEW_GAP_FOLLOW_UPS_RUN = reviewGapRun({
  ledger: [
    done('features-1', 'features', 'passed'),
    done('walkthrough-1', 'walkthrough', 'passed'),
    review({
      summary:
        'Code review: changes requested — naming. Kept as follow-ups, not sent back: Long name. The review asks for changes but names nothing that sends the work back, so you decide.',
      review: { verdict: 'changes-requested', reason: 'naming', followUps: ['Long name'] },
    }),
  ],
})

/** The run once the person carried on past the review: the gap goes onto the sign-off. */
export const REVIEW_GAP_CARRIED_RUN = reviewGapRun({
  status: 'running',
  park: undefined,
  ledger: [
    done('features-1', 'features', 'passed'),
    done('walkthrough-1', 'walkthrough', 'skipped'),
    review({ override: { choice: 'continue', at: 4 } }),
  ],
})
