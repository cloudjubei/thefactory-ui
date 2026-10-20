import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import {
  featureProcessOverlay,
  isFeatureInLiveRun,
  isReviewable,
  processStatusOverlay,
} from './processStatusOverlay'
import { PROCESS_STATUS_OVERLAY_TITLES } from './processStatusOverlayConstants'

const run = (over: Partial<ProcessRun>): Pick<ProcessRun, 'id' | 'status' | 'park'> =>
  ({ id: 'run-1', status: 'running', ...over }) as Pick<ProcessRun, 'id' | 'status' | 'park'>

const NOW = 1_000

describe('processStatusOverlay', () => {
  it('parked at the SIGN-OFF gate → Reviewable, linking to the run', () => {
    const o = processStatusOverlay(
      run({ status: 'parked', park: { reason: 'gate' } as never }),
      NOW,
    )
    expect(o).toEqual({
      label: 'Reviewable',
      semantic: 'review',
      title: PROCESS_STATUS_OVERLAY_TITLES.review,
      runId: 'run-1',
    })
  })

  it('parked for any OTHER reason → Blocked (it is stuck, not awaiting sign-off)', () => {
    // A step-failed / step-waiting / step-errored park is not a sign-off — the
    // Reviewable word must be reserved for the gate, or it would mean "stuck".
    for (const reason of ['step-failed', 'step-waiting', 'step-errored', 'loop-exhausted']) {
      const o = processStatusOverlay(run({ status: 'parked', park: { reason } as never }), NOW)
      expect(o).toEqual({
        label: 'Blocked',
        semantic: 'stuck',
        title: PROCESS_STATUS_OVERLAY_TITLES.stuck,
        runId: 'run-1',
      })
    }
  })

  it('running or pending → Working', () => {
    expect(processStatusOverlay(run({ status: 'running' }), NOW)?.label).toBe('Working')
    expect(processStatusOverlay(run({ status: 'pending' }), NOW)?.label).toBe('Working')
    expect(processStatusOverlay(run({ status: 'running' }), NOW)?.semantic).toBe('working')
    expect(processStatusOverlay(run({ status: 'running' }), NOW)?.title).toBe(
      PROCESS_STATUS_OVERLAY_TITLES.working,
    )
  })

  it('failed → Blocked', () => {
    expect(processStatusOverlay(run({ status: 'failed' }), NOW)).toEqual({
      label: 'Blocked',
      semantic: 'stuck',
      title: PROCESS_STATUS_OVERLAY_TITLES.stuck,
      runId: 'run-1',
    })
  })

  const decidedRun = (choice: 'reject' | 'request-changes' | 'abandon' | 'retry') =>
    ({
      id: 'run-1',
      status: 'failed',
      plan: { steps: [{ id: 'sign-off', name: 'Sign-off', kind: 'gate' }] },
      ledger: [
        {
          id: 'e1',
          stepId: 'sign-off',
          iteration: 1,
          status: 'done',
          startedAt: 0,
          override: { choice, at: 1 },
        },
      ],
    }) as unknown as ProcessRun

  it('a run a PERSON rejected or abandoned yields NO overlay: its features are pending again', () => {
    for (const choice of ['reject', 'abandon'] as const) {
      expect(processStatusOverlay(decidedRun(choice), NOW)).toBeUndefined()
    }
  })

  it('a run ended on a request for changes says so and links to it, where it is sent back', () => {
    expect(processStatusOverlay(decidedRun('request-changes'), NOW)).toEqual({
      label: 'Changes requested',
      semantic: 'onhold',
      title: PROCESS_STATUS_OVERLAY_TITLES.changesRequested,
      runId: 'run-1',
    })
  })

  it('a run that failed with nobody deciding stays Blocked — it is stuck', () => {
    expect(processStatusOverlay(decidedRun('retry'), NOW)?.label).toBe('Blocked')
  })

  it('a finished (succeeded / cancelled) or absent run yields NO overlay — the stored status stands', () => {
    expect(processStatusOverlay(run({ status: 'succeeded' }), NOW)).toBeUndefined()
    expect(processStatusOverlay(run({ status: 'cancelled' }), NOW)).toBeUndefined()
    expect(processStatusOverlay(undefined, NOW)).toBeUndefined()
  })

  const approvedRun = (integration?: ProcessRun['integration'], shadow = false) =>
    ({
      id: 'run-1',
      status: 'succeeded',
      workBranch: { name: 'factory/x-1', baseRef: 'main', baseSha: 'a'.repeat(40), shadow },
      plan: { steps: [{ id: 'sign-off', name: 'Sign-off', kind: 'gate' }], loops: [] },
      ledger: [
        {
          id: 'e1',
          stepId: 'sign-off',
          iteration: 1,
          status: 'done',
          startedAt: 0,
          override: { choice: 'approve', at: 1, integration: 'squash' },
        },
      ],
      ...(integration ? { integration } : {}),
    }) as unknown as ProcessRun

  it('approved work that did not land says so and links to the run, where it is brought in', () => {
    expect(
      processStatusOverlay(
        approvedRun({ mode: 'squash', status: 'failed', error: 'x', at: 2 }),
        NOW,
      ),
    ).toEqual({
      label: 'Not merged',
      semantic: 'onhold',
      title: PROCESS_STATUS_OVERLAY_TITLES.notLanded,
      runId: 'run-1',
    })
  })

  it('approved work in a project without git of its own says it was not brought in', () => {
    expect(processStatusOverlay(approvedRun(undefined, true), NOW)?.label).toBe('Not brought in')
  })

  it('approved work being brought in shows it is merging', () => {
    expect(
      processStatusOverlay(approvedRun({ mode: 'squash', status: 'integrating', at: 2 }), NOW),
    ).toEqual({
      label: 'Merging',
      semantic: 'working',
      title: PROCESS_STATUS_OVERLAY_TITLES.landing,
      runId: 'run-1',
    })
  })

  it('approved work being brought into a project without git of its own says so without git words', () => {
    expect(
      processStatusOverlay(approvedRun({ mode: 'merge', status: 'integrating', at: 2 }, true), NOW)
        ?.label,
    ).toBe('Bringing in')
  })

  it('approved work that landed yields NO overlay — the stored status stands', () => {
    expect(
      processStatusOverlay(approvedRun({ mode: 'squash', status: 'integrated', at: 2 }), NOW),
    ).toBeUndefined()
  })

  it('parked with no park record at all falls back to Blocked, never Reviewable', () => {
    expect(processStatusOverlay(run({ status: 'parked' }), NOW)?.label).toBe('Blocked')
  })
})

describe('processStatusOverlay — a stop its agent manager has', () => {
  const turn = { runId: 'r', parkedAt: 1, signature: 's', startedAt: 900, chatContextId: 'c' }
  const stopped = (over: Partial<ProcessRun>, reason = 'step-failed') =>
    ({
      id: 'r',
      status: 'parked',
      park: { reason, message: 'm', parkedAt: 1 },
      ...over,
    }) as ProcessRun

  it('reads Working, linking to the run, while the manager is on it', () => {
    expect(processStatusOverlay(stopped({ manager: { turn } }), NOW)).toEqual({
      label: 'Working',
      semantic: 'working',
      title: 'The agent manager is on it — open the pipeline',
      runId: 'r',
    })
    expect(processStatusOverlay(stopped({ manager: { turn } }, 'gate'), NOW)?.label).toBe('Working')
  })

  it('reads Blocked or Reviewable again once the stop is the person’s', () => {
    const stale = 900 + 3 * 60 * 60 * 1000
    expect(processStatusOverlay(stopped({ manager: { turn } }), stale)?.label).toBe('Blocked')
    expect(processStatusOverlay(stopped({ manager: { turn } }, 'gate'), stale)?.label).toBe(
      'Reviewable',
    )
  })
})

describe('isReviewable', () => {
  it('is true only when parked at a gate', () => {
    expect(isReviewable(run({ status: 'parked', park: { reason: 'gate' } as never }))).toBe(true)
    expect(isReviewable(run({ status: 'parked', park: { reason: 'step-failed' } as never }))).toBe(
      false,
    )
    expect(isReviewable(run({ status: 'parked' }))).toBe(false)
    expect(isReviewable(run({ status: 'running' }))).toBe(false)
    expect(isReviewable(undefined)).toBe(false)
  })
})

describe('featureProcessOverlay', () => {
  const plan = {
    definitionId: 'story-default',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Story',
    steps: [
      {
        id: 'features:a',
        name: 'Feature A',
        kind: 'process',
        subject: { kind: 'feature', id: 'a', title: 'A' },
      },
      {
        id: 'features:b',
        name: 'Feature B',
        kind: 'process',
        subject: { kind: 'feature', id: 'b', title: 'B' },
      },
      { id: 'walkthrough', name: 'Walkthrough', kind: 'agent' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
  }
  const storyRun = (over: Partial<ProcessRun>) =>
    ({
      id: 'root',
      projectId: 'p',
      status: 'running',
      plan,
      ledger: [],
      loopCounts: {},
      startedAt: 0,
      updatedAt: 0,
      ...over,
    }) as ProcessRun

  it('shows only on the feature whose step the run is on; a queued feature shows nothing', () => {
    const r = storyRun({ cursor: { stepId: 'features:a', iteration: 1 } })
    expect(featureProcessOverlay(r, 'a', NOW)).toEqual({
      label: 'Working',
      semantic: 'working',
      title: PROCESS_STATUS_OVERLAY_TITLES.working,
      runId: 'root',
    })
    expect(featureProcessOverlay(r, 'b', NOW)).toBeUndefined()
  })

  it('moves with the cursor to the next feature', () => {
    const r = storyRun({ cursor: { stepId: 'features:b', iteration: 1 } })
    expect(featureProcessOverlay(r, 'a', NOW)).toBeUndefined()
    expect(featureProcessOverlay(r, 'b', NOW)?.label).toBe('Working')
  })

  it('shows on every plan feature while the run is on a story-level step', () => {
    const walking = storyRun({ cursor: { stepId: 'walkthrough', iteration: 1 } })
    expect(featureProcessOverlay(walking, 'a', NOW)?.label).toBe('Working')
    expect(featureProcessOverlay(walking, 'b', NOW)?.label).toBe('Working')
    const atGate = storyRun({
      status: 'parked',
      park: { reason: 'gate', message: 'm', parkedAt: 1 },
      cursor: { stepId: 'sign-off', iteration: 1 },
    })
    expect(featureProcessOverlay(atGate, 'a', NOW)?.label).toBe('Reviewable')
    expect(featureProcessOverlay(atGate, 'b', NOW)?.label).toBe('Reviewable')
  })

  it('never shows on a feature the run does not carry', () => {
    expect(
      featureProcessOverlay(
        storyRun({ cursor: { stepId: 'walkthrough', iteration: 1 } }),
        'z',
        NOW,
      ),
    ).toBeUndefined()
    expect(
      featureProcessOverlay(storyRun({ cursor: { stepId: 'features:a', iteration: 1 } }), 'z', NOW),
    ).toBeUndefined()
  })

  it('shows nothing without a run', () => {
    expect(featureProcessOverlay(undefined, 'a', NOW)).toBeUndefined()
  })

  it('shows Blocked only on the feature whose own pipeline stopped', () => {
    const r = storyRun({
      status: 'parked',
      park: { reason: 'step-failed', message: 'm', parkedAt: 1 },
      cursor: { stepId: 'features:a', iteration: 1 },
    })
    expect(featureProcessOverlay(r, 'a', NOW)?.label).toBe('Blocked')
    expect(featureProcessOverlay(r, 'b', NOW)).toBeUndefined()
  })

  it('shows the manager on it only on the feature it is on', () => {
    const turn = { runId: 'm', parkedAt: 1, signature: 's', startedAt: 900, chatContextId: 'c' }
    const r = storyRun({
      status: 'parked',
      park: { reason: 'step-failed', message: 'm', parkedAt: 1 },
      cursor: { stepId: 'features:b', iteration: 1 },
      manager: { turn },
    } as Partial<ProcessRun>)
    expect(featureProcessOverlay(r, 'b', NOW)).toEqual({
      label: 'Working',
      semantic: 'working',
      title: PROCESS_STATUS_OVERLAY_TITLES.managerOnIt,
      runId: 'root',
    })
    expect(featureProcessOverlay(r, 'a', NOW)).toBeUndefined()
  })

  it('shows nothing once the run has ended or before it reaches a step', () => {
    expect(featureProcessOverlay(storyRun({ status: 'failed' }), 'a', NOW)).toBeUndefined()
    expect(featureProcessOverlay(storyRun({ status: 'succeeded' }), 'a', NOW)).toBeUndefined()
    expect(featureProcessOverlay(storyRun({ status: 'pending' }), 'a', NOW)).toBeUndefined()
  })

  describe('isFeatureInLiveRun', () => {
    it('is true for a queued feature and the feature being worked while the run works', () => {
      const r = storyRun({ cursor: { stepId: 'features:a', iteration: 1 } })
      expect(isFeatureInLiveRun(r, 'a')).toBe(true)
      expect(isFeatureInLiveRun(r, 'b')).toBe(true)
    })

    it('is true behind a story-level step, parked or waiting to start', () => {
      expect(
        isFeatureInLiveRun(
          storyRun({
            status: 'parked',
            park: { reason: 'gate', message: 'm', parkedAt: 1 },
            cursor: { stepId: 'sign-off', iteration: 1 },
          }),
          'b',
        ),
      ).toBe(true)
      expect(isFeatureInLiveRun(storyRun({ status: 'pending' }), 'a')).toBe(true)
    })

    it('is false for a feature taken off the run while it was live', () => {
      expect(isFeatureInLiveRun(storyRun({ withdrawnFeatureIds: ['b'] }), 'b')).toBe(false)
      expect(isFeatureInLiveRun(storyRun({ withdrawnFeatureIds: ['b'] }), 'a')).toBe(true)
    })

    it('is false for a feature the run does not carry', () => {
      expect(
        isFeatureInLiveRun(storyRun({ cursor: { stepId: 'features:a', iteration: 1 } }), 'z'),
      ).toBe(false)
    })

    it('is false once the run has ended, and without a run', () => {
      for (const status of ['succeeded', 'failed', 'cancelled'] as const) {
        expect(isFeatureInLiveRun(storyRun({ status }), 'a')).toBe(false)
      }
      expect(isFeatureInLiveRun(undefined, 'a')).toBe(false)
    })

    it('is false for a run without a plan', () => {
      expect(isFeatureInLiveRun({ id: 'r', status: 'running' } as unknown as ProcessRun, 'a')).toBe(
        false,
      )
    })
  })

  it('shows nothing on a step whose run state has no overlay', () => {
    const r = storyRun({ status: 'cancelled', cursor: { stepId: 'features:a', iteration: 1 } })
    expect(featureProcessOverlay(r, 'a', NOW)).toBeUndefined()
  })
})
