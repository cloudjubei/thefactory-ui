import type { ProcessInput, ProcessRun, ReviewEvidenceRef } from 'thefactory-tools/types'

import { FAKE_PROJECT_ID } from './projects'
import {
  FAKE_JOURNEY_DAY_LOG_LABEL,
  FAKE_JOURNEY_RECORDING_LABEL,
  FAKE_JOURNEY_STOPPED_SCREENSHOT_LABEL,
} from './scriptedRunConstants'
import { FAKE_VARIANT_INPUTS, FAKE_VARIANT_NOTES, FAKE_VARIANT_VALUES } from './variantRun'

/** How a scripted step is shown: its days lived to the end, or stopped short on day 2. */
export type FakeScriptedState = 'lived' | 'stopped'

export const FAKE_SCRIPTED_RUN_ID = 'run-variant-scripted'

export const FAKE_SCRIPTED_STEP_ID = 'live-scripted'

const [PERSON, DAYS, LOOKING_FOR, VARIANTS] = FAKE_VARIANT_INPUTS as [
  ProcessInput,
  ProcessInput,
  ProcessInput,
  ProcessInput,
]

/** The inputs of compare-variants v2: how the days are lived, and the journey script it needs. */
export const FAKE_SCRIPTED_INPUTS: ProcessInput[] = [
  PERSON,
  { name: 'product', label: 'How the product works', kind: 'note-reference' },
  VARIANTS,
  DAYS,
  {
    name: 'livedBy',
    label: 'How the days are lived',
    kind: 'choice',
    options: [
      { value: 'scripted', label: 'Scripted' },
      { value: 'agent', label: 'Agent (legacy)' },
    ],
    default: 'scripted',
  },
  {
    name: 'journeyScript',
    label: 'Journey script',
    kind: 'note-reference',
    requiredWhen: { input: 'livedBy', is: 'scripted' },
  },
  LOOKING_FOR,
]

export const FAKE_SCRIPTED_NOTES = [
  ...FAKE_VARIANT_NOTES,
  { ...FAKE_VARIANT_NOTES[0]!, id: 'n5', label: 'Journey script: 7 days in the user app' },
]

/** A filled form that lives the days by the journey script. */
export const FAKE_SCRIPTED_VALUES = {
  ...FAKE_VARIANT_VALUES,
  days: 7,
  livedBy: 'scripted',
  journeyScript: 'n5',
}

/** The same form switched to the agent: no journey script is asked for. */
export const FAKE_AGENT_VALUES = { ...FAKE_VARIANT_VALUES, days: 7, livedBy: 'agent' }

/** What a launch's preview answers for the scripted form. */
export function fakeScriptedPreview() {
  return {
    proposal: { processId: 'compare-variants', name: 'Compare variants', steps: [] },
    inputs: FAKE_SCRIPTED_INPUTS,
    baseBranches: { current: 'main', preselected: 'main', branches: ['main', 'dev'] },
    defaultCaps: { spendUsdCap: 20, wallClockMs: 28_800_000, maxIterations: 2 },
  }
}

const at = (day: number, minute: number): string =>
  new Date(Date.UTC(2026, 10, 9 + day, 7, minute)).toISOString()

const live = (day: number, minute: number, decision: string, costUsd: number) => ({
  at: at(day, minute),
  day,
  kind: 'decision',
  decision,
  source: 'live',
  answer: {},
  model: 'sonnet',
  costUsd,
})

const plan = (day: number, minute: number, decision: string) => ({
  at: at(day, minute),
  day,
  kind: 'decision',
  decision,
  source: 'plan',
  answer: {},
})

const DAY_ONE = [
  { at: at(1, 0), day: 1, kind: 'day-start' },
  plan(1, 1, 'energy'),
  {
    at: at(1, 2),
    day: 1,
    kind: 'goals-offered',
    goals: [
      { id: 'g1', text: 'Walk for 20 minutes after lunch' },
      { id: 'g2', text: 'Read one chapter before bed' },
      { id: 'g3', text: 'Plan tomorrow’s meals' },
    ],
  },
  live(1, 3, 'morning-review', 0.012),
  {
    at: at(1, 4),
    day: 1,
    kind: 'goal-replaced',
    from: 'Read one chapter before bed',
    to: 'Stretch for 5 minutes before bed',
    reason: 'Night shift this week, too tired to read.',
  },
  live(1, 5, 'replacement-pick', 0.008),
  {
    at: at(1, 6),
    day: 1,
    kind: 'take-over',
    goal: 'Accept the goals for the day',
    saw: 'A dialog asking to rate the app covered the Accept button.',
    outcome: 'handed-back',
    turns: 6,
    costUsd: 0.21,
  },
  {
    at: at(1, 7),
    day: 1,
    kind: 'goals-accepted',
    goals: [
      { id: 'g1', text: 'Walk for 20 minutes after lunch' },
      { id: 'g4', text: 'Stretch for 5 minutes before bed' },
      { id: 'g3', text: 'Plan tomorrow’s meals' },
    ],
  },
  plan(1, 30, 'goal-status'),
  {
    at: at(1, 31),
    day: 1,
    kind: 'goal-status',
    goal: 'Walk for 20 minutes after lunch',
    status: 'done',
  },
  {
    at: at(1, 31),
    day: 1,
    kind: 'goal-status',
    goal: 'Stretch for 5 minutes before bed',
    status: 'in_motion',
  },
  { at: at(1, 31), day: 1, kind: 'goal-status', goal: 'Plan tomorrow’s meals', status: 'not_done' },
  plan(1, 32, 'probe'),
  {
    at: at(1, 32),
    day: 1,
    kind: 'probe',
    question: 'Did today feel lighter than yesterday?',
    choice: 'A little',
    note: 'The walk helped.',
  },
  plan(1, 33, 'journal'),
  {
    at: at(1, 33),
    day: 1,
    kind: 'journal',
    wrote: true,
    text: 'Short shift, long walk. Felt like myself for once.',
  },
  live(1, 34, 'card', 0.006),
  { at: at(1, 34), day: 1, kind: 'card', card: 'Sleep before a night shift', reaction: 'Useful' },
  { at: at(1, 40), day: 1, kind: 'day-end' },
]

const DAY_TWO_START = [
  { at: at(2, 0), day: 2, kind: 'day-start' },
  plan(2, 1, 'energy'),
  {
    at: at(2, 2),
    day: 2,
    kind: 'goals-offered',
    goals: [
      { id: 'g5', text: 'Call the bank about the card' },
      { id: 'g6', text: 'Clear the inbox' },
    ],
  },
  live(2, 3, 'morning-review', 0.011),
  {
    at: at(2, 4),
    day: 2,
    kind: 'goal-removed',
    goal: 'Clear the inbox',
    reason: 'Not today: back-to-back shifts.',
  },
]

const DAY_TWO_LIVED = [
  ...DAY_TWO_START,
  {
    at: at(2, 5),
    day: 2,
    kind: 'goals-accepted',
    goals: [{ id: 'g5', text: 'Call the bank about the card' }],
  },
  plan(2, 30, 'goal-status'),
  {
    at: at(2, 31),
    day: 2,
    kind: 'goal-status',
    goal: 'Call the bank about the card',
    status: 'done',
  },
  plan(2, 32, 'journal'),
  { at: at(2, 32), day: 2, kind: 'journal', wrote: false },
  { at: at(2, 40), day: 2, kind: 'day-end' },
]

const DAY_TWO_STOPPED = [
  ...DAY_TWO_START,
  {
    at: at(2, 6),
    day: 2,
    kind: 'take-over',
    goal: 'Accept the goals for the day',
    saw: 'The goals screen never finished loading.',
    outcome: 'failed',
    turns: 25,
    costUsd: 0.64,
  },
]

const logText = (lines: readonly unknown[]): string =>
  lines.map((line) => JSON.stringify(line)).join('\n')

/** The day log each state filed, as its text. */
export const FAKE_DAY_LOGS: Readonly<Record<FakeScriptedState, string>> = {
  lived: logText([...DAY_ONE, ...DAY_TWO_LIVED]),
  stopped: logText([...DAY_ONE, ...DAY_TWO_STOPPED]),
}

const DAY_LOG_ID = (state: FakeScriptedState): string => `day-log-${state}`

/** What a filed day log's text reads, by evidence id. */
export const FAKE_SCRIPTED_TEXTS: Readonly<Record<string, string>> = {
  [DAY_LOG_ID('lived')]: FAKE_DAY_LOGS.lived,
  [DAY_LOG_ID('stopped')]: FAKE_DAY_LOGS.stopped,
}

const SUMMARY: Record<FakeScriptedState, string> = {
  lived: 'The journey script ran to the end: 2 days lived, 11 decisions, 1 take-over.',
  stopped: 'The journey script stopped on day 2.',
}

/** One variant's run that lived its days by the journey script, as `GET /process-runs/:runId` answers. */
export function fakeScriptedRun(state: FakeScriptedState): ProcessRun {
  const lived = state === 'lived'
  return {
    id: FAKE_SCRIPTED_RUN_ID,
    projectId: FAKE_PROJECT_ID,
    parentRunId: 'run-variants',
    parentStepId: 'variants:short',
    title: 'Short sign-up',
    status: lived ? 'running' : 'parked',
    loopCounts: {},
    startedAt: 0,
    updatedAt: 0,
    input: { inputValues: FAKE_SCRIPTED_VALUES },
    ledger: [
      {
        id: 'live-scripted-1',
        stepId: FAKE_SCRIPTED_STEP_ID,
        iteration: 1,
        startedAt: 1,
        endedAt: 10,
        status: 'done',
        outcome: lived ? 'passed' : 'failed',
        summary: SUMMARY[state],
      },
      ...(lived
        ? [{ id: 'review-1', stepId: 'review', iteration: 1, startedAt: 11, status: 'running' }]
        : []),
    ],
    ...(lived
      ? {}
      : {
          park: {
            reason: 'step-failed',
            stepId: FAKE_SCRIPTED_STEP_ID,
            message: SUMMARY.stopped,
            parkedAt: 0,
          },
        }),
    plan: {
      definitionId: 'compare-variant',
      definitionScope: 'global',
      definitionVersion: 2,
      name: 'One variant',
      inputs: FAKE_SCRIPTED_INPUTS,
      steps: [
        {
          id: FAKE_SCRIPTED_STEP_ID,
          name: 'Live the days',
          kind: 'script',
          serveVariant: true,
          journey: { script: 'journeyScript', person: 'person', product: 'product', days: 'days' },
        },
        { id: 'review', name: 'Review', kind: 'agent', agentType: 'run-reviewer' },
      ],
      loops: [],
      frozenAt: 0,
    },
  } as unknown as ProcessRun
}

const filed = (id: string, over: Partial<ReviewEvidenceRef>): ReviewEvidenceRef =>
  ({
    id,
    kind: 'recording',
    path: `${id}.webm`,
    mediaType: 'video/webm',
    createdAt: 9,
    runId: FAKE_SCRIPTED_RUN_ID,
    projectId: FAKE_PROJECT_ID,
    ...over,
  }) as ReviewEvidenceRef

/** What `GET /process-runs/:runId/evidence` answers for the scripted variant's run. */
export function fakeScriptedEvidence(state: FakeScriptedState) {
  return {
    runId: FAKE_SCRIPTED_RUN_ID,
    groups: [
      {
        runId: FAKE_SCRIPTED_RUN_ID,
        label: 'Short sign-up',
        status: state === 'lived' ? 'running' : 'parked',
        evidence: [
          filed('days-recording', { label: FAKE_JOURNEY_RECORDING_LABEL }),
          filed(DAY_LOG_ID(state), {
            kind: 'log',
            label: FAKE_JOURNEY_DAY_LOG_LABEL,
            mediaType: 'text/plain',
            path: 'day-log.txt',
          }),
          ...(state === 'stopped'
            ? [
                filed('stopped-shot', {
                  kind: 'screenshot',
                  label: FAKE_JOURNEY_STOPPED_SCREENSHOT_LABEL,
                  mediaType: 'image/png',
                  path: 'stopped.png',
                }),
              ]
            : []),
        ],
      },
    ],
  }
}
