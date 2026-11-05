import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'
import { groupMemberProgress, groupStatusView } from './groupStatusView'
import { GROUP_STATUS_COPY } from './groupStatusViewConstants'
import type { ProjectsGroupMemberStatus, ProjectsGroupStatus } from './groupStatusViewTypes'

const NOW = Date.parse('2026-10-25T12:00:00.000Z')
const COUNTS = { pending: 0, in_progress: 0, reviewable: 0, done: 0, blocked: 0, deferred: 0 }

const member = (
  projectId: string,
  over: Partial<ProjectsGroupMemberStatus> = {},
): ProjectsGroupMemberStatus => ({
  projectId,
  runs: { running: [], parked: [] },
  groupRuns: [],
  storyProgress: { stories: COUNTS, features: COUNTS },
  failingChecks: [],
  git: { available: true, branch: 'main' },
  openRequests: [],
  ...over,
})

const status = (...members: ProjectsGroupMemberStatus[]): ProjectsGroupStatus => ({
  groupId: 'g1',
  generatedAt: '2026-10-25T12:00:00.000Z',
  members,
})

const run = (id: string, projectId: string, over: Partial<ProcessRun> = {}): ProcessRun =>
  ({
    id,
    projectId,
    title: `Run ${id}`,
    status: 'running',
    loopCounts: {},
    ledger: [],
    startedAt: 0,
    updatedAt: 0,
    plan: {
      definitionId: 'story',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Story',
      steps: [{ id: 'build', name: 'Build', kind: 'agent', agentType: 'developer' }],
      loops: [],
      frozenAt: 0,
    },
    ...over,
  }) as ProcessRun

const parked = (id: string, projectId: string): ProcessRun =>
  run(id, projectId, {
    status: 'parked',
    park: { reason: 'step-failed', stepId: 'build', message: 'Build failed.', parkedAt: 0 },
  })

describe('groupStatusView', () => {
  it('keeps the group’s order in its members', () => {
    const view = groupStatusView(status(member('b'), member('a')), [], NOW)
    expect(view.members.map((m) => m.projectId)).toEqual(['b', 'a'])
  })

  describe('a member’s attention', () => {
    const attention = (one: ProjectsGroupMemberStatus, runs: ProcessRun[] = []) =>
      groupStatusView(status(one), runs, NOW).members[0]?.attention

    it('needs the person for a run stopped for them', () => {
      expect(attention(member('a'), [parked('r1', 'a')])).toBe('needs-you')
    })

    it('needs the person at a sign-off', () => {
      const atGate = run('r1', 'a', {
        status: 'parked',
        park: { reason: 'gate', stepId: 'build', message: 'Sign off', parkedAt: 0 },
      })
      expect(attention(member('a'), [atGate])).toBe('needs-you')
    })

    it('needs the person for a failing check', () => {
      const failing = member('a', {
        failingChecks: [
          { kind: 'lint', status: 'failed', summary: '3 errors', ranAt: '2026-10-25T11:00:00Z' },
        ],
      })
      expect(attention(failing)).toBe('needs-you')
    })

    it('needs the person for a request nobody accepted yet', () => {
      const asked = member('a', {
        openRequests: [
          { id: 'q', title: 'Q', status: 'pending', updatedAt: '2026-10-25T11:00:00Z' },
        ],
      })
      expect(attention(asked)).toBe('needs-you')
    })

    it('is working on a running run, a group run or a request under way', () => {
      expect(attention(member('a'), [run('r1', 'a')])).toBe('working')
      expect(
        attention(
          member('a', {
            groupRuns: [
              { id: 'g', title: 'G', status: 'running', updatedAt: '2026-10-25T11:00:00Z' },
            ],
          }),
        ),
      ).toBe('working')
      expect(
        attention(
          member('a', {
            openRequests: [
              { id: 'q', title: 'Q', status: 'in_progress', updatedAt: '2026-10-25T11:00:00Z' },
            ],
          }),
        ),
      ).toBe('working')
    })

    it('is quiet with nothing open', () => {
      expect(attention(member('a'))).toBe('quiet')
    })

    it('does not read a run waiting on its blockers as needing the person', () => {
      const waiting = run('r1', 'a', {
        status: 'parked',
        park: { reason: 'waiting-on-blockers', stepId: 'build', message: 'Waits.', parkedAt: 0 },
      })
      expect(attention(member('a'), [waiting])).toBe('working')
    })
  })

  describe('a member’s runs', () => {
    it('lists the member’s own current runs, what needs the person first', () => {
      const view = groupStatusView(
        status(member('a'), member('b')),
        [run('r1', 'a'), parked('r2', 'a'), run('r3', 'b')],
        NOW,
      )
      expect(view.members[0]?.runs.map((r) => r.id)).toEqual(['r2', 'r1'])
      expect(view.members[1]?.runs.map((r) => r.id)).toEqual(['r3'])
    })

    it('leaves a finished run out', () => {
      const done = run('r1', 'a', { status: 'succeeded' })
      const view = groupStatusView(status(member('a')), [done], NOW)
      expect(view.members[0]?.runs).toEqual([])
    })

    it('counts the root runs it was given, not the child ids the roll-up holds', () => {
      const withChildren = member('a', {
        runs: { running: ['r1', 'child-1', 'child-2'], parked: [] },
      })
      const view = groupStatusView(status(withChildren), [run('r1', 'a')], NOW)
      expect(view.members[0]?.badges.map((b) => b.label)).toEqual(['Running 1'])
    })

    it('falls back on the roll-up’s ids when the runs are not read yet', () => {
      const counted = member('a', { runs: { running: ['r1', 'r2'], parked: ['r3'] } })
      const view = groupStatusView(status(counted), undefined, NOW)
      expect(view.members[0]?.attention).toBe('needs-you')
      expect(view.members[0]?.badges.map((b) => b.label)).toEqual(['Needs you 1', 'Running 2'])
    })
  })

  describe('a member’s badges', () => {
    it('puts what needs the person before what is going on, and leaves zeroes out', () => {
      const one = member('a', {
        openRequests: [
          { id: 'q1', title: 'First', status: 'in_progress', updatedAt: '2026-10-25T11:00:00Z' },
          { id: 'q2', title: 'Second', status: 'blocked', updatedAt: '2026-10-25T11:00:00Z' },
        ],
      })
      const view = groupStatusView(status(one), [parked('r1', 'a'), run('r2', 'a')], NOW)
      expect(view.members[0]?.badges.map((b) => b.label)).toEqual([
        'Needs you 1',
        'Running 1',
        '2 requests',
      ])
    })

    it('names the requests in the badge’s hover', () => {
      const one = member('a', {
        openRequests: [
          { id: 'q1', title: 'First', status: 'accepted', updatedAt: '2026-10-25T11:00:00Z' },
        ],
      })
      const badge = groupStatusView(status(one), [], NOW).members[0]?.badges[0]
      expect(badge?.label).toBe('1 request')
      expect(badge?.title).toBe('First')
    })
  })

  describe('a member’s checks', () => {
    it('reads a failing check as the check chip the app already shows', () => {
      const one = member('a', {
        failingChecks: [
          {
            kind: 'typecheck',
            status: 'failed',
            summary: '2 errors',
            ranAt: '2026-10-25T11:00:00Z',
          },
          { kind: 'test', status: 'error', summary: 'Did not run', ranAt: '2026-10-25T11:00:00Z' },
        ],
      })
      expect(groupStatusView(status(one), [], NOW).members[0]?.checks).toEqual([
        { id: 'types', label: 'Types', state: 'failed', title: '2 errors' },
        { id: 'tests', label: 'Tests', state: 'failed', title: 'Did not run' },
      ])
    })
  })

  describe('a member’s git', () => {
    const git = (value: ProjectsGroupMemberStatus['git']) =>
      groupStatusView(status(member('a', { git: value })), [], NOW).members[0]?.git

    it('says the branch, ahead and behind', () => {
      expect(git({ available: true, branch: 'main', ahead: 2, behind: 1 })).toEqual({
        branch: 'main',
        divergence: '↑2 ↓1',
      })
    })

    it('leaves a side out that is level', () => {
      expect(git({ available: true, branch: 'main', ahead: 2, behind: 0 })?.divergence).toBe('↑2')
      expect(git({ available: true, branch: 'main', behind: 3 })?.divergence).toBe('↓3')
      expect(git({ available: true, branch: 'main' })?.divergence).toBeUndefined()
    })

    it('says so when the checkout could not be read', () => {
      expect(git({ available: false })).toEqual({ unread: GROUP_STATUS_COPY.noCheckout })
    })

    it('has nothing to say with no branch checked out', () => {
      expect(git({ available: true })).toBeUndefined()
    })
  })

  describe('a member’s last activity', () => {
    it('reads against the clock it is given', () => {
      const one = member('a', {
        lastActivity: { at: '2026-10-25T11:30:00.000Z', kind: 'run', id: 'r1' },
      })
      expect(groupStatusView(status(one), [], NOW).members[0]?.activity).toBe('30 minutes ago')
    })

    it('is absent with none, and for a time it cannot read', () => {
      const bad = member('a', { lastActivity: { at: 'never', kind: 'run', id: 'r1' } })
      expect(groupStatusView(status(member('a')), [], NOW).members[0]?.activity).toBeUndefined()
      expect(groupStatusView(status(bad), [], NOW).members[0]?.activity).toBeUndefined()
    })
  })

  describe('group runs', () => {
    const open = (id: string, state: 'pending' | 'running' | 'parked') => ({
      id,
      title: `Group ${id}`,
      status: state,
      updatedAt: '2026-10-25T11:00:00Z',
    })

    it('lists one a member shares once, with every project on it', () => {
      const view = groupStatusView(
        status(
          member('a', { groupRuns: [open('g1', 'running')] }),
          member('b', { groupRuns: [open('g1', 'running')] }),
        ),
        [],
        NOW,
      )
      expect(view.groupRuns).toEqual([
        {
          id: 'g1',
          title: 'Group g1',
          label: 'Running',
          tone: 'running',
          projectIds: ['a', 'b'],
        },
      ])
    })

    it('says a parked one needs the person, and puts it first', () => {
      const view = groupStatusView(
        status(member('a', { groupRuns: [open('g1', 'running'), open('g2', 'parked')] })),
        [],
        NOW,
      )
      expect(view.groupRuns.map((row) => [row.id, row.label])).toEqual([
        ['g2', 'Needs you'],
        ['g1', 'Running'],
      ])
    })
  })

  describe('the headline', () => {
    it('adds the group up, leaving zeroes out', () => {
      const view = groupStatusView(
        status(
          member('a', {
            failingChecks: [
              { kind: 'lint', status: 'failed', summary: 'x', ranAt: '2026-10-25T11:00:00Z' },
            ],
          }),
          member('b', {
            openRequests: [
              { id: 'q', title: 'Q', status: 'accepted', updatedAt: '2026-10-25T11:00:00Z' },
            ],
          }),
        ),
        [parked('r1', 'a'), parked('r2', 'b'), run('r3', 'b')],
        NOW,
      )
      expect(view.headline.map((b) => b.label)).toEqual([
        'Needs you 2',
        'Running 1',
        '1 check failing',
        '1 request',
      ])
    })

    it('counts a request a second member also holds once per member', () => {
      const one = {
        id: 'q',
        title: 'Q',
        status: 'accepted',
        updatedAt: '2026-10-25T11:00:00Z',
      } as const
      const view = groupStatusView(
        status(member('a', { openRequests: [one] }), member('b', { openRequests: [one] })),
        [],
        NOW,
      )
      expect(view.headline.map((b) => b.label)).toEqual(['2 requests'])
    })

    it('is empty for a quiet group', () => {
      expect(groupStatusView(status(member('a')), [], NOW).headline).toEqual([])
    })
  })

  describe('the sections', () => {
    it('groups members by what they need, in order, leaving empty ones out', () => {
      const view = groupStatusView(
        status(member('quiet'), member('busy'), member('stuck')),
        [run('r1', 'busy'), parked('r2', 'stuck')],
        NOW,
      )
      expect(view.sections.map((s) => [s.id, s.members.map((m) => m.projectId)])).toEqual([
        ['needs-you', ['stuck']],
        ['working', ['busy']],
        ['quiet', ['quiet']],
      ])
    })
  })
})

describe('groupMemberProgress', () => {
  it('reads done over what counts, leaving deferred work out', () => {
    expect(
      groupMemberProgress({
        stories: { ...COUNTS, done: 3, pending: 1, deferred: 1 },
        features: { ...COUNTS, done: 6, in_progress: 2, blocked: 1, reviewable: 1, deferred: 4 },
      }),
    ).toEqual({ stories: '3/4 stories', features: '6/10 features', percent: 60 })
  })

  it('has nothing to say for a project with no work', () => {
    expect(groupMemberProgress({ stories: COUNTS, features: COUNTS })).toBeUndefined()
  })

  it('reads stories alone when none has features', () => {
    expect(
      groupMemberProgress({ stories: { ...COUNTS, done: 1, pending: 1 }, features: COUNTS }),
    ).toEqual({ stories: '1/2 stories', percent: 50 })
  })

  it('reads a single story as one', () => {
    expect(
      groupMemberProgress({ stories: { ...COUNTS, pending: 1 }, features: COUNTS })?.stories,
    ).toBe('0/1 story')
  })
})
