import type { ProcessFeatureSplitOffer, ProcessRun } from 'thefactory-tools/types'
import type { FeatureSplitDraft, FeatureSplitPointLook } from 'thefactory-ui/headless'

const ACCEPTANCE = [
  '- Brand fonts load on every screen',
  '- Headings use the display face, body text the text face',
  '- Fallback font shows while the brand fonts load',
  '- Offline mode keeps the last loaded font',
  '- Right-to-left text keeps its font',
  '- Very long names wrap without clipping',
].join('\n')

const POINTS = [
  'Brand fonts load on every screen',
  'Headings use the display face, body text the text face',
  'Fallback font shows while the brand fonts load',
  'Offline mode keeps the last loaded font',
  'Right-to-left text keeps its font',
  'Very long names wrap without clipping',
]

/** Covision run 59d1109e's feature run, stopped at Verify: four edge cases were too much for now. */
export const SPLIT_FEATURE_RUN: ProcessRun = {
  id: '59d1109e-feature',
  projectId: 'covision',
  storyId: 'c0f1a2b3',
  featureId: 'f-brand-fonts',
  parentRunId: '59d1109e',
  title: 'Brand fonts',
  status: 'parked',
  loopCounts: {},
  startedAt: 0,
  updatedAt: 0,
  featureAcceptance: ACCEPTANCE,
  input: { proofPlans: { 'f-brand-fonts': { kinds: ['checks', 'ui-video'] } } },
  plan: {
    definitionId: 'feature-default',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Feature',
    frozenAt: 0,
    loops: [],
    steps: [
      { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
      { id: 'checks', name: 'Checks', kind: 'check' },
      { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
      { id: 'report', name: 'Report', kind: 'report' },
    ],
  },
  ledger: [
    {
      id: 'v1',
      stepId: 'verify',
      iteration: 1,
      status: 'done',
      outcome: 'failed',
      startedAt: 1,
      endedAt: 2,
      summary: 'The video shows the main path; no recording covers offline, RTL or long names.',
      proof: {
        pairs: [],
        newScreenIds: [],
        recordingIds: [],
        judged: true,
        outcome: 'failed',
        plan: {
          kinds: [
            { kind: 'checks', status: 'met', detail: 'Typecheck, lint and tests passed.' },
            {
              kind: 'ui-video',
              status: 'unmet',
              detail: 'No recording covers offline, right-to-left or long names.',
            },
          ],
        },
      },
    },
  ],
  park: {
    reason: 'step-failed',
    stepId: 'verify',
    message: 'Verify did not pass: the edge cases are not shown.',
    parkedAt: 3,
  },
}

/** What the stop offers for moving points into a follow-up, with a change of proof. */
export const SPLIT_OFFER: ProcessFeatureSplitOffer = {
  featureId: 'f-brand-fonts',
  stepId: 'verify',
  points: POINTS,
  proofChange: {
    featureId: 'f-brand-fonts',
    stepId: 'verify',
    current: ['checks', 'ui-video'],
    standings: [
      { kind: 'checks', status: 'met', detail: 'Typecheck, lint and tests passed.' },
      {
        kind: 'ui-video',
        status: 'unmet',
        detail: 'No recording covers offline, right-to-left or long names.',
      },
    ],
    unavailable: [{ kind: 'live-backend', reason: 'No backend runs for this project here.' }],
    keepsScreens: true,
  },
}

/** An unchecked Verify that offers no change of proof: only the points move. */
export const SPLIT_OFFER_UNCHECKED: ProcessFeatureSplitOffer = {
  featureId: 'f-brand-fonts',
  stepId: 'verify',
  points: POINTS,
}

const START: FeatureSplitDraft = {
  moved: [],
  title: '',
  changeProof: false,
  proof: { kinds: ['checks', 'ui-video'], save: false, note: '' },
  note: '',
}

/** The edge cases picked and the follow-up named. */
export const SPLIT_PICKED: FeatureSplitDraft = {
  ...START,
  moved: [2, 3, 4, 5],
  title: 'Brand font edge cases',
  note: 'The main path is what this release needs; the edge cases can follow.',
}

/** The editor's states, by the id the showcase and the native view name them. */
export const SPLIT_STATES: Record<
  string,
  { offer: ProcessFeatureSplitOffer; draft: FeatureSplitDraft }
> = {
  start: { offer: SPLIT_OFFER, draft: START },
  picked: { offer: SPLIT_OFFER, draft: SPLIT_PICKED },
  proof: { offer: SPLIT_OFFER, draft: { ...SPLIT_PICKED, changeProof: true } },
  'every-point': {
    offer: SPLIT_OFFER,
    draft: { ...SPLIT_PICKED, moved: [0, 1, 2, 3, 4, 5] },
  },
  unchecked: {
    offer: SPLIT_OFFER_UNCHECKED,
    draft: { moved: [3, 4, 5], title: 'Brand font edge cases', changeProof: false, note: '' },
  },
}

/** The two looks for picking points, switched on the board on the real editor. */
export const SPLIT_POINT_LOOKS: readonly { id: FeatureSplitPointLook; label: string }[] = [
  { id: 'switch', label: 'Switches' },
  { id: 'row', label: 'Moves / stays rows' },
]
