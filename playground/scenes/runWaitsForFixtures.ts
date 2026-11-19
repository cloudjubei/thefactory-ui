import type {
  ProcessGroupLeg,
  ProcessProposal,
  ProcessRun,
  ProcessRunWait,
} from 'thefactory-tools/types'

import type { ProcessGroupLegRow } from '../../src/headless/utils/processGroupViewTypes'
import type { ProcessWaitForDrafts } from '../../src/headless/utils/processWaitForDraftTypes'

const ENG780 = { label: 'ENG-780', branch: 'eng-780-usage-export' }
const ENG781 = { label: 'ENG-781', pullRequestUrl: 'https://github.com/acme/acme-be/pull/412' }

/** 10:42 on 19 November 2026, local to whoever looks. */
const SINCE = new Date(2026, 10, 19, 10, 42).getTime()
const LATER = new Date(2026, 10, 19, 14, 5).getTime()

const base = {
  id: 'run-eng-821',
  projectId: 'acme-be',
  processId: 'story-default',
  title: 'ENG-821 Export usage by team',
  plan: {
    definitionId: 'story-default',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Story',
    steps: [
      { id: 'features', name: 'Features', kind: 'process' },
      { id: 'code-review', name: 'Code review', kind: 'judge' },
      { id: 'wait-for-work', name: 'Wait for other work', kind: 'check', waitsForWork: true },
      { id: 'proof', name: 'Proof', kind: 'capture' },
      { id: 'report', name: 'Report', kind: 'report' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
    frozenAt: 0,
  },
  loopCounts: {},
  ledger: [],
  startedAt: 0,
  updatedAt: 0,
  input: {},
  workBranch: { name: 'factory/eng-821', baseRef: 'dev', baseSha: 'a'.repeat(40) },
  waitsFor: [ENG780],
}

const run = (over: Record<string, unknown>): ProcessRun =>
  ({ ...base, status: 'running', ...over }) as unknown as ProcessRun

const parked = (wait: ProcessRunWait, over: Record<string, unknown> = {}): ProcessRun =>
  run({
    status: 'parked',
    park: {
      reason: 'waiting-on-work',
      stepId: 'wait-for-work',
      message: 'Waiting on other work.',
      parkedAt: SINCE,
      waitingOn: ['ENG-780'],
    },
    wait,
    ...over,
  })

/** Building and checking now; it waits before its proof. */
export const WAIT_AHEAD = run({})

/** Parked at its wait since 10:42: ENG-780 is not on dev yet. */
export const WAIT_WAITING = parked({
  entries: [{ label: 'ENG-780', waiting: 'eng-780-usage-export is not on dev yet.' }],
  since: SINCE,
  baseRef: 'dev',
})

/** Two entries, one of them already on dev. */
export const WAIT_ONE_ON_BASE = parked(
  {
    entries: [
      { label: 'ENG-780', onBase: { how: 'branch', commit: 'b'.repeat(40), at: SINCE } },
      {
        label: 'ENG-781',
        waiting: 'https://github.com/acme/acme-be/pull/412 is not merged yet.',
      },
    ],
    since: SINCE,
    baseRef: 'dev',
  },
  { waitsFor: [ENG780, ENG781] },
)

/** Git showed ENG-780 on dev: the base came in, the checks run again, then the proof. */
export const WAIT_CLEARED = run({
  ledger: [
    { id: 'w1', stepId: 'wait-for-work', iteration: 1, status: 'running', startedAt: LATER },
  ],
  wait: {
    entries: [{ label: 'ENG-780', onBase: { how: 'branch', commit: 'b'.repeat(40), at: LATER } }],
    since: SINCE,
    baseRef: 'dev',
    settled: { how: 'on-base', at: LATER, baseSha: 'c'.repeat(40) },
  },
})

/** A person carried on before ENG-780 was on dev, with a note; it can still wait again. */
export const WAIT_CONTINUED = run({
  wait: {
    entries: [{ label: 'ENG-780', waiting: 'eng-780-usage-export is not on dev yet.' }],
    baseRef: 'dev',
    settled: { how: 'continued', at: LATER, decidedBy: 'person', decidedVia: 'web' },
    decisions: [
      {
        action: 'continue-now',
        at: LATER,
        note: 'ENG-780 is approved; its merge is only waiting on CI.',
        decidedBy: 'person',
        decidedVia: 'web',
      },
    ],
  },
})

/** A person stopped waiting before the run got to its wait: Wait again is still offered. */
export const WAIT_STOPPED = run({
  wait: {
    entries: [],
    baseRef: 'dev',
    settled: { how: 'dropped', at: LATER, decidedBy: 'person', decidedVia: 'mobile' },
    decisions: [{ action: 'stop-waiting', at: LATER, decidedBy: 'person', decidedVia: 'mobile' }],
  },
})

const leg = (over: Partial<ProcessGroupLeg>): ProcessGroupLeg => ({
  id: 'acme-be',
  projectId: 'acme-be',
  storyId: 's1',
  title: 'ENG-821 Export usage by team',
  dependsOn: [],
  status: 'running',
  ...over,
})

/** A group's legs: one waits for ENG-780 before its proof, the others carry on. */
export const WAIT_GROUP_ROWS: ProcessGroupLegRow[] = [
  {
    leg: leg({ status: 'waiting', runId: base.id, waitsFor: [ENG780], baseBranch: 'dev' }),
    label: 'Waiting on other work',
    tone: 'queued',
    openLabel: 'Open its pipeline',
    readyForSignOff: false,
    canMarkLanded: false,
    waitsFor: 'Waits for ENG-780 to reach dev before its proof · carries on by itself',
  },
  {
    leg: leg({
      id: 'acme-admin',
      projectId: 'acme-admin',
      title: 'ENG-821 Usage export in admin',
      status: 'running',
      runId: 'run-admin',
    }),
    label: 'Running',
    tone: 'running',
    openLabel: 'Open its pipeline',
    readyForSignOff: false,
    canMarkLanded: false,
  },
  {
    leg: leg({
      id: 'acme-web',
      projectId: 'acme-web',
      title: 'ENG-821 Usage page',
      status: 'at-sign-off',
      runId: 'run-user',
    }),
    label: 'Sign off',
    tone: 'review',
    openLabel: 'Sign it off',
    readyForSignOff: true,
    canMarkLanded: false,
  },
]

/** The launch card before a wait is added. */
export const WAIT_DRAFTS_EMPTY: ProcessWaitForDrafts = { rows: [], nextKey: 0, edited: false }

/** One entry filled: ENG-780's delivery branch. */
export const WAIT_DRAFTS_FILLED: ProcessWaitForDrafts = {
  rows: [{ key: 'w0', label: 'ENG-780', target: 'eng-780-usage-export' }],
  nextKey: 1,
  edited: true,
}

/** Two entries, the second in another project by its pull request. */
export const WAIT_DRAFTS_TWO: ProcessWaitForDrafts = {
  rows: [
    { key: 'w0', label: 'ENG-780', target: 'eng-780-usage-export' },
    {
      key: 'w1',
      label: 'ENG-781',
      target: 'https://github.com/acme/acme-admin/pull/88',
      projectId: 'acme-admin',
    },
  ],
  nextKey: 2,
  edited: true,
}

/** A label with nothing git can look for — what the preview answers 400 for. */
export const WAIT_DRAFTS_INVALID: ProcessWaitForDrafts = {
  rows: [{ key: 'w0', label: 'ENG-780', target: '' }],
  nextKey: 1,
  edited: true,
}

/** The preview's answer for a launch that waits for ENG-780. */
export const WAIT_PROPOSAL: Pick<ProcessProposal, 'waitsFor' | 'steps'> = {
  waitsFor: [ENG780],
  steps: [
    { id: 'features', name: 'Features', kind: 'process', agent: false },
    { id: 'code-review', name: 'Code review', kind: 'judge', agent: true },
    {
      id: 'wait-for-work',
      name: 'Wait for other work',
      kind: 'check',
      agent: false,
      waitsForWork: true,
    },
    { id: 'proof', name: 'Proof', kind: 'capture', agent: false },
  ],
}

/** Projects an entry may name. */
export const WAIT_PROJECTS = [
  { id: 'acme-admin', title: 'Acme admin' },
  { id: 'acme-web', title: 'Acme web' },
]
