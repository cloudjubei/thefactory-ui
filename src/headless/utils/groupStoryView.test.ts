import { describe, expect, it } from 'vitest'

import type { GroupStoryForm, GroupStoryPartView, GroupStoryView } from './groupStoryTypes'
import { GROUP_STORY_LIST_FILTER_DEFAULT } from './groupStoryConstants'
import {
  filterGroupStories,
  groupStoryFormFor,
  groupStoryFormProblems,
  groupStoryFormRequest,
  groupStoryListCount,
  groupStoryListProjects,
  groupStoryNeedOptions,
  groupStoryNeedTitles,
  groupStoryProgress,
  groupStoryRunBlockedReason,
  groupStoryRunState,
  groupStoriesOfStory,
  groupStoryStepColumns,
  isLiveGroupStoryRun,
} from './groupStoryView'

function part(projectId: string, over: Partial<GroupStoryPartView> = {}): GroupStoryPartView {
  return {
    projectId,
    projectTitle: projectId.toUpperCase(),
    storyId: `s-${projectId}`,
    storyTitle: `${projectId} story`,
    status: 'pending',
    featuresDone: 1,
    featuresTotal: 2,
    needs: [],
    step: 1,
    ...over,
  }
}

function view(partViews: GroupStoryPartView[], over: Partial<GroupStoryView> = {}): GroupStoryView {
  return {
    id: 'gs1',
    groupId: 'factory',
    title: 'Conflict-safe editing',
    description: '',
    parts: partViews.map((p) => ({ projectId: p.projectId, storyId: p.storyId })),
    createdAt: 'a',
    updatedAt: 'b',
    partViews,
    steps: [],
    problems: [],
    ...over,
  }
}

const MEMBERS = [
  { id: 'backend', title: 'Backend' },
  { id: 'ui', title: 'UI' },
  { id: 'web', title: 'Web' },
]

describe('groupStoryStepColumns', () => {
  it('puts each part in the column of its step, first step first', () => {
    const v = view([part('ui', { step: 2 }), part('backend'), part('web', { step: 2 })])
    expect(groupStoryStepColumns(v).columns).toEqual([
      { step: 1, parts: [part('backend')] },
      { step: 2, parts: [part('ui', { step: 2 }), part('web', { step: 2 })] },
    ])
  })

  it('keeps parts caught in a loop of needs out of the columns', () => {
    const looping = part('ui', { step: undefined })
    expect(groupStoryStepColumns(view([part('backend'), looping]))).toEqual({
      columns: [{ step: 1, parts: [part('backend')] }],
      looping: [looping],
    })
  })
})

describe('groupStoryProgress', () => {
  it('counts every part’s features', () => {
    expect(
      groupStoryProgress(view([part('ui'), part('web', { featuresDone: 3, featuresTotal: 3 })])),
    ).toEqual({
      done: 4,
      total: 5,
      text: '4/5 done',
    })
  })

  it('says there is nothing to do yet when no part has features', () => {
    expect(groupStoryProgress(view([part('ui', { featuresDone: 0, featuresTotal: 0 })])).text).toBe(
      'No features yet',
    )
  })
})

describe('groupStoryNeedTitles', () => {
  it('names the parts a part needs by their project', () => {
    const v = view([part('backend'), part('ui', { needs: ['backend'] })])
    expect(groupStoryNeedTitles(v.partViews[1]!, v)).toEqual(['BACKEND'])
  })
})

describe('isLiveGroupStoryRun', () => {
  it.each(['pending', 'running', 'parked'] as const)('reads a %s run as live', (status) => {
    expect(
      isLiveGroupStoryRun({ groupRunId: 'r', title: 't', status, legs: [], startedAt: 0 }),
    ).toBe(true)
  })

  it.each(['succeeded', 'failed', 'cancelled'] as const)('reads a %s run as over', (status) => {
    expect(
      isLiveGroupStoryRun({ groupRunId: 'r', title: 't', status, legs: [], startedAt: 0 }),
    ).toBe(false)
  })

  it('reads no run as no live run', () => {
    expect(isLiveGroupStoryRun(undefined)).toBe(false)
  })
})

describe('groupStoryRunBlockedReason', () => {
  it('lets a group story run when nothing stops it', () => {
    expect(groupStoryRunBlockedReason(view([part('ui')]))).toBeUndefined()
  })

  it('says why its parts cannot run', () => {
    expect(
      groupStoryRunBlockedReason(view([part('ui')], { problems: ['ui and web need each other.'] })),
    ).toBe('ui and web need each other.')
  })

  it('says it is running already', () => {
    expect(
      groupStoryRunBlockedReason(
        view([part('ui')], {
          latestRun: { groupRunId: 'r', title: 't', status: 'running', legs: [], startedAt: 0 },
        }),
      ),
    ).toBe('It is running now.')
  })

  it('says when every part is done', () => {
    expect(
      groupStoryRunBlockedReason(view([part('ui', { status: 'done' })], { status: 'done' })),
    ).toBe('Every part is done.')
  })
})

describe('groupStoryFormFor', () => {
  it('gives every member project a row that takes no part', () => {
    expect(groupStoryFormFor(MEMBERS).rows).toEqual([
      { projectId: 'backend', projectTitle: 'Backend', choice: 'none', needs: [] },
      { projectId: 'ui', projectTitle: 'UI', choice: 'none', needs: [] },
      { projectId: 'web', projectTitle: 'Web', choice: 'none', needs: [] },
    ])
  })

  it('fills a group story’s parts and needs in', () => {
    const v = view([part('backend'), part('ui', { needs: ['backend'] })])
    const form = groupStoryFormFor(MEMBERS, v)
    expect(form).toMatchObject({ title: 'Conflict-safe editing', description: '' })
    expect(form.rows.slice(0, 2)).toEqual([
      {
        projectId: 'backend',
        projectTitle: 'Backend',
        choice: 'existing',
        storyId: 's-backend',
        needs: [],
      },
      {
        projectId: 'ui',
        projectTitle: 'UI',
        choice: 'existing',
        storyId: 's-ui',
        needs: ['backend'],
      },
    ])
  })

  it('keeps a part whose project left the group, so saving does not drop it unseen', () => {
    const v = view([part('mobile')])
    expect(groupStoryFormFor(MEMBERS, v).rows.at(-1)).toMatchObject({
      projectId: 'mobile',
      choice: 'existing',
    })
  })
})

describe('groupStoryFormProblems', () => {
  const filled = (over: Partial<GroupStoryForm> = {}): GroupStoryForm => ({
    title: 'Empty folders',
    description: '',
    rows: [
      { projectId: 'ui', projectTitle: 'UI', choice: 'existing', storyId: 's-ui', needs: [] },
      { projectId: 'web', projectTitle: 'Web', choice: 'new', needs: ['ui'] },
    ],
    ...over,
  })

  it('finds nothing wrong with a filled form', () => {
    expect(groupStoryFormProblems(filled())).toEqual([])
  })

  it('needs a title', () => {
    expect(groupStoryFormProblems(filled({ title: '  ' }))).toEqual(['Give it a title.'])
  })

  it('needs a project to take part', () => {
    expect(
      groupStoryFormProblems(
        filled({ rows: [{ projectId: 'ui', projectTitle: 'UI', choice: 'none', needs: [] }] }),
      ),
    ).toEqual(['Pick at least one project.'])
  })

  it('needs the story of a project using one', () => {
    expect(
      groupStoryFormProblems(
        filled({ rows: [{ projectId: 'ui', projectTitle: 'UI', choice: 'existing', needs: [] }] }),
      ),
    ).toEqual(['Pick UI’s story.'])
  })

  it('refuses parts that need each other', () => {
    expect(
      groupStoryFormProblems(
        filled({
          rows: [
            { projectId: 'ui', projectTitle: 'UI', choice: 'new', needs: ['web'] },
            { projectId: 'web', projectTitle: 'Web', choice: 'new', needs: ['ui'] },
          ],
        }),
      ),
    ).toEqual(['UI and Web need each other, so neither could start.'])
  })
})

describe('groupStoryFormRequest', () => {
  it('sends the projects taking part, and what each needs among them', () => {
    expect(
      groupStoryFormRequest({
        title: ' Empty folders ',
        description: 'Show them',
        rows: [
          { projectId: 'backend', projectTitle: 'Backend', choice: 'none', needs: [] },
          {
            projectId: 'ui',
            projectTitle: 'UI',
            choice: 'existing',
            storyId: 's-ui',
            needs: ['backend'],
          },
          {
            projectId: 'web',
            projectTitle: 'Web',
            choice: 'new',
            newStoryTitle: ' ',
            needs: ['ui'],
          },
        ],
      }),
    ).toEqual({
      title: 'Empty folders',
      description: 'Show them',
      parts: [{ projectId: 'ui', storyId: 's-ui' }, { projectId: 'web' }],
      needs: { ui: [], web: ['ui'] },
    })
  })

  it('names a new story when the form gives it a title', () => {
    expect(
      groupStoryFormRequest({
        title: 'A',
        description: '',
        rows: [
          {
            projectId: 'web',
            projectTitle: 'Web',
            choice: 'new',
            newStoryTitle: 'Web part',
            needs: [],
          },
        ],
      }).parts,
    ).toEqual([{ projectId: 'web', newStoryTitle: 'Web part' }])
  })
})

describe('groupStoryNeedOptions', () => {
  it('offers the other projects taking part', () => {
    const form: GroupStoryForm = {
      title: 'A',
      description: '',
      rows: [
        { projectId: 'backend', projectTitle: 'Backend', choice: 'new', needs: [] },
        { projectId: 'ui', projectTitle: 'UI', choice: 'existing', storyId: 's', needs: [] },
        { projectId: 'web', projectTitle: 'Web', choice: 'none', needs: [] },
      ],
    }
    expect(groupStoryNeedOptions(form, 'ui')).toEqual([{ id: 'backend', title: 'Backend' }])
  })
})

describe('groupStoriesOfStory', () => {
  const membership = {
    groupId: 'factory',
    groupTitle: 'TheFactory',
    groupStoryId: 'gs1',
    title: 'Knowledge in every run',
  }

  it('is the group stories a listed story is a part of', () => {
    expect(groupStoriesOfStory({ s1: [membership] }, 's1')).toEqual([membership])
  })

  it('is none, the same list every time, for a story that is no part', () => {
    const none = groupStoriesOfStory({ s1: [membership] }, 's2')
    expect(none).toEqual([])
    expect(groupStoriesOfStory({}, 's3')).toBe(none)
  })
})

describe('groupStoryRunState', () => {
  const run = (
    status: NonNullable<GroupStoryView['latestRun']>['status'],
    legs: NonNullable<GroupStoryView['latestRun']>['legs'] = [],
  ) =>
    view([part('ui')], { latestRun: { groupRunId: 'r', title: 't', status, legs, startedAt: 0 } })

  it('reads no run, and an ended one, as not running', () => {
    expect(groupStoryRunState(view([part('ui')]))).toBe('not-running')
    expect(groupStoryRunState(run('succeeded'))).toBe('not-running')
  })

  it('reads a stopped run, a project’s ask and a sign-off as needing you', () => {
    expect(groupStoryRunState(run('parked'))).toBe('needs-you')
    expect(groupStoryRunState(run('running', [{ projectId: 'ui', status: 'needs-you' }]))).toBe(
      'needs-you',
    )
    expect(groupStoryRunState(run('running', [{ projectId: 'ui', status: 'at-sign-off' }]))).toBe(
      'needs-you',
    )
  })

  it('reads projects only waiting on other work as waiting, and working ones as running', () => {
    expect(groupStoryRunState(run('running', [{ projectId: 'ui', status: 'waiting' }]))).toBe(
      'waiting',
    )
    expect(groupStoryRunState(run('running', [{ projectId: 'ui', status: 'running' }]))).toBe(
      'running',
    )
  })
})

describe('groupStoryListProjects', () => {
  it('names each project a part is in once, in the order they first show', () => {
    expect(
      groupStoryListProjects([
        view([part('backend'), part('ui')]),
        view([part('ui'), part('web')], { id: 'gs2' }),
      ]),
    ).toEqual([
      { id: 'backend', title: 'BACKEND' },
      { id: 'ui', title: 'UI' },
      { id: 'web', title: 'WEB' },
    ])
  })
})

describe('filterGroupStories', () => {
  const editing = view([part('backend'), part('ui')], {
    id: 'a',
    title: 'Conflict-safe editing',
    status: 'in_progress',
    latestRun: {
      groupRunId: 'r',
      title: 't',
      status: 'running',
      legs: [{ projectId: 'backend', status: 'waiting' }],
      startedAt: 0,
    },
  })
  const folders = view([part('ui', { storyTitle: 'Show empty folders in the tree' })], {
    id: 'b',
    title: 'Files tree',
    description: 'Empty folders show',
  })
  const knowledge = view([part('web')], {
    id: 'c',
    title: 'Knowledge in every run',
    status: 'done',
  })
  const loose = view([part('web')], { id: 'd', title: 'No status yet', status: undefined })
  const all = [editing, folders, knowledge, loose]
  const ids = (filter: Partial<typeof GROUP_STORY_LIST_FILTER_DEFAULT>) =>
    filterGroupStories(all, { ...GROUP_STORY_LIST_FILTER_DEFAULT, ...filter }).map((s) => s.id)

  it('shows every group story in the group’s order by default', () => {
    expect(ids({})).toEqual(['a', 'b', 'c', 'd'])
  })

  it('searches the position, title, description, and the parts’ projects and stories', () => {
    expect(ids({ query: '3' })).toEqual(['c'])
    expect(ids({ query: 'CONFLICT' })).toEqual(['a'])
    expect(ids({ query: 'empty folders show' })).toEqual(['b'])
    expect(ids({ query: 'in the tree' })).toEqual(['b'])
    expect(ids({ query: 'backend' })).toEqual(['a'])
  })

  it('filters by status, reading a group story with none as pending', () => {
    expect(ids({ status: 'done' })).toEqual(['c'])
    expect(ids({ status: 'not-done' })).toEqual(['a', 'b', 'd'])
    expect(ids({ status: 'pending' })).toEqual(['b', 'd'])
  })

  it('keeps the group stories with a part in the project picked', () => {
    expect(ids({ projectId: 'web' })).toEqual(['c', 'd'])
  })

  it('filters by what the latest run is doing', () => {
    expect(ids({ run: 'waiting' })).toEqual(['a'])
    expect(ids({ run: 'not-running' })).toEqual(['b', 'c', 'd'])
    expect(ids({ run: 'needs-you' })).toEqual([])
  })

  it('orders last first, or by status with the group’s order between equals', () => {
    expect(ids({ sortBy: 'order_desc' })).toEqual(['d', 'c', 'b', 'a'])
    expect(ids({ sortBy: 'status_asc' })).toEqual(['b', 'd', 'a', 'c'])
    expect(ids({ sortBy: 'status_desc' })).toEqual(['c', 'a', 'd', 'b'])
  })
})

describe('groupStoryListCount', () => {
  it('says how many it shows of how many', () => {
    expect(groupStoryListCount(3, 25)).toBe('Showing 3 of 25 group stories')
    expect(groupStoryListCount(1, 1)).toBe('Showing 1 of 1 group story')
  })
})
