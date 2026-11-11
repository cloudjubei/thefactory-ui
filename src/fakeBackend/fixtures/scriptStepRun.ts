import type { ProcessInput, ProcessRun, ReviewEvidenceRef } from 'thefactory-tools/types'

import { FAKE_PROJECT_ID } from './projects'
import {
  FAKE_SCRIPT_LOG_LABEL,
  FAKE_SCRIPT_RECORDING_LABEL,
  FAKE_SCRIPT_STOPPED_SCREENSHOT_LABEL,
} from './scriptStepRunConstants'

/**
 * How a script step is shown: two sections run to the end, stopped short in
 * the second, or run to the end past take-overs.
 */
export type FakeScriptStepState = 'two-sections' | 'stopped' | 'take-overs'

export const FAKE_SCRIPT_RUN_ID = 'run-script-check'

export const FAKE_SCRIPT_STEP_ID = 'run-script'

const PROCESS_ID = 'check-a-flow'

/** The inputs of a process that runs a script or an agent, picked at launch. */
export const FAKE_SCRIPT_INPUTS: ProcessInput[] = [
  {
    name: 'runBy',
    label: 'How it runs',
    kind: 'choice',
    options: [
      { value: 'script', label: 'Script' },
      { value: 'agent', label: 'Agent' },
    ],
    default: 'script',
  },
  { name: 'account', label: 'Test account', kind: 'note-reference', required: true },
  {
    name: 'scriptNote',
    label: 'Script',
    kind: 'note-reference',
    requiredWhen: { input: 'runBy', is: 'script' },
  },
  { name: 'focus', label: 'What to check', kind: 'text', required: true },
]

export const FAKE_SCRIPT_NOTES = [
  { id: 'n1', label: 'Test account: new sign-up' },
  { id: 'n5', label: 'Script: sign in and change settings' },
].map((note) => ({
  ...note,
  projectId: FAKE_PROJECT_ID,
  kind: 'plain' as const,
  access: 'always' as const,
  author: 'user' as const,
  createdAt: '2026-11-06T09:00:00.000Z',
  updatedAt: '2026-11-06T09:00:00.000Z',
}))

/** A filled form that runs the script. */
export const FAKE_SCRIPT_VALUES = {
  runBy: 'script',
  account: 'n1',
  scriptNote: 'n5',
  focus: 'Does a saved setting hold after signing in again?',
}

/** The same form switched to the agent: no script is asked for. */
export const FAKE_AGENT_VALUES = { ...FAKE_SCRIPT_VALUES, runBy: 'agent' }

/** What a launch's preview answers for the form. */
export function fakeScriptPreview() {
  return {
    proposal: { processId: PROCESS_ID, name: 'Check a flow', steps: [] },
    inputs: FAKE_SCRIPT_INPUTS,
    baseBranches: { current: 'main', preselected: 'main', branches: ['main', 'dev'] },
    defaultCaps: { spendUsdCap: 5, wallClockMs: 3_600_000, maxIterations: 2 },
  }
}

const at = (minute: number): string => new Date(Date.UTC(2026, 10, 10, 9, minute)).toISOString()

const step = (section: string, minute: number, title: string, rest = {}) => ({
  at: at(minute),
  section,
  kind: 'step',
  title,
  ...rest,
})

const ask = (
  section: string,
  minute: number,
  title: string,
  source: 'pinned' | 'live',
  rest = {},
) => ({
  at: at(minute),
  section,
  kind: 'ask',
  title,
  source,
  ...(source === 'live' ? { model: 'sonnet', costUsd: 0.011 } : {}),
  ...rest,
})

const takeOver = (
  section: string,
  minute: number,
  title: string,
  outcome: 'handed-back' | 'failed',
  detail: string,
  costUsd: number,
) => ({ at: at(minute), section, kind: 'take-over', title, detail, outcome, costUsd })

const SIGN_IN = [
  step('Sign in', 0, 'Opened the sign-in page'),
  ask('Sign in', 1, 'Picked the account to sign in with', 'pinned', {
    detail: 'The same account as the last run.',
  }),
  step('Sign in', 2, 'Signed in', { items: ['Email', 'Password', 'Remember me'] }),
]

const SETTINGS_START = [
  step('Settings', 3, 'Opened settings', { items: ['Theme', 'Language', 'Notifications'] }),
  ask('Settings', 4, 'Picked a theme to switch to', 'live', { detail: 'Dark' }),
]

const SETTINGS_END = [
  step('Settings', 5, 'Saved the settings'),
  ask('Settings', 6, 'Checked the saved theme shows after signing in again', 'live', {
    detail: 'It does.',
  }),
]

const SETTINGS_STOPPED = [
  ...SETTINGS_START,
  takeOver(
    'Settings',
    5,
    'Save the settings',
    'failed',
    'The Save button stayed greyed out after the theme changed.',
    0.42,
  ),
]

const SETTINGS_PAST_TAKE_OVERS = [
  ...SETTINGS_START,
  takeOver(
    'Settings',
    5,
    'Close the tip over the Save button',
    'handed-back',
    'Closed a “What’s new” tip that covered the Save button.',
    0.18,
  ),
  ...SETTINGS_END,
]

const SIGN_OUT = [
  step('Sign out', 7, 'Opened the account menu'),
  takeOver(
    'Sign out',
    8,
    'Find Sign out',
    'handed-back',
    'Sign out was under More in the menu; opened it.',
    0.09,
  ),
  step('Sign out', 9, 'Signed out'),
]

const logText = (lines: readonly unknown[]): string =>
  lines.map((line) => JSON.stringify(line)).join('\n')

/** The step log each state filed, as its text. */
export const FAKE_SCRIPT_LOGS: Readonly<Record<FakeScriptStepState, string>> = {
  'two-sections': logText([...SIGN_IN, ...SETTINGS_START, ...SETTINGS_END]),
  stopped: logText([...SIGN_IN, ...SETTINGS_STOPPED]),
  'take-overs': logText([...SIGN_IN, ...SETTINGS_PAST_TAKE_OVERS, ...SIGN_OUT]),
}

const LOG_ID = (state: FakeScriptStepState): string => `step-log-${state}`

/** What a filed step log's text reads, by evidence id. */
export const FAKE_SCRIPT_TEXTS: Readonly<Record<string, string>> = Object.fromEntries(
  (Object.keys(FAKE_SCRIPT_LOGS) as FakeScriptStepState[]).map((state) => [
    LOG_ID(state),
    FAKE_SCRIPT_LOGS[state],
  ]),
)

const SUMMARY: Record<FakeScriptStepState, string> = {
  'two-sections': 'The script ran to the end: 2 sections, 3 asks, 0 take-overs.',
  stopped: 'The script stopped with exit code 1 in section "Settings".',
  'take-overs': 'The script ran to the end: 3 sections, 3 asks, 2 take-overs.',
}

/** A run whose script step ended as the state says, as `GET /process-runs/:runId` answers. */
export function fakeScriptRun(state: FakeScriptStepState): ProcessRun {
  const passed = state !== 'stopped'
  return {
    id: FAKE_SCRIPT_RUN_ID,
    projectId: FAKE_PROJECT_ID,
    title: 'Settings hold after signing in again',
    status: passed ? 'running' : 'parked',
    loopCounts: {},
    startedAt: 0,
    updatedAt: 0,
    input: { inputValues: FAKE_SCRIPT_VALUES },
    ledger: [
      {
        id: 'run-script-1',
        stepId: FAKE_SCRIPT_STEP_ID,
        iteration: 1,
        startedAt: 1,
        endedAt: 10,
        status: 'done',
        outcome: passed ? 'passed' : 'failed',
        summary: SUMMARY[state],
      },
      ...(passed
        ? [{ id: 'review-1', stepId: 'review', iteration: 1, startedAt: 11, status: 'running' }]
        : []),
    ],
    ...(passed
      ? {}
      : {
          park: {
            reason: 'step-failed',
            stepId: FAKE_SCRIPT_STEP_ID,
            message: SUMMARY.stopped,
            parkedAt: 0,
          },
        }),
    plan: {
      definitionId: PROCESS_ID,
      definitionScope: 'project',
      definitionVersion: 1,
      name: 'Check a flow',
      inputs: FAKE_SCRIPT_INPUTS,
      steps: [
        {
          id: FAKE_SCRIPT_STEP_ID,
          name: 'Run the script',
          kind: 'script',
          script: {
            note: 'scriptNote',
            inputs: { ACCOUNT: 'account', FOCUS: 'focus' },
            takeOverAgentType: 'developer',
          },
        },
        { id: 'review', name: 'Review', kind: 'agent', agentType: 'reviewer' },
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
    runId: FAKE_SCRIPT_RUN_ID,
    projectId: FAKE_PROJECT_ID,
    ...over,
  }) as ReviewEvidenceRef

/** What `GET /process-runs/:runId/evidence` answers for the script step's run. */
export function fakeScriptEvidence(state: FakeScriptStepState) {
  return {
    runId: FAKE_SCRIPT_RUN_ID,
    groups: [
      {
        runId: FAKE_SCRIPT_RUN_ID,
        label: 'Settings hold after signing in again',
        status: state === 'stopped' ? 'parked' : 'running',
        evidence: [
          filed('script-recording', { label: FAKE_SCRIPT_RECORDING_LABEL }),
          filed(LOG_ID(state), {
            kind: 'log',
            label: FAKE_SCRIPT_LOG_LABEL,
            mediaType: 'text/plain',
            path: 'step-log.jsonl',
          }),
          ...(state === 'stopped'
            ? [
                filed('stopped-shot', {
                  kind: 'screenshot',
                  label: FAKE_SCRIPT_STOPPED_SCREENSHOT_LABEL,
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
