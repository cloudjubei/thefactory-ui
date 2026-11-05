import { describe, expect, it } from 'vitest'
import type { ProcessRunStatus } from 'thefactory-tools/types'

import { ALL_PROJECTS_PROCESS_RUN_LIST_KEY } from './processViewCacheConstants'
import { PROCESS_RUN_LIST_COPY } from './processRunListQueryConstants'
import {
  isProcessRunListEnding,
  isProcessRunListStatus,
  processRunGroupScopeValue,
  processRunListCacheKey,
  processRunListEndingOptions,
  processRunListFilterFromValues,
  processRunListMatchesNothing,
  processRunListQuery,
  processRunListRequestFromArg,
  processRunListRequestFromKey,
  processRunListScopeFromValue,
  processRunListScopeOptions,
  processRunListStoryOptions,
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

  it('reads a group’s projects together, whatever order they were given', () => {
    const request: ProcessRunListRequest = {
      scope: { kind: 'group', groupId: 'g1', projectIds: ['p2', 'p1'] },
      filter: {},
    }
    expect(processRunListQuery(request)).toEqual({ rootOnly: true, projectIds: ['p1', 'p2'] })
  })

  it('sends an empty group as an empty project list — omitting it would mean every project', () => {
    const query = processRunListQuery({
      scope: { kind: 'group', groupId: 'g1', projectIds: [] },
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
})

describe('processRunListScopeFromValue', () => {
  const groups = [{ id: 'g1', projects: ['p1', 'p2'] }]

  it('names this project, every project, or a group’s members', () => {
    expect(processRunListScopeFromValue('project', 'p9', groups, true)).toEqual({
      kind: 'project',
      projectId: 'p9',
    })
    expect(processRunListScopeFromValue('all', 'p9', groups, true)).toEqual({ kind: 'all' })
    expect(
      processRunListScopeFromValue(processRunGroupScopeValue('g1'), 'p9', groups, true),
    ).toEqual({
      kind: 'group',
      groupId: 'g1',
      projectIds: ['p1', 'p2'],
    })
  })

  it('holds an unknown group until the group list has loaded, then falls back to the project', () => {
    const value = processRunGroupScopeValue('gone')
    expect(processRunListScopeFromValue(value, 'p9', [], false)).toEqual({
      kind: 'group',
      groupId: 'gone',
      projectIds: [],
    })
    expect(processRunListScopeFromValue(value, 'p9', [], true)).toEqual({
      kind: 'project',
      projectId: 'p9',
    })
  })
})

describe('process run list options', () => {
  it('offers this project, all projects, then groups by title', () => {
    expect(
      processRunListScopeOptions([
        { id: 'b', title: 'Beta' },
        { id: 'a', title: 'Alpha' },
      ]).map((option) => option.label),
    ).toEqual(['This project', 'All projects', 'Alpha', 'Beta'])
  })

  it('names the project beside a story when the list is wider than one', () => {
    const options = processRunListStoryOptions(
      [
        { projectId: 'p2', id: 's2', title: 'Billing' },
        { projectId: 'p1', id: 's1', title: 'Search' },
      ],
      (id) => (id === 'p1' ? 'Tools' : 'Backend'),
      true,
    )
    expect(options.map((option) => option.label)).toEqual([
      'Any story',
      'Billing · Backend',
      'Search · Tools',
    ])
  })

  it('keeps a single project’s stories as titles only', () => {
    expect(
      processRunListStoryOptions(
        [{ projectId: 'p1', id: 's1', title: 'Search' }],
        () => 'Tools',
        false,
      ).map((option) => option.label),
    ).toEqual(['Any story', 'Search'])
  })

  it('offers the run’s own status words, and Not merged / Abandoned for an ending', () => {
    expect(processRunListEndingOptions().map((option) => option.label)).toEqual([
      PROCESS_RUN_LIST_COPY.anyEnding,
      PROCESS_RUN_LIST_COPY.unmerged,
      PROCESS_RUN_LIST_COPY.abandoned,
    ])
    expect(PROCESS_RUN_LIST_COPY.unmerged).toBe('Not merged')
    expect(PROCESS_RUN_LIST_COPY.abandoned).toBe('Abandoned')
  })
})

describe('processRunListFilterFromValues', () => {
  it('leaves any off the query and keeps a real story, status and ending', () => {
    expect(processRunListFilterFromValues({ story: 'any', status: 'any', ending: 'any' })).toEqual(
      {},
    )
    expect(
      processRunListFilterFromValues({ story: 's1', status: 'parked', ending: 'unmerged' }),
    ).toEqual({ storyId: 's1', status: 'parked', ending: 'unmerged' })
    expect(isProcessRunListStatus('parked')).toBe(true)
    expect(isProcessRunListStatus('nope')).toBe(false)
    expect(isProcessRunListEnding('abandoned')).toBe(true)
    expect(isProcessRunListEnding('merged')).toBe(false)
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
