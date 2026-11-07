import type {
  GetProcessRunEvidenceResponse,
  ProcessDefinition,
  ProcessInput,
  ProcessRun,
  ReviewEvidenceRef,
} from '../../headless/api/generated/types.gen'
import { FAKE_PROJECT_ID } from './projects'

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
  { name: 'person', label: 'Who', kind: 'note-reference', required: true },
  { name: 'days', label: 'Days', kind: 'number', required: true },
  { name: 'lookingFor', label: 'What we’re looking for', kind: 'text', required: true },
  {
    name: 'variants',
    label: 'Variants',
    kind: 'variants',
    required: true,
    fields: [{ name: 'refs', label: 'Refs', kind: 'refs', required: true }],
  },
]

export const FAKE_VARIANT_PROCESS: ProcessDefinition = {
  id: 'compare-variants',
  name: 'Compare variants',
  description: 'A simulated person lives days of a product on each variant at once.',
  inputs: FAKE_VARIANT_INPUTS,
  steps: [
    {
      id: 'variants',
      name: 'Each variant',
      kind: 'process',
      processId: 'compare-variant',
      expand: { input: 'variants' },
    },
    { id: 'final-review', name: 'Final review', kind: 'agent', agentType: 'final-reviewer' },
    { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
  ],
  loops: [],
  version: 1,
  updatedAt: 0,
  scope: 'global',
  seeded: true,
}

export const FAKE_VARIANT_NOTES = [
  { id: 'n1', label: 'Test user: busy parent' },
  { id: 'n2', label: 'Test user: night shifts' },
  { id: 'n3', label: 'Log sign-up steps' },
  { id: 'n4', label: 'Log reminder taps' },
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
  person: 'n1',
  days: 14,
  lookingFor:
    'Does the person come back without a push? Where do they stop? Does any step feel like a chore?',
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

const LIVED: Record<FakeVariantRunState, Record<VariantId, number>> = {
  running: { current: 8, short: 10, morning: 14 },
  parked: { current: 10, short: 5, morning: 8 },
  done: { current: 14, short: 14, morning: 14 },
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
  current: 'Met 1 of 3 goals',
  short: 'Met 3 of 3 goals',
  morning: 'Met 1 of 3 goals',
}

const stepId = (id: VariantId): string => `variants:${id}`
const childId = (id: VariantId): string => `run-variant-${id}`

const PARK_MESSAGE = 'The sign-in code never came on day 6, so this variant stopped there.'

function variantSteps(): ProcessRun['plan']['steps'] {
  return VARIANTS.map((variant, at) => ({
    id: stepId(variant.id),
    name: variant.title,
    kind: 'process' as const,
    processId: 'compare-variant',
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
      definitionId: 'compare-variants',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Compare variants',
      inputs: FAKE_VARIANT_INPUTS,
      steps: [
        ...variantSteps(),
        { id: 'final-review', name: 'Final review', kind: 'agent', agentType: 'final-reviewer' },
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      ],
      loops: [],
      frozenAt: 0,
    },
  } as unknown as ProcessRun
}

/** One variant's own run, as a lane opens it. */
export function fakeVariantChildRun(state: FakeVariantRunState, id: VariantId): ProcessRun {
  const at = VARIANTS.findIndex((variant) => variant.id === id)
  const parked = state === 'parked' && id === 'short'
  const done = state === 'done'
  return {
    id: childId(id),
    projectId: FAKE_PROJECT_ID,
    parentRunId: FAKE_VARIANT_RUN_ID,
    parentStepId: stepId(id),
    title: VARIANTS[at]!.title,
    status: done ? 'succeeded' : parked ? 'parked' : 'running',
    variant: variantSteps()[at]!.subject,
    loopCounts: {},
    startedAt: 0,
    updatedAt: 0,
    ledger: [
      {
        id: 'live-1',
        stepId: 'live',
        iteration: 1,
        startedAt: 1,
        status: done ? 'done' : 'running',
        ...(done ? { outcome: 'passed' } : {}),
      },
      ...(done
        ? [
            {
              id: 'review-1',
              stepId: 'review',
              iteration: 1,
              startedAt: 2,
              status: 'done',
              outcome: 'passed',
            },
          ]
        : []),
    ],
    ...(parked
      ? { park: { reason: 'step-failed', stepId: 'live', message: PARK_MESSAGE, parkedAt: 0 } }
      : {}),
    plan: {
      definitionId: 'compare-variant',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Compare one variant',
      steps: [
        { id: 'live', name: 'Live the days', kind: 'agent', agentType: 'simulated-person' },
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
    path: `${id}.mp4`,
    mediaType: 'video/mp4',
    createdAt: 1,
    runId: FAKE_VARIANT_RUN_ID,
    ...over,
  }) as ReviewEvidenceRef

const FIRST_LINE: Record<VariantId, string> = {
  current: 'opened it after a reminder',
  short: 'opened it unprompted',
  morning: 'back at the reminder',
}

function recordings(id: VariantId, lived: number): ReviewEvidenceRef[] {
  return Array.from({ length: lived }, (_, at) =>
    filed(`${id}-day-${at + 1}`, {
      label: `Day ${at + 1}: ${FIRST_LINE[id]}`,
      createdAt: at + 1,
      ...(id === 'morning' && at === 3
        ? { unvouchedReason: 'The backend restarted, so it cannot vouch for this file.' }
        : {}),
    }),
  )
}

const REVIEW: Record<VariantId, string> = {
  current: '- Finished sign-up on day 1.\n- Came back on day 3 only after a reminder.',
  short: '- Finished sign-up in under a minute.\n- Opened the app every day but one.',
  morning: '- Back every morning at the reminder.\n- Called the reminder a nag on day 10.',
}

const FINAL_REPORT = [
  '# Final report',
  '',
  '## Outcome',
  '',
  'Short sign-up met all 3 goals',
  '',
  'The person came back on their own from day 3 and finished sign-up first try. Current kept them only with a reminder.',
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
  'We tried three versions of sign-up. The shorter sign-up kept people coming back with no reminders.\n\nNext: ship it.'

/** What a filed report's text reads, by evidence id. */
export const FAKE_VARIANT_TEXTS: Readonly<Record<string, string>> = {
  'final-report': FINAL_REPORT,
  'final-post': POST,
  ...Object.fromEntries(VARIANTS.map((v) => [`${v.id}-review`, REVIEW[v.id]])),
}

/** The body of `GET /process-runs/:runId/evidence`. */
export type FakeVariantEvidence = GetProcessRunEvidenceResponse

/** What `GET /process-runs/:runId/evidence` answers for a run of variants. */
export function fakeVariantEvidence(state: FakeVariantRunState): FakeVariantEvidence {
  const done = state === 'done'
  const statusOf = (id: VariantId): ProcessRun['status'] =>
    done ? 'succeeded' : state === 'parked' && id === 'short' ? 'parked' : 'running'
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
        evidence: [
          ...recordings(variant.id, LIVED[state][variant.id]),
          ...(LIVED[state][variant.id] === 14 && (done || variant.id !== 'morning')
            ? [
                filed(`${variant.id}-review`, {
                  kind: 'report',
                  label: 'Review',
                  mediaType: 'text/markdown',
                  path: 'review.md',
                  createdAt: 20,
                }),
              ]
            : []),
        ],
      })),
    ],
  }
}

/** What a launch's preview answers for what the form holds. */
export function fakeVariantPreview(problem?: string) {
  return {
    proposal: { processId: 'compare-variants', name: 'Compare variants', steps: [] },
    inputs: FAKE_VARIANT_INPUTS,
    ...(problem ? { problem } : {}),
    baseBranches: { current: 'main', preselected: 'main', branches: ['main', 'dev'] },
    defaultCaps: { spendUsdCap: 20, wallClockMs: 28_800_000, maxIterations: 2 },
  }
}
