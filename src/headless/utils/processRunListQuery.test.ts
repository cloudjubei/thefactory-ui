import { describe, expect, it } from 'vitest'
import type { ProcessRunStatus } from 'thefactory-tools/types'

import { ALL_PROJECTS_PROCESS_RUN_LIST_KEY } from './processViewCacheConstants'
import {
  processRunListCacheKey,
  processRunListMatchesNothing,
  processRunListQuery,
  processRunListRequestFromArg,
  processRunListRequestFromKey,
  processRunUpdateAction,
  type ProcessRunListRequest,
} from './processRunListQuery'

const project = (projectId: string): ProcessRunListRequest => ({
  scope: { kind: 'project', projectId },
  filter: {},
})

describe('processRunListQuery', () => {
  it('reads one project’s root runs when nothing is narrowed', () => {
    expect(processRunListQuery(project('p1'))).toEqual({ rootOnly: true, projectId: 'p1' })
  })

  it('reads every project when the scope is all', () => {
    expect(processRunListQuery(processRunListRequestFromArg())).toEqual({ rootOnly: true })
    expect(processRunListQuery(processRunListRequestFromArg('p1'))).toEqual({
      rootOnly: true,
      projectId: 'p1',
    })
  })

  it('reads a group’s own runs and its projects’ runs together, whatever order they were given', () => {
    const request: ProcessRunListRequest = {
      scope: { kind: 'group', groupId: 'g1', projectIds: ['p2', 'p1'] },
      filter: {},
    }
    expect(processRunListQuery(request)).toEqual({
      rootOnly: true,
      projectIds: ['p1', 'p2'],
      orGroupId: 'g1',
    })
  })

  it('reads a group with no projects by its own runs — an empty project list cannot be sent', () => {
    const query = processRunListQuery({
      scope: { kind: 'group', groupId: 'g1', projectIds: [] },
      filter: {},
    })
    expect(query).toEqual({ rootOnly: true, groupId: 'g1' })
    expect(processRunListMatchesNothing(query)).toBe(false)
  })

  it('reads projects with no group named as those projects alone', () => {
    expect(
      processRunListQuery({
        scope: { kind: 'group', groupId: '', projectIds: ['p1'] },
        filter: {},
      }),
    ).toEqual({ rootOnly: true, projectIds: ['p1'] })
  })

  it('matches nothing with neither a group nor a project — omitting both would mean every project', () => {
    const query = processRunListQuery({
      scope: { kind: 'group', groupId: '', projectIds: [] },
      filter: {},
    })
    expect(query.projectIds).toEqual([])
    expect(processRunListMatchesNothing(query)).toBe(true)
    expect(processRunListMatchesNothing(processRunListQuery(project('p1')))).toBe(false)
  })

  it('ANDs story, status and ending onto the scope', () => {
    expect(
      processRunListQuery({
        scope: { kind: 'all' },
        filter: { storyId: 's1', status: 'parked', ending: 'unmerged' },
      }),
    ).toEqual({
      rootOnly: true,
      storyId: 's1',
      status: 'parked',
      ending: 'unmerged',
    })
  })
})

describe('processRunListCacheKey', () => {
  it('keeps the keys the unfiltered lists already share', () => {
    expect(processRunListCacheKey(project('p1'))).toBe('p1')
    expect(processRunListCacheKey(processRunListRequestFromArg())).toBe(
      ALL_PROJECTS_PROCESS_RUN_LIST_KEY,
    )
  })

  it('keeps a filtered list apart from the unfiltered one, and round-trips the query', () => {
    const request: ProcessRunListRequest = {
      scope: { kind: 'group', groupId: 'g1', projectIds: ['p2', 'p1'] },
      filter: { ending: 'abandoned', storyId: 's1' },
    }
    const key = processRunListCacheKey(request)
    expect(key).not.toBe('p1')
    expect(key).not.toBe(ALL_PROJECTS_PROCESS_RUN_LIST_KEY)
    expect(processRunListQuery(processRunListRequestFromKey(key))).toEqual(
      processRunListQuery(request),
    )
    expect(processRunListCacheKey(processRunListRequestFromKey('p1'))).toBe('p1')
  })

  it('keeps the group in the key: two groups with the same projects are two lists', () => {
    const of = (groupId: string, projectIds: string[]): ProcessRunListRequest => ({
      scope: { kind: 'group', groupId, projectIds },
      filter: {},
    })
    expect(processRunListCacheKey(of('g1', ['p1']))).not.toBe(
      processRunListCacheKey(of('g2', ['p1'])),
    )
    expect(processRunListRequestFromKey(processRunListCacheKey(of('g1', ['p2', 'p1'])))).toEqual(
      of('g1', ['p1', 'p2']),
    )
    expect(processRunListRequestFromKey(processRunListCacheKey(of('g1', [])))).toEqual(of('g1', []))
    expect(processRunListRequestFromKey(processRunListCacheKey(of('', ['p1'])))).toEqual(
      of('', ['p1']),
    )
  })
})

const run = (projectId: string, status: ProcessRunStatus = 'running', storyId?: string) => ({
  projectId,
  status,
  ...(storyId ? { storyId } : {}),
})

describe('processRunUpdateAction', () => {
  const group: ProcessRunListRequest = {
    scope: { kind: 'group', groupId: 'g1', projectIds: ['p1', 'p2'] },
    filter: {},
  }

  it('tracks a root run in the scope and ignores a child or another project', () => {
    expect(
      processRunUpdateAction({ runId: 'r', projectId: 'p2', run: run('p2') }, group, false),
    ).toBe('upsert')
    expect(
      processRunUpdateAction({ runId: 'c', run: { ...run('p1'), parentRunId: 'r' } }, group, false),
    ).toBe('ignore')
    expect(
      processRunUpdateAction({ runId: 'r', projectId: 'p3', run: run('p3') }, group, false),
    ).toBe('ignore')
  })

  it('tracks a run in a project it belongs to beside its home project', () => {
    const further = { ...run('p1'), alsoProjectIds: ['p2'] }
    expect(
      processRunUpdateAction({ runId: 'r', projectId: 'p1', run: further }, project('p2'), false),
    ).toBe('upsert')
    expect(
      processRunUpdateAction(
        { runId: 'r', projectId: 'p1', alsoProjectIds: ['p2'], run: run('p1') },
        project('p2'),
        false,
      ),
    ).toBe('upsert')
    expect(
      processRunUpdateAction({ runId: 'r', projectId: 'p1', run: further }, project('p3'), false),
    ).toBe('ignore')
    const others: ProcessRunListRequest = {
      scope: { kind: 'group', groupId: 'g9', projectIds: ['p2', 'p4'] },
      filter: {},
    }
    expect(
      processRunUpdateAction({ runId: 'r', projectId: 'p1', run: further }, others, false),
    ).toBe('upsert')
  })

  it('tracks a run of the group whose projects are not its members, and not another group’s', () => {
    const ofGroup = (groupId: string) => ({ ...run('p7'), groupId })
    expect(
      processRunUpdateAction({ runId: 'r', projectId: 'p7', run: ofGroup('g1') }, group, false),
    ).toBe('upsert')
    expect(
      processRunUpdateAction(
        { runId: 'r', projectId: 'p7', groupId: 'g1', run: run('p7') },
        group,
        false,
      ),
    ).toBe('upsert')
    expect(
      processRunUpdateAction({ runId: 'r', projectId: 'p7', run: ofGroup('g2') }, group, false),
    ).toBe('ignore')
    expect(
      processRunUpdateAction(
        { runId: 'r', projectId: 'p7', run: ofGroup('g1') },
        project('p1'),
        false,
      ),
    ).toBe('ignore')
    const unnamed: ProcessRunListRequest = {
      scope: { kind: 'group', groupId: '', projectIds: ['p1'] },
      filter: {},
    }
    expect(
      processRunUpdateAction({ runId: 'r', projectId: 'p7', run: ofGroup('') }, unnamed, false),
    ).toBe('ignore')
    expect(
      processRunUpdateAction(
        { runId: 'r', projectId: 'p7', groupId: '', run: run('p7') },
        unnamed,
        false,
      ),
    ).toBe('ignore')
  })

  it('drops a held run that no longer belongs to the scope, and ignores one it never held', () => {
    const left = run('p1')
    expect(
      processRunUpdateAction({ runId: 'r', projectId: 'p1', run: left }, project('p2'), true),
    ).toBe('drop')
    expect(
      processRunUpdateAction({ runId: 'r', projectId: 'p1', run: left }, project('p2'), false),
    ).toBe('ignore')
    expect(
      processRunUpdateAction({ runId: 'r', projectId: 'p7', run: run('p7') }, group, true),
    ).toBe('drop')
    const ending: ProcessRunListRequest = {
      scope: { kind: 'project', projectId: 'p2' },
      filter: { ending: 'unmerged' },
    }
    expect(processRunUpdateAction({ runId: 'r', projectId: 'p1', run: left }, ending, true)).toBe(
      'drop',
    )
  })

  it('drops a held run that leaves the story or status filter, and inserts one that enters', () => {
    const filtered: ProcessRunListRequest = {
      scope: { kind: 'project', projectId: 'p1' },
      filter: { storyId: 's1', status: 'parked' },
    }
    expect(
      processRunUpdateAction({ runId: 'r', run: run('p1', 'running', 's1') }, filtered, true),
    ).toBe('drop')
    expect(
      processRunUpdateAction({ runId: 'r', run: run('p1', 'parked', 's1') }, filtered, false),
    ).toBe('upsert')
    expect(
      processRunUpdateAction({ runId: 'r', run: run('p1', 'parked', 's2') }, filtered, false),
    ).toBe('ignore')
  })

  it('re-reads a list narrowed by an ending instead of guessing, and still drops a run that left the other filters', () => {
    const ending: ProcessRunListRequest = {
      scope: { kind: 'all' },
      filter: { ending: 'unmerged', status: 'succeeded' },
    }
    expect(processRunUpdateAction({ runId: 'r', run: run('p1', 'succeeded') }, ending, true)).toBe(
      'reread',
    )
    expect(processRunUpdateAction({ runId: 'r', run: run('p1', 'failed') }, ending, true)).toBe(
      'drop',
    )
    expect(processRunUpdateAction({ runId: 'r', deleted: true }, ending, true)).toBe('drop')
    expect(processRunUpdateAction({ runId: 'r', deleted: true }, ending, false)).toBe('ignore')
  })
})
