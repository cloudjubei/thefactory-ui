import type {
  GetProcessRunEvidenceResponse,
  ProcessDefinition,
  ProcessInput,
  ProcessRun,
  ReviewEvidenceRef,
} from '../../headless/api/generated/types.gen'
import { FAKE_PROJECT_ID } from './projects'
import { FAKE_SCRIPT_LOGS } from './scriptStepRun'
import {
  FAKE_SCRIPT_LOG_LABEL,
  FAKE_SCRIPT_RECORDING_LABEL,
  FAKE_SCRIPT_STOPPED_SCREENSHOT_LABEL,
} from './scriptStepRunConstants'

/** The states a run of variants is shown in. */
export type FakeVariantRunState = 'running' | 'parked' | 'done'

export const FAKE_VARIANT_RUN_ID = 'run-variants'

const VARIANTS = [
  {
    id: 'current',
    title: 'Current',
    refs: [
      ['backend', '4e1c9a2'],
      ['web', 'b71f03d'],
    ],
  },
  {
    id: 'short',
    title: 'Short sign-up',
    refs: [
      ['backend', '9ad27e1'],
      ['web', 'c20e5f8'],
    ],
  },
  {
    id: 'morning',
    title: 'Morning reminder',
    refs: [
      ['backend', 'e58b3c0'],
      ['web', 'e58b3c0'],
    ],
  },
] as const

type VariantId = (typeof VARIANTS)[number]['id']

export const FAKE_VARIANT_INPUTS: ProcessInput[] = [
  { name: 'account', label: 'Test account', kind: 'note-reference', required: true },
  { name: 'focus', label: 'What to check', kind: 'text', required: true },
  {
    name: 'variants',
    label: 'Variants',
    kind: 'variants',
    required: true,
    fields: [{ name: 'refs', label: 'Refs', kind: 'refs', required: true }],
  },
]

export const FAKE_VARIANT_PROCESS: ProcessDefinition = {
  id: 'try-variants',
  name: 'Try variants',
  description: 'Runs the same check on each variant at once.',
  inputs: FAKE_VARIANT_INPUTS,
  steps: [
    {
      id: 'variants',
      name: 'Each variant',
      kind: 'process',
      processId: 'try-variant',
      expand: { input: 'variants' },
    },
    { id: 'final-review', name: 'Final review', kind: 'agent', agentType: 'reviewer' },
    { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
  ],
  loops: [],
  version: 1,
  updatedAt: 0,
  scope: 'global',
  seeded: true,
}

export const FAKE_VARIANT_NOTES = [
  { id: 'n1', label: 'Test account: new sign-up' },
  { id: 'n2', label: 'Test account: returning' },
  { id: 'n3', label: 'Script: sign-up' },
  { id: 'n4', label: 'Script: reminders' },
].map((note) => ({
  ...note,
  projectId: FAKE_PROJECT_ID,
  kind: 'plain' as const,
  access: 'always' as const,
  author: 'user' as const,
  createdAt: '2026-11-06T09:00:00.000Z',
  updatedAt: '2026-11-06T09:00:00.000Z',
}))

/** What a filled form holds. */
export const FAKE_VARIANT_VALUES = {
  account: 'n1',
  focus: 'Does sign-up finish without a reminder? Where does it stop? Which step takes longest?',
  variants: VARIANTS.map((variant, at) => ({
    id: variant.id,
    label: variant.title,
    values: {
      refs: variant.refs.map(([role, ref], part) => ({
        role,
        ref,
        ...(at === 1 && part === 1 ? { patch: 'diff --git a/log b/log' } : {}),
      })),
    },
  })),
}

/**
 * How far each variant's run got: its script running, its review running
 * after the script, or done. The parked variant's script stopped short.
 */
type Stage = 'script' | 'stopped' | 'review' | 'done'

const STAGE: Record<FakeVariantRunState, Record<VariantId, Stage>> = {
  running: { current: 'script', short: 'review', morning: 'review' },
  parked: { current: 'review', short: 'stopped', morning: 'review' },
  done: { current: 'done', short: 'done', morning: 'done' },
}

const WORK_MS: Record<FakeVariantRunState, Record<VariantId, number>> = {
  running: { current: 8_040_000, short: 9_660_000, morning: 7_080_000 },
  parked: { current: 9_600_000, short: 4_920_000, morning: 7_800_000 },
  done: { current: 15_120_000, short: 16_680_000, morning: 14_520_000 },
}

const COST: Record<FakeVariantRunState, Record<VariantId, number>> = {
  running: { current: 3.12, short: 3.8, morning: 2.76 },
  parked: { current: 3.7, short: 1.9, morning: 3.04 },
  done: { current: 6.1, short: 6.72, morning: 5.92 },
}

const SUMMARY: Record<VariantId, string> = {
  current: 'Passed 1 of 3 checks',
  short: 'Passed 3 of 3 checks',
  morning: 'Passed 1 of 3 checks',
}

const stepId = (id: VariantId): string => `variants:${id}`
const childId = (id: VariantId): string => `run-variant-${id}`

const PARK_MESSAGE = 'The sign-in code never came, so this variant stopped there.'

function variantSteps(): ProcessRun['plan']['steps'] {
  return VARIANTS.map((variant, at) => ({
    id: stepId(variant.id),
    name: variant.title,
    kind: 'process' as const,
    processId: 'try-variant',
    fanOut: 'variants',
    subject: {
      kind: 'variant' as const,
      id: variant.id,
      title: variant.title,
      input: 'variants',
      values: FAKE_VARIANT_VALUES.variants[at]!.values,
    },
  }))
}

function stepTotals(state: FakeVariantRunState) {
  return Object.fromEntries(
    VARIANTS.map((variant) => [
      stepId(variant.id),
      {
        workMs: WORK_MS[state][variant.id],
        billedUsd: COST[state][variant.id],
        costUsd: COST[state][variant.id],
        time: { workMs: WORK_MS[state][variant.id] },
      },
    ]),
  )
}

const sum = (by: Record<VariantId, number>): number =>
  Object.values(by).reduce((total, one) => total + one, 0)

/** A run of three variants, as `GET /process-runs/:runId` answers. */
export function fakeVariantRun(state: FakeVariantRunState): ProcessRun {
  const done = state === 'done'
  const final = { id: 'final-1', stepId: 'final-review', iteration: 1, startedAt: 2 }
  return {
    id: FAKE_VARIANT_RUN_ID,
    projectId: FAKE_PROJECT_ID,
    title: 'Sign-up trial',
    status: state === 'running' ? 'running' : 'parked',
    input: { inputValues: FAKE_VARIANT_VALUES },
    loopCounts: {},
    startedAt: 0,
    updatedAt: 0,
    workBranch: { name: 'factory/sign-up-trial', baseSha: 'abc', baseRef: 'main' },
    totals: {
      workMs: sum(WORK_MS[state]),
      at: 0,
      ticking: false,
      billedUsd: sum(COST[state]),
      costUsd: sum(COST[state]),
      steps: stepTotals(state),
    },
    ledger: [
      ...VARIANTS.map((variant) => ({
        id: `${variant.id}-1`,
        stepId: stepId(variant.id),
        iteration: 1,
        startedAt: 1,
        childRunId: childId(variant.id),
        status: done ? 'done' : 'running',
        ...(done ? { outcome: 'passed', summary: SUMMARY[variant.id] } : {}),
      })),
      ...(done ? [{ ...final, status: 'done', outcome: 'passed' }] : []),
      ...(done
        ? [{ id: 'gate-1', stepId: 'sign-off', iteration: 1, startedAt: 3, status: 'running' }]
        : []),
    ],
    ...(state === 'parked'
      ? {
          park: {
            reason: 'step-failed',
            stepId: stepId('short'),
            childRunId: childId('short'),
            message: PARK_MESSAGE,
            parkedAt: 0,
          },
        }
      : done
        ? {
            park: {
              reason: 'gate',
              stepId: 'sign-off',
              message: 'Read the report.',
              parkedAt: 0,
            },
          }
        : {}),
    plan: {
      definitionId: 'try-variants',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Try variants',
      inputs: FAKE_VARIANT_INPUTS,
      steps: [
        ...variantSteps(),
        { id: 'final-review', name: 'Final review', kind: 'agent', agentType: 'reviewer' },
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      ],
      loops: [],
      frozenAt: 0,
    },
  } as unknown as ProcessRun
}

const SCRIPT_ENDED = 10

const STOPPED_AT = 6

function childLedger(stage: Stage): ProcessRun['ledger'] {
  const script = {
    id: 'run-1',
    stepId: 'run',
    iteration: 1,
    startedAt: 1,
  }
  const review = { id: 'review-1', stepId: 'review', iteration: 1, startedAt: 11 }
  if (stage === 'script') return [{ ...script, status: 'running' }] as ProcessRun['ledger']
  if (stage === 'stopped') {
    return [
      { ...script, endedAt: STOPPED_AT, status: 'done', outcome: 'failed', summary: PARK_MESSAGE },
    ] as ProcessRun['ledger']
  }
  const ran = { ...script, endedAt: SCRIPT_ENDED, status: 'done', outcome: 'passed' }
  return (
    stage === 'review'
      ? [ran, { ...review, status: 'running' }]
      : [ran, { ...review, endedAt: 16, status: 'done', outcome: 'passed' }]
  ) as ProcessRun['ledger']
}

/** One variant's own run, as a lane opens it. */
export function fakeVariantChildRun(state: FakeVariantRunState, id: VariantId): ProcessRun {
  const at = VARIANTS.findIndex((variant) => variant.id === id)
  const stage = STAGE[state][id]
  return {
    id: childId(id),
    projectId: FAKE_PROJECT_ID,
    parentRunId: FAKE_VARIANT_RUN_ID,
    parentStepId: stepId(id),
    title: VARIANTS[at]!.title,
    status: stage === 'done' ? 'succeeded' : stage === 'stopped' ? 'parked' : 'running',
    variant: variantSteps()[at]!.subject,
    loopCounts: {},
    startedAt: 0,
    updatedAt: 0,
    ledger: childLedger(stage),
    ...(stage === 'stopped'
      ? { park: { reason: 'step-failed', stepId: 'run', message: PARK_MESSAGE, parkedAt: 0 } }
      : {}),
    plan: {
      definitionId: 'try-variant',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Try one variant',
      steps: [
        { id: 'run', name: 'Run the check', kind: 'script', script: { note: 'script' } },
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
    path: `${id}.mp4`,
    mediaType: 'video/mp4',
    createdAt: 1,
    runId: FAKE_VARIANT_RUN_ID,
    ...over,
  }) as ReviewEvidenceRef

const LOG: Record<VariantId, keyof typeof FAKE_SCRIPT_LOGS> = {
  current: 'two-sections',
  short: 'take-overs',
  morning: 'two-sections',
}

const logId = (id: VariantId, stage: Stage): string =>
  `${id}-${stage === 'stopped' ? 'stopped' : 'step'}-log`

/** What a variant's run filed by the stage it reached, in the order filed, each by its own label. */
function filings(id: VariantId, stage: Stage): ReviewEvidenceRef[] {
  const runId = childId(id)
  const first = filed(`${id}-sign-up`, { label: 'Sign-up form', createdAt: 2, runId })
  if (stage === 'script') return [first]
  if (stage === 'stopped') {
    return [
      first,
      filed(logId(id, stage), {
        kind: 'log',
        label: FAKE_SCRIPT_LOG_LABEL,
        mediaType: 'text/plain',
        path: 'step-log.jsonl',
        createdAt: STOPPED_AT,
        runId,
      }),
      filed(`${id}-stopped`, {
        kind: 'screenshot',
        label: FAKE_SCRIPT_STOPPED_SCREENSHOT_LABEL,
        mediaType: 'image/png',
        path: 'stopped.png',
        createdAt: STOPPED_AT,
        runId,
      }),
    ]
  }
  return [
    first,
    filed(`${id}-welcome`, {
      label: 'Welcome screen',
      createdAt: 4,
      runId,
      ...(id === 'morning'
        ? { unvouchedReason: 'The backend restarted, so it cannot vouch for this file.' }
        : {}),
    }),
    filed(`${id}-script-recording`, {
      label: FAKE_SCRIPT_RECORDING_LABEL,
      createdAt: SCRIPT_ENDED - 1,
      runId,
    }),
    filed(logId(id, stage), {
      kind: 'log',
      label: FAKE_SCRIPT_LOG_LABEL,
      mediaType: 'text/plain',
      path: 'step-log.jsonl',
      createdAt: SCRIPT_ENDED - 1,
      runId,
    }),
    ...(stage === 'done'
      ? [
          filed(`${id}-review`, {
            kind: 'report',
            label: 'Review',
            mediaType: 'text/markdown',
            path: 'review.md',
            createdAt: 15,
            runId,
          }),
        ]
      : []),
  ]
}

const REVIEW: Record<VariantId, string> = {
  current: '- Finished sign-up.\n- Needed a reminder to come back.',
  short: '- Finished sign-up in under a minute.\n- Came back every round but one.',
  morning: '- Came back at each reminder.\n- The reminder showed twice in one round.',
}

const FINAL_REPORT = [
  '# Final report',
  '',
  '## Outcome',
  '',
  'Short sign-up passed every check',
  '',
  'Short sign-up finished first try with no reminder. Current finished only after one.',
  '',
  '## How it was proven',
  '',
  '- Every variant reached the end. (proven)',
  '',
  '## Decisions made',
  '',
  '## Needs you',
].join('\n')

const POST =
  'We tried three versions of sign-up. The shorter sign-up finished every check with no reminders.\n\nNext: ship it.'

/** What a filed report's text reads, by evidence id. */
export const FAKE_VARIANT_TEXTS: Readonly<Record<string, string>> = {
  'final-report': FINAL_REPORT,
  'final-post': POST,
  ...Object.fromEntries(VARIANTS.map((v) => [`${v.id}-review`, REVIEW[v.id]])),
  ...Object.fromEntries(VARIANTS.map((v) => [logId(v.id, 'review'), FAKE_SCRIPT_LOGS[LOG[v.id]]])),
  ...Object.fromEntries(VARIANTS.map((v) => [logId(v.id, 'stopped'), FAKE_SCRIPT_LOGS.stopped])),
}

/** The body of `GET /process-runs/:runId/evidence`. */
export type FakeVariantEvidence = GetProcessRunEvidenceResponse

/** What `GET /process-runs/:runId/evidence` answers for a run of variants. */
export function fakeVariantEvidence(state: FakeVariantRunState): FakeVariantEvidence {
  const done = state === 'done'
  const statusOf = (id: VariantId): ProcessRun['status'] => {
    const stage = STAGE[state][id]
    return stage === 'done' ? 'succeeded' : stage === 'stopped' ? 'parked' : 'running'
  }
  return {
    runId: FAKE_VARIANT_RUN_ID,
    groups: [
      {
        runId: FAKE_VARIANT_RUN_ID,
        label: 'Sign-up trial',
        status: done ? 'parked' : 'running',
        evidence: done
          ? [
              filed('final-report', {
                kind: 'report',
                label: 'Final report',
                mediaType: 'text/markdown',
                path: 'final.md',
              }),
              filed('final-post', {
                kind: 'report',
                label: 'The post',
                mediaType: 'text/markdown',
                path: 'post.md',
              }),
            ]
          : [],
      },
      ...VARIANTS.map((variant, at) => ({
        runId: childId(variant.id),
        parentRunId: FAKE_VARIANT_RUN_ID,
        stepId: stepId(variant.id),
        label: variant.title,
        status: statusOf(variant.id),
        variant: variantSteps()[at]!.subject as NonNullable<ProcessRun['variant']>,
        evidence: filings(variant.id, STAGE[state][variant.id]),
      })),
    ],
  }
}

/** What a launch's preview answers for what the form holds. */
export function fakeVariantPreview(problem?: string) {
  return {
    proposal: { processId: 'try-variants', name: 'Try variants', steps: [] },
    inputs: FAKE_VARIANT_INPUTS,
    ...(problem ? { problem } : {}),
    baseBranches: { current: 'main', preselected: 'main', branches: ['main', 'dev'] },
    defaultCaps: { spendUsdCap: 20, wallClockMs: 28_800_000, maxIterations: 2 },
  }
}
