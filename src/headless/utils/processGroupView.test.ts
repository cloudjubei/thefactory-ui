import { describe, expect, it } from 'vitest'
import type { ProcessGroupLeg, ProcessGroupRun } from 'thefactory-tools/types'
import {
  processGroupBadge,
  processGroupCardView,
  processGroupLegRows,
  processGroupParkView,
  processGroupProgress,
  processGroupResumeInput,
  processGroupWorkMs,
} from './processGroupView'

const leg = (id: string, over: Partial<ProcessGroupLeg> = {}): ProcessGroupLeg => ({
  id,
  projectId: id,
  storyId: `s-${id}`,
  title: id,
  dependsOn: [],
  status: 'running',
  ...over,
})

const group = (over: Partial<ProcessGroupRun> = {}): ProcessGroupRun => ({
  id: 'g1',
  groupId: 'factory',
  title: 'Messaging',
  status: 'running',
  legs: [leg('tools'), leg('ui', { dependsOn: ['tools'], status: 'blocked' })],
  startedAt: 0,
  updatedAt: 0,
  ...over,
})

describe('processGroupBadge', () => {
  it('reads a sign-off or an early merge as ready for you, any other stop as waiting', () => {
    const park = (reason: 'sign-off' | 'prerequisite-review' | 'leg-failed') => ({
      status: 'parked' as const,
      park: { reason, message: '', parkedAt: 0 },
    })
    expect(processGroupBadge(park('sign-off')).label).toBe('Ready for you')
    expect(processGroupBadge(park('prerequisite-review')).label).toBe('Ready for you')
    expect(processGroupBadge(park('leg-failed'))).toEqual({
      label: 'Waiting for you',
      tone: 'on_hold',
    })
    expect(processGroupBadge({ status: 'succeeded' }).label).toBe('Finished')
  })
})

describe('processGroupProgress', () => {
  it('counts merged legs, leaving skipped ones out of both sides', () => {
    expect(
      processGroupProgress({
        legs: [
          leg('a', { status: 'integrated' }),
          leg('b', { status: 'rebuilding' }),
          leg('c', { status: 'skipped' }),
          leg('d'),
        ],
      }),
    ).toEqual({ merged: 2, total: 3 })
  })
})

describe('processGroupLegRows', () => {
  it('draws the legs by dependency level, saying what a blocked one waits for', () => {
    const rows = processGroupLegRows(
      group({
        totals: { legs: { tools: { costUsd: 2 } } } as never,
        legs: [
          leg('ui', { dependsOn: ['tools', 'db'], status: 'blocked' }),
          leg('tools'),
          leg('db', { status: 'integrated', rebuildError: 'tsc failed' }),
        ],
      }),
    )
    expect(rows.map((wave) => wave.map((r) => r.leg.id))).toEqual([['tools', 'db'], ['ui']])
    expect(rows[0][0]).toMatchObject({ label: 'Running', totals: { costUsd: 2 } })
    expect(rows[0][1].error).toBe('tsc failed')
    expect(rows[1][0]).toMatchObject({
      label: 'Waiting on another project',
      waitsFor: 'Waits for tools',
    })
  })
})

describe('processGroupCardView', () => {
  it('says how far the group run got, and what it waits on', () => {
    const parked = group({
      status: 'parked',
      park: { reason: 'sign-off', message: 'Sign it off.', parkedAt: 0 },
    })
    expect(processGroupCardView(parked)).toEqual({
      title: 'Messaging',
      badge: { label: 'Ready for you', tone: 'review' },
      sub: '2 projects · 0 merged',
      body: { text: 'Sign it off.', tone: 'review' },
      cta: 'Open the group run',
    })
    expect(processGroupCardView(group({ status: 'failed', error: 'boom' })).body).toEqual({
      text: 'boom',
      tone: 'stuck',
    })
    expect(processGroupCardView(group()).body).toBeUndefined()
  })
})

describe('processGroupParkView', () => {
  it('offers the sign-off’s answers with every leg it would merge, each on its launch mode', () => {
    const view = processGroupParkView(
      group({
        status: 'parked',
        park: { reason: 'sign-off', message: 'Sign it off.', parkedAt: 0 },
        legs: [
          leg('tools', { status: 'integrated' }),
          leg('ui', { status: 'at-sign-off', integrationMode: 'pull-request' }),
          leg('db', { status: 'at-sign-off' }),
        ],
      }),
    )!
    expect(view.choices.map((c) => c.choice)).toEqual(['approve', 'request-changes', 'reject'])
    expect(view.toMerge.map((m) => [m.leg.id, m.mode])).toEqual([
      ['ui', 'pull-request'],
      ['db', 'merge'],
    ])
    expect(view.modes).toContain('pull-request')
  })

  it('offers an early merge of the one prerequisite, merge or squash only', () => {
    const view = processGroupParkView(
      group({
        status: 'parked',
        park: { reason: 'prerequisite-review', legId: 'tools', message: 'Review.', parkedAt: 0 },
      }),
    )!
    expect(view.leg?.id).toBe('tools')
    expect(view.toMerge.map((m) => m.leg.id)).toEqual(['tools'])
    expect(view.modes).toEqual(['merge', 'squash'])
  })

  it('merges nothing for a leg that stopped, and is nothing while running', () => {
    const view = processGroupParkView(
      group({
        status: 'parked',
        park: { reason: 'leg-failed', legId: 'tools', message: 'Stopped.', parkedAt: 0 },
      }),
    )!
    expect(view.toMerge).toEqual([])
    expect(processGroupParkView(group())).toBeUndefined()
  })
})

describe('processGroupResumeInput', () => {
  it('sends the modes with a merge, the legs with a request for changes, and a trimmed note', () => {
    expect(processGroupResumeInput('approve', { modes: { ui: 'squash' }, note: ' ok ' })).toEqual({
      choice: 'approve',
      note: 'ok',
      integration: { ui: 'squash' },
    })
    expect(
      processGroupResumeInput('request-changes', { modes: { ui: 'squash' }, legIds: ['ui'] }),
    ).toEqual({ choice: 'request-changes', legIds: ['ui'] })
    expect(processGroupResumeInput('retry-leg', { note: '  ', legIds: ['ui'] })).toEqual({
      choice: 'retry-leg',
    })
  })
})

describe('processGroupWorkMs', () => {
  it('carries the clock on while a step runs, and stops it while none does', () => {
    expect(processGroupWorkMs({ workMs: 1000, ticking: true, at: 5000 }, 7000)).toBe(3000)
    expect(processGroupWorkMs({ workMs: 1000, ticking: false, at: 5000 }, 7000)).toBe(1000)
    expect(processGroupWorkMs(undefined, 7000)).toBeUndefined()
  })
})
