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
