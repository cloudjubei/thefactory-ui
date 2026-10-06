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
import { PROCESS_RUN_STATUS_VIEW } from './processView'

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
  it('reads the group run’s own stop as waiting for you', () => {
    expect(processGroupBadge(group({ status: 'parked' }))).toEqual({
      label: 'Waiting for you',
      tone: 'on_hold',
    })
  })

  it('reads a running group with a project at its own sign-off as ready for you', () => {
    expect(
      processGroupBadge(group({ legs: [leg('tools', { status: 'at-sign-off' }), leg('ui')] })),
    ).toEqual({ label: 'Ready for you', tone: 'review' })
  })

  it('reads a running group with a project waiting on an answer as waiting for you', () => {
    expect(processGroupBadge(group({ legs: [leg('tools', { status: 'needs-you' })] }))).toEqual({
      label: 'Waiting for you',
      tone: 'on_hold',
    })
  })

  it('reads a running group with nothing for you by its status', () => {
    expect(processGroupBadge(group()).label).toBe(PROCESS_RUN_STATUS_VIEW.running.label)
  })

  it('reads an ended group by its status, whatever its legs say', () => {
    expect(
      processGroupBadge(group({ status: 'succeeded', legs: [leg('a', { status: 'at-sign-off' })] }))
        .label,
    ).toBe('Finished')
  })
})

describe('processGroupProgress', () => {
  it('counts merged legs, leaving skipped and rejected ones out of both sides', () => {
    expect(
      processGroupProgress({
        legs: [
          leg('a', { status: 'integrated' }),
          leg('b', { status: 'rebuilding' }),
          leg('c', { status: 'skipped' }),
          leg('e', { status: 'rejected' }),
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

  it('opens a leg at its sign-off to sign it off there', () => {
    const [[row]] = processGroupLegRows(group({ legs: [leg('tools', { status: 'at-sign-off' })] }))
    expect(row).toMatchObject({ openLabel: 'Sign it off', readyForSignOff: true })
    expect(row.waitsFor).toBeUndefined()
  })

  it('says what a leg at its sign-off waits for before it can merge', () => {
    const rows = processGroupLegRows(
      group({
        legs: [
          leg('backend', { status: 'running' }),
          leg('ui', { dependsOn: ['backend'], status: 'at-sign-off' }),
        ],
      }),
    )
    expect(rows[1][0].waitsFor).toBe('Merges after backend is merged')
  })

  it('opens a leg waiting on an answer to answer it, any other to look', () => {
    const [[asking, running]] = processGroupLegRows(
      group({ legs: [leg('a', { status: 'needs-you' }), leg('b')] }),
    )
    expect(asking).toMatchObject({ openLabel: 'Answer it', readyForSignOff: false })
    expect(running).toMatchObject({ openLabel: 'Open its pipeline', readyForSignOff: false })
  })

  it('reads a rejected leg as rejected', () => {
    const [[row]] = processGroupLegRows(group({ legs: [leg('a', { status: 'rejected' })] }))
    expect(row.label).toBe('Rejected')
  })
})

describe('processGroupCardView', () => {
  it('says what the group run’s own stop waits on', () => {
    const parked = group({
      status: 'parked',
      park: { reason: 'leg-failed', legId: 'tools', message: 'tools stopped.', parkedAt: 0 },
    })
    expect(processGroupCardView(parked)).toEqual({
      title: 'Messaging',
      badge: { label: 'Waiting for you', tone: 'on_hold' },
      sub: '2 projects · 0 merged',
      body: { text: 'tools stopped.', tone: 'on_hold' },
      cta: 'Open the group run',
    })
  })

  it('names the projects ready for their own sign-off', () => {
    expect(
      processGroupCardView(
        group({
          legs: [leg('tools', { status: 'at-sign-off' }), leg('ui', { status: 'at-sign-off' })],
        }),
      ).body,
    ).toEqual({ text: 'tools and ui are ready for sign-off', tone: 'review' })
    expect(
      processGroupCardView(group({ legs: [leg('tools', { status: 'at-sign-off' })] })).body?.text,
    ).toBe('tools is ready for sign-off')
  })

  it('says every project merged when it finished with none rejected', () => {
    expect(
      processGroupCardView(
        group({ status: 'succeeded', legs: [leg('a', { status: 'integrated' })] }),
      ).body,
    ).toEqual({ text: 'Finished · every project merged', tone: 'done' })
  })

  it('counts the rejected projects when it finished with some', () => {
    expect(
      processGroupCardView(
        group({
          status: 'succeeded',
          legs: [leg('a', { status: 'integrated' }), leg('b', { status: 'rejected' })],
        }),
      ).body?.text,
    ).toBe('Finished · 1 merged, 1 rejected')
  })

  it('says why it failed, and nothing while nothing is for you', () => {
    expect(processGroupCardView(group({ status: 'failed', error: 'boom' })).body).toEqual({
      text: 'boom',
      tone: 'stuck',
    })
    expect(processGroupCardView(group()).body).toBeUndefined()
  })
})

describe('processGroupParkView', () => {
  it('offers to try a failed merge again, on the mode it had, every mode allowed', () => {
    const view = processGroupParkView(
      group({
        status: 'parked',
        park: {
          reason: 'integration-failed',
          legId: 'ui',
          message: 'ui could not merge.',
          parkedAt: 0,
        },
        legs: [
          leg('tools'),
          leg('ui', { status: 'integration-failed', integrationMode: 'squash' }),
        ],
      }),
    )!
    expect(view.choices.map((c) => c.choice)).toEqual(['retry-integration', 'abandon'])
    expect(view.toMerge.map((m) => [m.leg.id, m.mode])).toEqual([['ui', 'squash']])
    expect(view.modes).toEqual(['merge', 'squash', 'pull-request'])
  })

  it('offers merge or squash only to retry a leg another leg depends on', () => {
    const view = processGroupParkView(
      group({
        status: 'parked',
        park: { reason: 'integration-failed', legId: 'tools', message: 'x', parkedAt: 0 },
      }),
    )!
    expect(view.toMerge.map((m) => [m.leg.id, m.mode])).toEqual([['tools', 'merge']])
    expect(view.modes).toEqual(['merge', 'squash'])
  })

  it('merges nothing for a leg that stopped', () => {
    const view = processGroupParkView(
      group({
        status: 'parked',
        park: { reason: 'leg-failed', legId: 'tools', message: 'Stopped.', parkedAt: 0 },
      }),
    )!
    expect(view.leg?.id).toBe('tools')
    expect(view.choices.map((c) => c.choice)).toEqual(['retry-leg', 'skip-leg', 'abandon'])
    expect(view.toMerge).toEqual([])
    expect(view.modes).toEqual([])
  })

  it('is nothing while the group run is not parked', () => {
    expect(processGroupParkView(group())).toBeUndefined()
  })
})

describe('processGroupResumeInput', () => {
  it('sends the mode with a retried merge, and a trimmed note', () => {
    expect(
      processGroupResumeInput('retry-integration', { modes: { ui: 'squash' }, note: ' ok ' }),
    ).toEqual({ choice: 'retry-integration', note: 'ok', integration: { ui: 'squash' } })
  })

  it('sends no mode with any other answer, nor an empty note', () => {
    expect(processGroupResumeInput('retry-leg', { modes: { ui: 'squash' }, note: '  ' })).toEqual({
      choice: 'retry-leg',
    })
  })

  it('sends no mode when none was picked', () => {
    expect(processGroupResumeInput('retry-integration', { modes: {} })).toEqual({
      choice: 'retry-integration',
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
