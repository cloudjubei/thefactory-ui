import { describe, expect, it } from 'vitest'
import type { ProcessGroupLeg, ProcessGroupRun } from 'thefactory-tools/types'
import {
  processGroupBadge,
  processGroupCardView,
  processGroupLandingCheckView,
  processGroupLegRows,
  processGroupParkView,
  processGroupProgress,
  processGroupLandedNextView,
  processGroupLandingPlanLegIds,
  processGroupResumeInput,
  processGroupResumeRebuildLegIds,
  processGroupResumeView,
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
  it('reads the group run’s own stop as needing you', () => {
    expect(processGroupBadge(group({ status: 'parked' }))).toEqual({
      label: 'Needs you',
      tone: 'on_hold',
    })
  })

  it('reads a running group with a project at its own sign-off as sign off', () => {
    expect(
      processGroupBadge(group({ legs: [leg('tools', { status: 'at-sign-off' }), leg('ui')] })),
    ).toEqual({ label: 'Sign off', tone: 'review' })
  })

  it('reads a running group with a project waiting on an answer as needing you', () => {
    expect(processGroupBadge(group({ legs: [leg('tools', { status: 'needs-you' })] }))).toEqual({
      label: 'Needs you',
      tone: 'on_hold',
    })
  })

  it('reads a running group whose project’s stop its manager has as running, not needing you', () => {
    expect(
      processGroupBadge(group({ legs: [leg('tools', { status: 'manager-on-it' })] })).label,
    ).toBe(PROCESS_RUN_STATUS_VIEW.running.label)
  })

  it('reads a running group with nothing for you by its status', () => {
    expect(processGroupBadge(group()).label).toBe(PROCESS_RUN_STATUS_VIEW.running.label)
  })

  it('reads a group run that ended with only some projects merged as partly done', () => {
    expect(
      processGroupBadge(
        group({
          status: 'failed',
          legs: [leg('tools', { status: 'integrated' }), leg('ui', { status: 'skipped' })],
        }),
      ),
    ).toEqual({ label: 'Partly done', tone: 'stuck' })
  })

  it('reads a group run that failed with nothing merged as failed', () => {
    expect(
      processGroupBadge(group({ status: 'failed', legs: [leg('ui', { status: 'skipped' })] })),
    ).toEqual(PROCESS_RUN_STATUS_VIEW.failed)
  })

  it('reads an ended group by its status, whatever its legs say', () => {
    expect(
      processGroupBadge(group({ status: 'succeeded', legs: [leg('a', { status: 'at-sign-off' })] }))
        .label,
    ).toBe('Done')
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
  it('says a leg whose stop its manager has is the manager’s, in the running tone, to open', () => {
    const [[row]] = processGroupLegRows(
      group({ legs: [leg('tools', { status: 'manager-on-it' })] }),
    )
    expect(row).toMatchObject({
      label: 'Manager on it',
      tone: 'done',
      openLabel: 'Open its pipeline',
      readyForSignOff: false,
    })
  })

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

  it('says a leg’s status in the words a run says it in', () => {
    const labels = processGroupLegRows(
      group({
        legs: [
          leg('a', { status: 'needs-you' }),
          leg('b', { status: 'at-sign-off' }),
          leg('c', { status: 'integrating' }),
          leg('d', { status: 'failed' }),
        ],
      }),
    ).flatMap((wave) => wave.map((r) => r.label))
    expect(labels).toEqual(['Needs you', 'Sign off', 'Merging', 'Failed'])
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

  it('offers to mark a skipped or stopped leg as landed, never one still working or merged', () => {
    const rows = processGroupLegRows(
      group({
        status: 'failed',
        legs: [
          leg('tools', { status: 'integrated' }),
          leg('backend', { status: 'skipped', runId: 'r' }),
          leg('ui', { status: 'failed', runId: 'r2' }),
        ],
      }),
    ).flat()
    expect(rows.map((r) => [r.leg.id, r.canMarkLanded])).toEqual([
      ['tools', false],
      ['backend', true],
      ['ui', true],
    ])
  })

  it('says how a leg marked as landed got there', () => {
    const [row] = processGroupLegRows(
      group({
        legs: [
          leg('backend', {
            status: 'integrated',
            landedBy: {
              commit: 'e9b3c02b8e556cddf40e929faefc993d1a530f20',
              baseRef: 'main',
              source: 'agent-run',
              at: 1,
            },
          }),
        ],
      }),
    ).flat()
    expect(row?.landed).toBe('On main as e9b3c02 — merged by an agent from its run’s chat')
    expect(row?.canMarkLanded).toBe(false)
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
      badge: { label: 'Needs you', tone: 'on_hold' },
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
    ).toEqual({ text: 'Done · every project merged', tone: 'done' })
  })

  it('counts the rejected projects when it finished with some', () => {
    expect(
      processGroupCardView(
        group({
          status: 'succeeded',
          legs: [leg('a', { status: 'integrated' }), leg('b', { status: 'rejected' })],
        }),
      ).body?.text,
    ).toBe('Done · 1 merged, 1 rejected')
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

  it('offers to build a merged prerequisite again or skip its rebuild, merging nothing', () => {
    const view = processGroupParkView(
      group({
        status: 'parked',
        park: {
          reason: 'prerequisite-build-failed',
          legId: 'tools',
          message: 'tools could not be rebuilt.',
          parkedAt: 0,
        },
      }),
    )!
    expect(view.choices.map((c) => [c.choice, c.label])).toEqual([
      ['retry-rebuild', 'Build it again'],
      ['skip-rebuild', 'Skip the rebuild'],
      ['abandon', 'Stop the group run'],
    ])
    expect(view.toMerge).toEqual([])
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

describe('processGroupResumeView', () => {
  const backend = (over: Partial<ProcessGroupLeg> = {}) =>
    leg('backend', { status: 'skipped', runId: 'r-backend', ...over })
  const ui = leg('ui', { status: 'skipped', dependsOn: ['backend'] })
  const landed = backend({
    status: 'integrated',
    landedBy: { commit: 'e9b3c02', baseRef: 'main', source: 'agent-run', at: 1 },
  })
  const reason =
    'ui generates an API client from backend\'s swagger/swagger.json, so only that is refreshed (its "generate-swagger" script) — backend is not built.'

  it('says what starts once the prerequisite is refreshed as its plan says, and why', () => {
    expect(
      processGroupResumeView(group({ status: 'failed', legs: [landed, ui] }), {
        backend: {
          kind: 'api-description',
          reason,
          apiDescriptionScript: 'generate-swagger',
          isolation: { watchedPaths: ['src'] },
        },
      }),
    ).toEqual({
      canResume: true,
      effect: `ui starts on the group run’s agent, once backend's API description is refreshed in a scratch copy. ${reason}`,
    })
  })

  it('says a prerequisite is built first when its plan builds it', () => {
    expect(
      processGroupResumeView(group({ status: 'failed', legs: [landed, ui] }), {
        backend: { kind: 'build', reason: 'ui uses backend.' },
      }),
    ).toEqual({
      canResume: true,
      effect: 'ui starts on the group run’s agent, once backend is rebuilt.',
    })
  })

  it('says what starts holds back when the prerequisite cannot be rebuilt here', () => {
    expect(
      processGroupResumeView(group({ status: 'failed', legs: [landed, ui] }), {
        backend: { kind: 'refuse', reason: 'It runs here.' },
      }),
    ).toEqual({
      canResume: true,
      effect:
        "ui can't start yet — backend can't be rebuilt here, so the group run will ask whether to skip its rebuild. It runs here.",
    })
  })

  it('says a prerequisite whose plan is not read yet is rebuilt only if needed', () => {
    expect(processGroupResumeView(group({ status: 'failed', legs: [landed, ui] }))).toEqual({
      canResume: true,
      effect:
        'ui starts on the group run’s agent, once backend is rebuilt if what needs it uses its build output.',
    })
  })

  it('says nothing is rebuilt when the prerequisite already was', () => {
    const rebuilt = backend({ status: 'integrated', rebuiltAt: 4 })
    expect(processGroupResumeView(group({ status: 'failed', legs: [rebuilt, ui] }))).toEqual({
      canResume: true,
      effect: 'ui starts on the group run’s agent straight away.',
    })
  })

  it('says what a skipped leg still waits on', () => {
    expect(processGroupResumeView(group({ status: 'succeeded', legs: [backend(), ui] }))).toEqual({
      canResume: false,
      reason:
        'ui still needs backend, which is not merged — if that work is on its base branch, mark it as merged first.',
    })
  })

  it('is nothing for a group run still going, cancelled, or with nothing left waiting', () => {
    expect(processGroupResumeView(group())).toBeUndefined()
    expect(
      processGroupResumeView(group({ status: 'cancelled', legs: [backend(), ui] })),
    ).toBeUndefined()
    expect(
      processGroupResumeView(
        group({ status: 'succeeded', legs: [leg('a', { status: 'integrated' })] }),
      ),
    ).toBeUndefined()
  })
})

describe('processGroupResumeRebuildLegIds', () => {
  const ui = leg('ui', { status: 'skipped', dependsOn: ['backend'] })

  it('names the merged prerequisites resuming rebuilds first', () => {
    const landed = leg('backend', {
      status: 'integrated',
      landedBy: { commit: 'e9b3c02', baseRef: 'main', source: 'agent-run', at: 1 },
    })
    expect(
      processGroupResumeRebuildLegIds(group({ status: 'failed', legs: [landed, ui] })),
    ).toEqual(['backend'])
  })

  it('names none for a group run that cannot be resumed', () => {
    expect(
      processGroupResumeRebuildLegIds(
        group({ status: 'failed', legs: [leg('backend', { status: 'skipped' }), ui] }),
      ),
    ).toEqual([])
  })

  it('names none for a group run still going, though a skipped leg could start', () => {
    const landed = leg('backend', {
      status: 'integrated',
      landedBy: { commit: 'e9b3c02', baseRef: 'main', source: 'agent-run', at: 1 },
    })
    expect(processGroupResumeRebuildLegIds(group({ legs: [landed, ui] }))).toEqual([])
  })

  it('names none before the group run is loaded', () => {
    expect(processGroupResumeRebuildLegIds(undefined)).toEqual([])
  })
})

describe('processGroupLandingPlanLegIds', () => {
  it('names the leg when a group run still going has legs that need it', () => {
    expect(processGroupLandingPlanLegIds(group(), 'tools')).toEqual(['tools'])
  })

  it('names nothing when no leg needs it', () => {
    expect(processGroupLandingPlanLegIds(group(), 'ui')).toEqual([])
  })

  it('names nothing for an ended group run, which only a resume carries on', () => {
    expect(processGroupLandingPlanLegIds(group({ status: 'failed' }), 'tools')).toEqual([])
  })

  it('names nothing before the group run is loaded', () => {
    expect(processGroupLandingPlanLegIds(undefined, 'tools')).toEqual([])
  })
})

describe('processGroupLandedNextView', () => {
  it('says what needs the leg starts once it is rebuilt as its plan says, and why', () => {
    expect(
      processGroupLandedNextView(group(), 'tools', {
        kind: 'build',
        reason: 'Scratch.',
        isolation: { watchedPaths: ['src'] },
      }),
    ).toBe('ui starts, once tools is built in a scratch copy. Scratch.')
  })

  it('says what needs it holds back when the leg cannot be rebuilt here', () => {
    expect(
      processGroupLandedNextView(group(), 'tools', { kind: 'refuse', reason: 'It runs here.' }),
    ).toBe(
      "ui can't start yet — tools can't be rebuilt here, so the group run will ask whether to skip its rebuild. It runs here.",
    )
  })

  it('says it is rebuilt only if needed while its plan is not read yet', () => {
    expect(processGroupLandedNextView(group(), 'tools')).toBe(
      'ui starts, once tools is rebuilt if what needs it uses its build output.',
    )
  })

  it('says an ended group run is resumed to start what needs it', () => {
    expect(processGroupLandedNextView(group({ status: 'failed' }), 'tools')).toBe(
      'The group run has ended — resume it to start ui.',
    )
  })

  it('says nothing when no leg needs it', () => {
    expect(processGroupLandedNextView(group(), 'ui')).toBeUndefined()
  })
})

describe('processGroupLandingCheckView', () => {
  it('reads a landed check as the commit, where it is, and the story done', () => {
    expect(
      processGroupLandingCheckView({
        landed: true,
        problems: [],
        landing: {
          commit: 'e9b3c02b8e556cddf40e929faefc993d1a530f20',
          baseRef: 'main',
          subject: 'Agent run 538c0ebd',
          source: 'agent-run',
        },
      }),
    ).toEqual({
      landed: true,
      lines: [
        'Commit e9b3c02 — “Agent run 538c0ebd”',
        'On main — merged by an agent from its run’s chat',
        'Every feature of its story is done',
      ],
    })
  })

  it('leaves out a subject the commit has none of', () => {
    expect(
      processGroupLandingCheckView({
        landed: true,
        problems: [],
        landing: { commit: 'abc1234def', baseRef: 'main', source: 'person' },
      }).lines[0],
    ).toBe('Commit abc1234')
  })

  it('reads a refused check as its problems', () => {
    expect(
      processGroupLandingCheckView({ landed: false, problems: ['No commit was found.'] }),
    ).toEqual({ landed: false, lines: ['No commit was found.'] })
  })
})
