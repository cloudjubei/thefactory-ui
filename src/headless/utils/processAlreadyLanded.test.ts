import { describe, expect, it } from 'vitest'

import type { ProcessRun } from 'thefactory-tools/types'

import {
  processAlreadyLandedAsked,
  processAlreadyLandedOffer,
  processAlreadyOnBaseSignOff,
} from './processAlreadyLanded'

const SHA = '1d1ed0a8841681a62be9ccb503bffaee08dedbd8'
const landedBy = { commit: SHA, subject: 'notes' }
const workBranch = { name: 'factory/pdf-62f6dc78', baseRef: 'dev', baseSha: SHA }
const run = { storyId: 'c6df09da', workBranch }

const preview = {
  check: { kind: 'already-landed' as const, baseRef: 'dev', tip: '7'.repeat(40), landedBy },
  offered: true,
  features: [
    { id: 'f3', title: 'Remove the smoke script', status: 'reviewable', after: 'done' },
    { id: 'f4', title: 'Still pending', status: 'pending', after: 'pending' },
  ],
}

describe('processAlreadyLandedAsked', () => {
  const stopped = {
    id: 'ed34ace8',
    projectId: 'thefactory-tools',
    storyId: 'c6df09da',
    title: 'Story',
    workBranch,
    status: 'parked',
    loopCounts: {},
    startedAt: 0,
    updatedAt: 0,
    plan: {
      definitionId: 'story-default',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Story',
      frozenAt: 0,
      loops: [],
      steps: [
        { id: 'resolve-conflict~2', name: 'Resolve conflict', kind: 'agent' },
        { id: 'confirm-landing~2', name: 'Confirm the merge', kind: 'gate' },
      ],
    },
    ledger: [],
    park: { reason: 'step-failed', stepId: 'resolve-conflict~2', message: 'm', parkedAt: 1 },
  } as ProcessRun

  it('asks for a run at a stop of its own when the stop is what is asked about', () => {
    expect(processAlreadyLandedAsked(stopped, 'stop')).toBe(true)
  })

  it('does not ask for a run at a stop when an ended run is what is asked about', () => {
    expect(processAlreadyLandedAsked(stopped, 'ended')).toBe(false)
  })

  it('asks nothing without a run', () => {
    expect(processAlreadyLandedAsked(undefined, 'stop')).toBe(false)
  })
})

describe('processAlreadyLandedOffer', () => {
  it('offers finishing as landed, saying where the work already is and what becomes done', () => {
    expect(processAlreadyLandedOffer(run, preview)).toEqual({
      text: 'Nothing to merge — this work was already on dev (since 1d1ed0a “notes”).',
      sha: SHA,
      features: [
        { dependency: 'c6df09da.f3', title: 'Remove the smoke script', becomesDone: true },
        { dependency: 'c6df09da.f4', title: 'Still pending', becomesDone: false },
      ],
      label: 'Finish as already merged',
      detail:
        'Nothing is merged: its features are marked done, the work branch factory/pdf-62f6dc78 is removed and the run moves to History.',
    })
  })

  it('counts a feature already done as not becoming done', () => {
    const done = {
      ...preview,
      features: [{ id: 'f3', title: 'Done before', status: 'done', after: 'done' }],
    }
    expect(processAlreadyLandedOffer(run, done)?.features[0]?.becomesDone).toBe(false)
  })

  it('offers nothing when git found work the base does not hold', () => {
    expect(
      processAlreadyLandedOffer(run, { ...preview, check: { kind: 'adds-work', commits: 1 } }),
    ).toBeUndefined()
  })

  it('offers nothing for a run that cannot be finished so', () => {
    expect(processAlreadyLandedOffer(run, { ...preview, offered: false })).toBeUndefined()
  })

  it('offers nothing before the server answered', () => {
    expect(processAlreadyLandedOffer(run, undefined)).toBeUndefined()
  })

  it('offers nothing for a run with no work branch', () => {
    expect(processAlreadyLandedOffer({ storyId: 's' }, preview)).toBeUndefined()
  })
})

describe('processAlreadyOnBaseSignOff', () => {
  it('says up front that approving merges nothing, and approves by the first way offered', () => {
    expect(processAlreadyOnBaseSignOff(workBranch, landedBy)).toEqual({
      notice:
        'The work branch adds nothing dev does not already hold — it has been on dev since 1d1ed0a “notes”. Approving merges nothing: its features are marked done and the work branch is removed.',
      approveLabel: 'Approve — already on dev',
      decision: { mode: 'merge' },
    })
  })

  it('approves by the narrowed way of a group leg', () => {
    expect(processAlreadyOnBaseSignOff(workBranch, landedBy, ['squash'])?.decision).toEqual({
      mode: 'squash',
    })
  })

  it('is nothing when the base does not hold the work', () => {
    expect(processAlreadyOnBaseSignOff(workBranch, undefined)).toBeUndefined()
  })
})
