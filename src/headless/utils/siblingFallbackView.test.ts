import { describe, expect, it } from 'vitest'

import type { VerificationCheckResult, VerificationSiblingFallback } from '../api/generated'
import {
  newestChecksEntryId,
  siblingFallbackCheckSets,
  siblingFallbackNoticeState,
  siblingFallbackView,
} from './siblingFallbackView'
import { SIBLING_FALLBACK_CLEARED, SIBLING_FALLBACK_REPLACED } from './siblingFallbackViewConstants'

const LIVE = 'a'.repeat(40)
const STABLE = 'b'.repeat(40)

const lib = {
  name: 'lib',
  label: 'lib (file:../lib)',
  path: '/w/lib',
  liveBranch: 'dev',
  liveSha: LIVE,
  dirty: true,
  dirtyHash: 'h1',
  stableBranch: 'main',
  stableSha: STABLE,
}

function check(over: Partial<VerificationCheckResult> = {}): VerificationCheckResult {
  return {
    id: 'build',
    label: 'Build',
    kind: 'command',
    status: 'passed',
    durationMs: 1,
    summary: 'ok',
    ...over,
  }
}

function fallback(over: Partial<VerificationSiblingFallback> = {}): VerificationSiblingFallback {
  return {
    outcome: 'stable-passed',
    siblings: [lib],
    liveStatus: 'failed',
    liveFailures: ['Build: src/a.ts(1,1): error TS1: x'],
    liveChecks: [check({ status: 'failed' })],
    stableStatus: 'passed',
    message: 'Passed against lib@bbbbbbb; your pending changes in lib break it: Build: …',
    ...over,
  }
}

describe('siblingFallbackView', () => {
  it('reads checks that pass only at the stable branch, with what fails against the pending changes', () => {
    expect(siblingFallbackView(fallback())).toEqual({
      outcome: 'stable-passed',
      tone: 'on_hold',
      title: 'Passes only at the stable branch',
      message: fallback().message,
      chips: [
        {
          name: 'lib',
          live: 'dev@aaaaaaa',
          pending: true,
          stable: 'main@bbbbbbb',
          path: '/w/lib',
        },
      ],
      failures: {
        label: 'Fails with your pending changes',
        lines: ['Build: src/a.ts(1,1): error TS1: x'],
      },
      notReplaced: [],
    })
  })

  it('reads a committed, detached dependency by its commit, and a stable run that failed by its failures', () => {
    const view = siblingFallbackView(
      fallback({
        outcome: 'stable-failed',
        siblings: [{ ...lib, liveBranch: undefined, dirty: false, dirtyHash: undefined }],
        stableFailures: ['Build: y'],
      }),
    )
    expect(view.tone).toBe('stuck')
    expect(view.title).toBe('Fails at the stable branch too')
    expect(view.chips[0]).toMatchObject({ live: 'aaaaaaa', pending: false })
    expect(view.failures).toEqual({ label: 'Fails at the stable branch', lines: ['Build: y'] })
  })

  it('reads a stable run that failed naming nothing as no failures', () => {
    expect(siblingFallbackView(fallback({ outcome: 'stable-failed' })).failures).toBeUndefined()
  })

  it('reads dependencies that could not be checked, with why', () => {
    const view = siblingFallbackView(
      fallback({
        outcome: 'unavailable',
        siblings: [],
        notReplaced: [
          { name: 'lib', label: 'lib', path: '/w/lib', reason: 'it has no main branch' },
        ],
      }),
    )
    expect(view).toMatchObject({
      tone: 'on_hold',
      title: 'Not checked at a stable branch',
      chips: [],
      failures: undefined,
      notReplaced: ['lib: it has no main branch'],
    })
  })
})

describe('siblingFallbackCheckSets', () => {
  const stableChecks = [check()]

  it('offers the stable run first and the run against the pending changes beside it', () => {
    expect(siblingFallbackCheckSets({ checks: stableChecks, siblingFallback: fallback() })).toEqual(
      [
        { id: 'stable', label: 'Stable branch', checks: stableChecks },
        { id: 'live', label: 'Your pending changes', checks: fallback().liveChecks },
      ],
    )
  })

  it('offers the run against the pending changes first when the stable run failed too', () => {
    const live = [check({ status: 'failed' })]
    const failedToo = fallback({
      outcome: 'stable-failed',
      stableChecks: [check({ status: 'failed', id: 's' })],
    })
    expect(siblingFallbackCheckSets({ checks: live, siblingFallback: failedToo })).toEqual([
      { id: 'live', label: 'Your pending changes', checks: live },
      { id: 'stable', label: 'Stable branch', checks: failedToo.stableChecks },
    ])
  })

  it('offers no switch without a second run to show', () => {
    expect(siblingFallbackCheckSets({ checks: stableChecks })).toEqual([])
    expect(
      siblingFallbackCheckSets({
        checks: stableChecks,
        siblingFallback: fallback({ liveChecks: undefined }),
      }),
    ).toEqual([])
    expect(
      siblingFallbackCheckSets({
        checks: [],
        siblingFallback: fallback({ outcome: 'unavailable' }),
      }),
    ).toEqual([])
    expect(siblingFallbackCheckSets(undefined)).toEqual([])
  })
})

describe('siblingFallbackNoticeState', () => {
  const plan = {
    steps: [
      { id: 'dev', kind: 'agent' as const },
      { id: 'checks', kind: 'check' as const },
    ],
  }
  const entry = (id: string, over: object = {}) => ({
    id,
    stepId: 'checks',
    status: 'done' as const,
    ...over,
  })

  it('is current while the attempt it is about is the newest checks attempt', () => {
    const run = {
      plan,
      ledger: [
        entry('c1', { siblingFallback: fallback() }),
        { id: 'd', stepId: 'dev', status: 'done' as const },
      ],
    }
    expect(siblingFallbackNoticeState(run, 'c1')).toEqual({
      state: 'current',
      view: siblingFallbackView(fallback()),
    })
  })

  it('is superseded once a newer checks attempt needed no fallback', () => {
    const run = { plan, ledger: [entry('c1', { siblingFallback: fallback() }), entry('c2')] }
    expect(siblingFallbackNoticeState(run, 'c1')).toEqual({
      state: 'superseded',
      view: siblingFallbackView(fallback()),
      line: SIBLING_FALLBACK_CLEARED,
    })
  })

  it('points at the newer notice once a newer attempt fell back too', () => {
    const run = {
      plan,
      ledger: [
        entry('c1', { siblingFallback: fallback() }),
        entry('c2', { siblingFallback: fallback() }),
      ],
    }
    expect(siblingFallbackNoticeState(run, 'c1')).toMatchObject({
      state: 'superseded',
      line: SIBLING_FALLBACK_REPLACED,
    })
  })

  it('stays current while a newer attempt still runs', () => {
    const run = {
      plan,
      ledger: [entry('c1', { siblingFallback: fallback() }), entry('c2', { status: 'running' })],
    }
    expect(siblingFallbackNoticeState(run, 'c1').state).toBe('current')
  })

  it('is unknown while the run, the attempt or its fallback is not read', () => {
    expect(siblingFallbackNoticeState(undefined, 'c1')).toEqual({ state: 'unknown' })
    expect(siblingFallbackNoticeState({ plan, ledger: [entry('c1')] }, 'c1')).toEqual({
      state: 'unknown',
    })
    expect(siblingFallbackNoticeState({ plan, ledger: [] }, 'c1')).toEqual({ state: 'unknown' })
  })
})

describe('newestChecksEntryId', () => {
  it('names the newest finished attempt of a checks step, never another step or a running one', () => {
    const plan = {
      steps: [
        { id: 'checks', kind: 'check' as const },
        { id: 'dev', kind: 'agent' as const },
      ],
    }
    expect(
      newestChecksEntryId({
        plan,
        ledger: [
          { id: 'c1', stepId: 'checks', status: 'done' },
          { id: 'c2', stepId: 'checks', status: 'running' },
          { id: 'd', stepId: 'dev', status: 'done' },
        ],
      }),
    ).toBe('c1')
    expect(
      newestChecksEntryId({ ledger: [{ id: 'c1', stepId: 'checks', status: 'done' }] }),
    ).toBeUndefined()
  })
})
