import { describe, expect, it } from 'vitest'
import type { ProcessLedgerEntry, ProcessRun, ProcessRunStatus } from 'thefactory-tools/types'

import {
  isProcessRunActive,
  isProcessRunCurrent,
  PROCESS_RUN_ACTIVE_STATUSES,
  splitProcessRunsByCurrent,
} from './processRunCurrent'

const approval = (choice: 'approve' | 'reject' | 'request-changes'): ProcessLedgerEntry => ({
  id: 'g',
  stepId: 'sign-off',
  iteration: 1,
  status: 'done',
  outcome: choice === 'approve' ? 'passed' : 'failed',
  startedAt: 0,
  override: { choice, at: 1, ...(choice === 'approve' ? { integration: 'squash' as const } : {}) },
})

const run = (over: Partial<ProcessRun> = {}): ProcessRun => ({
  id: 'r',
  projectId: 'p',
  title: 'File tools',
  status: 'succeeded',
  loopCounts: {},
  ledger: [],
  startedAt: 0,
  updatedAt: 0,
  workBranch: { name: 'factory/file-tools-04bd5862', baseRef: 'main', baseSha: 'a'.repeat(40) },
  plan: {
    definitionId: 'story-default',
    definitionScope: 'global',
    definitionVersion: 6,
    name: 'Story',
    steps: [
      { id: 'features:a', name: 'Feature A', kind: 'process' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
    frozenAt: 0,
  },
  ...over,
})

describe('isProcessRunActive', () => {
  it('partitions the whole status union with no overlap and no gap', () => {
    const all: ProcessRunStatus[] = [
      'pending',
      'running',
      'parked',
      'succeeded',
      'failed',
      'cancelled',
    ]
    expect(all.filter((status) => isProcessRunActive({ status }))).toEqual([
      ...PROCESS_RUN_ACTIVE_STATUSES,
    ])
  })

  it.each(['pending', 'running', 'parked'] as ProcessRunStatus[])('is live while %s', (status) => {
    expect(isProcessRunActive({ status })).toBe(true)
  })

  it.each(['succeeded', 'failed', 'cancelled'] as ProcessRunStatus[])(
    'is not live once %s',
    (status) => {
      expect(isProcessRunActive({ status })).toBe(false)
    },
  )
})

describe('isProcessRunCurrent', () => {
  it.each(['pending', 'running', 'parked'] as ProcessRunStatus[])(
    'keeps a %s run in Current',
    (status) => {
      expect(isProcessRunCurrent(run({ status }))).toBe(true)
    },
  )

  it('keeps approved work that did not land in Current — it still needs the person', () => {
    const notMerged = run({
      ledger: [approval('approve')],
      integration: {
        mode: 'squash',
        status: 'failed',
        error: 'The work conflicts with main in src/file/fileConstants.ts',
        at: 2,
      },
    })
    expect(isProcessRunCurrent(notMerged)).toBe(true)
  })

  it('keeps approved work that was never brought in in Current', () => {
    expect(isProcessRunCurrent(run({ ledger: [approval('approve')] }))).toBe(true)
  })

  it('keeps work being brought in in Current', () => {
    const landing = run({
      ledger: [approval('approve')],
      integration: { mode: 'squash', status: 'integrating', at: 2 },
    })
    expect(isProcessRunCurrent(landing)).toBe(true)
  })

  it('keeps a run that ended on a request for changes it can still be sent back for in Current', () => {
    const plan = {
      ...run().plan,
      steps: [{ id: 'sign-off', name: 'Sign-off', kind: 'gate' as const }],
    }
    const heldBack = run({ status: 'failed', plan, ledger: [approval('request-changes')] })
    expect(isProcessRunCurrent(heldBack)).toBe(true)
  })

  it('moves merged work to History', () => {
    const merged = run({
      ledger: [approval('approve')],
      integration: { mode: 'squash', status: 'integrated', sha: 'c'.repeat(40), at: 2 },
    })
    expect(isProcessRunCurrent(merged)).toBe(false)
  })

  it('moves rejected work to History', () => {
    expect(isProcessRunCurrent(run({ status: 'failed', ledger: [approval('reject')] }))).toBe(false)
  })

  it('moves a stopped run to History', () => {
    expect(isProcessRunCurrent(run({ status: 'cancelled' }))).toBe(false)
  })

  it('moves a finished run with nothing to bring in to History', () => {
    expect(isProcessRunCurrent(run({ workBranch: undefined, ledger: [approval('approve')] }))).toBe(
      false,
    )
  })

  it('moves a nested run’s ending to History — its story run carries the landing', () => {
    expect(isProcessRunCurrent(run({ parentRunId: 'root', ledger: [approval('approve')] }))).toBe(
      false,
    )
  })
})

describe('splitProcessRunsByCurrent', () => {
  it('keeps approved work that did not land in Current and landed work in History, in order', () => {
    const running = run({ id: 'a', status: 'running' })
    const notMerged = run({
      id: 'b',
      ledger: [approval('approve')],
      integration: { mode: 'squash', status: 'failed', at: 2 },
    })
    const merged = run({
      id: 'c',
      ledger: [approval('approve')],
      integration: { mode: 'squash', status: 'integrated', at: 2 },
    })
    const rejected = run({ id: 'd', status: 'failed', ledger: [approval('reject')] })

    const split = splitProcessRunsByCurrent([running, merged, notMerged, rejected])

    expect(split.current.map((r) => r.id)).toEqual(['a', 'b'])
    expect(split.history.map((r) => r.id)).toEqual(['c', 'd'])
  })
})
