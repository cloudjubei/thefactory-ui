import { describe, expect, it } from 'vitest'

import type {
  GroupStoryForm,
  GroupStoryFormRow,
  GroupStoryPartView,
  GroupStoryRunSummary,
  GroupStoryView,
} from './groupStoryTypes'
import { GROUP_STORY_ACTION_LABELS, GROUP_STORY_LIST_FILTER_DEFAULT } from './groupStoryConstants'
import {
  filterGroupStories,
  groupStoryFormFor,
  groupStoryFormMovedPart,
  groupStoryFormPartMoves,
  groupStoryFormProblems,
  groupStoryFormRequest,
  groupStoryFormWithLink,
  groupStoryFormWithLinkStory,
  groupStoryFormWithoutLink,
  groupStoryFormWithoutPart,
  groupStoryFormWithPart,
  groupStoryLinksText,
  groupStoryListCount,
  groupStoryListProjects,
  groupStoryNeedOptions,
  groupStoryNeedTitles,
  groupStoryPartName,
  groupStoryPartPlace,
  groupStoryPartsText,
  groupStoryProgress,
  groupStoryToggledFold,
  groupStoryRunBlockedReason,
  groupStoryRunButton,
  groupStoryRunState,
  groupStoriesOfStory,
  groupStoryStepColumns,
  isLiveGroupStoryRun,
} from './groupStoryView'
import { processGroupBadge } from './processGroupView'
import { PROCESS_RUN_WORDS } from './processViewConstants'

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
    linkViews: [],
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

describe('groupStoryPartsText', () => {
  it('counts the parts and their features done', () => {
    expect(
      groupStoryPartsText(view([part('ui'), part('web', { featuresDone: 3, featuresTotal: 3 })])),
    ).toBe('2 parts · 4/5 done')
  })

  it('names one part in the singular, with nothing to do yet', () => {
    expect(groupStoryPartsText(view([part('ui', { featuresDone: 0, featuresTotal: 0 })]))).toBe(
      '1 part · No features yet',
    )
  })
})

describe('groupStoryToggledFold', () => {
  const folds = { parts: true, overview: true, sections: ['0'] }

  it('opens a folded section and folds an open one', () => {
    expect(groupStoryToggledFold(folds, '1').sections).toEqual(['0', '1'])
    expect(groupStoryToggledFold(folds, '0').sections).toEqual([])
  })

  it('leaves Parts and Overview as they were', () => {
    expect(groupStoryToggledFold({ ...folds, parts: false }, '2')).toMatchObject({
      parts: false,
      overview: true,
    })
  })
})

describe('groupStoryNeedTitles', () => {
  it('names the parts a part needs by their project', () => {
    const v = view([part('backend'), part('ui', { needs: ['s-backend'] })])
    expect(groupStoryNeedTitles(v.partViews[1]!, v)).toEqual(['BACKEND'])
  })

  it('names a part by its story too when its project has several', () => {
    const v = view([
      part('ui', { storyId: 'u1', storyTitle: 'First' }),
      part('ui', { storyId: 'u2', storyTitle: 'Second', needs: ['u1'], step: 2 }),
    ])
    expect(groupStoryNeedTitles(v.partViews[1]!, v)).toEqual(['UI · First'])
  })
})

describe('groupStoryPartName', () => {
  it('is the project alone while it has one part, and its place and story once it has more', () => {
    const v = view([
      part('backend'),
      part('ui', { storyId: 'u1', storyTitle: 'First' }),
      part('ui', { storyId: 'u2', storyTitle: undefined }),
    ])
    expect(v.partViews.map((p) => groupStoryPartName(v, p))).toEqual([
      'BACKEND',
      'UI · First',
      'UI · u2',
    ])
  })
})

describe('groupStoryPartPlace', () => {
  it('says where a part runs among its project’s parts, only when there are several', () => {
    const v = view([part('backend'), part('ui', { storyId: 'u1' }), part('ui', { storyId: 'u2' })])
    expect(v.partViews.map((p) => groupStoryPartPlace(v, p))).toEqual([
      undefined,
      '1 of 2 in UI',
      '2 of 2 in UI',
    ])
  })
})

describe('groupStoryLinksText', () => {
  it('counts the linked stories, or says there are none', () => {
    const link = {
      projectId: 'web',
      projectTitle: 'Web',
      storyId: 'w',
      featuresDone: 0,
      featuresTotal: 0,
    }
    expect(groupStoryLinksText(view([], { linkViews: [link, { ...link, storyId: 'w2' }] }))).toBe(
      '2 linked stories · tracked only',
    )
    expect(groupStoryLinksText(view([], { linkViews: [link] }))).toBe(
      '1 linked story · tracked only',
    )
    expect(groupStoryLinksText(view([]))).toBeUndefined()
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

describe('groupStoryRunButton', () => {
  it('offers Run when nothing stops it', () => {
    expect(groupStoryRunButton(view([part('ui')]))).toEqual({
      disabled: false,
      label: GROUP_STORY_ACTION_LABELS.run,
    })
  })

  it('keeps Run turned off, saying why, while its parts cannot run', () => {
    expect(
      groupStoryRunButton(view([part('ui')], { problems: ['ui and web need each other.'] })),
    ).toEqual({ disabled: true, label: 'ui and web need each other.' })
  })

  it('keeps Run turned off once every part is done', () => {
    expect(groupStoryRunButton(view([part('ui', { status: 'done' })], { status: 'done' }))).toEqual(
      { disabled: true, label: 'Every part is done.' },
    )
  })

  it('offers Run again after the last run is over', () => {
    expect(
      groupStoryRunButton(
        view([part('ui')], {
          latestRun: { groupRunId: 'r', title: 't', status: 'failed', legs: [], startedAt: 0 },
        }),
      ),
    ).toEqual({ disabled: false, label: GROUP_STORY_ACTION_LABELS.run })
  })

  it.each(['pending', 'running', 'parked'] as const)(
    'has no Run while a %s run is going',
    (status) => {
      expect(
        groupStoryRunButton(
          view([part('ui')], {
            latestRun: { groupRunId: 'r', title: 't', status, legs: [], startedAt: 0 },
          }),
        ),
      ).toBeUndefined()
    },
  )
})

const row = (
  key: string,
  projectId: string,
  over: Partial<GroupStoryFormRow> = {},
): GroupStoryFormRow => ({
  key,
  projectId,
  projectTitle: projectId.toUpperCase(),
  choice: 'existing',
  storyId: key,
  needs: [],
  ...over,
})

const form = (over: Partial<GroupStoryForm> = {}): GroupStoryForm => ({
  title: 'Empty folders',
  description: '',
  projects: MEMBERS,
  rows: [],
  links: [],
  ...over,
})

describe('groupStoryFormFor', () => {
  it('starts with no parts and no links, offering every member project', () => {
    expect(groupStoryFormFor(MEMBERS)).toEqual({
      title: '',
      description: '',
      projects: MEMBERS,
      rows: [],
      links: [],
    })
  })

  it('fills a group story’s parts in run order, each needing the other projects’ parts it needs', () => {
    const v = view([
      part('backend'),
      part('ui', { storyId: 'u1', needs: ['s-backend'] }),
      part('ui', { storyId: 'u2', needs: ['u1', 's-backend'], step: 2 }),
    ])
    expect(groupStoryFormFor(MEMBERS, v).rows).toEqual([
      row('s-backend', 'backend'),
      row('u1', 'ui', { needs: ['s-backend'] }),
      row('u2', 'ui', { needs: ['s-backend'] }),
    ])
  })

  it('fills its linked stories in', () => {
    const v = view([part('backend')], {
      linkViews: [
        { projectId: 'web', projectTitle: 'Web', storyId: 'w1', featuresDone: 0, featuresTotal: 1 },
      ],
    })
    expect(groupStoryFormFor(MEMBERS, v).links).toEqual([
      { key: 'link-w1', projectId: 'web', projectTitle: 'Web', storyId: 'w1' },
    ])
  })

  it('keeps a part whose project left the group, so saving does not drop it unseen', () => {
    const v = view([part('mobile')])
    const filled = groupStoryFormFor(MEMBERS, v)
    expect(filled.rows).toEqual([row('s-mobile', 'mobile', { projectTitle: 'MOBILE' })])
    expect(filled.projects.at(-1)).toEqual({ id: 'mobile', title: 'MOBILE' })
  })
})

describe('the form’s parts and links', () => {
  it('adds a project’s next part after its others, as a new story', () => {
    const start = form({ rows: [row('u1', 'ui', { projectTitle: 'UI' })] })
    const added = groupStoryFormWithPart(start, 'ui')
    expect(added.rows).toEqual([
      row('u1', 'ui', { projectTitle: 'UI' }),
      { key: 'new-1', projectId: 'ui', projectTitle: 'UI', choice: 'new', needs: [] },
    ])
    expect(groupStoryFormWithPart(added, 'backend').rows.at(-1)).toMatchObject({
      key: 'new-2',
      projectId: 'backend',
      projectTitle: 'Backend',
    })
  })

  it('moves a part up or down among its own project’s parts only', () => {
    const start = form({
      rows: [row('u1', 'ui'), row('b1', 'backend'), row('u2', 'ui'), row('u3', 'ui')],
    })
    expect(groupStoryFormMovedPart(start, 'u2', 'up').rows.map((r) => r.key)).toEqual([
      'u2',
      'b1',
      'u1',
      'u3',
    ])
    expect(groupStoryFormMovedPart(start, 'u2', 'down').rows.map((r) => r.key)).toEqual([
      'u1',
      'b1',
      'u3',
      'u2',
    ])
    expect(groupStoryFormMovedPart(start, 'u1', 'up')).toBe(start)
    expect(groupStoryFormMovedPart(start, 'u3', 'down')).toBe(start)
    expect(groupStoryFormMovedPart(start, 'b1', 'up')).toBe(start)
  })

  it('says whether a part can move up or down', () => {
    const start = form({ rows: [row('u1', 'ui'), row('b1', 'backend'), row('u2', 'ui')] })
    expect(start.rows.map((r) => groupStoryFormPartMoves(start, r.key))).toEqual([
      { up: false, down: true },
      { up: false, down: false },
      { up: true, down: false },
    ])
  })

  it('drops a part and every need on it', () => {
    const start = form({ rows: [row('b1', 'backend'), row('u1', 'ui', { needs: ['b1'] })] })
    expect(groupStoryFormWithoutPart(start, 'b1').rows).toEqual([row('u1', 'ui')])
  })

  it('adds, fills and drops a linked story', () => {
    const linked = groupStoryFormWithLink(form(), 'web')
    expect(linked.links).toEqual([{ key: 'link-new-1', projectId: 'web', projectTitle: 'Web' }])
    const picked = groupStoryFormWithLinkStory(linked, 'link-new-1', 'w1')
    expect(picked.links).toEqual([
      { key: 'link-new-1', projectId: 'web', projectTitle: 'Web', storyId: 'w1' },
    ])
    expect(groupStoryFormWithoutLink(picked, 'link-new-1').links).toEqual([])
  })
})

describe('groupStoryFormProblems', () => {
  const filled = () =>
    form({ rows: [row('s-ui', 'ui'), row('new-1', 'web', { choice: 'new', needs: ['s-ui'] })] })

  it('finds nothing wrong with a filled form', () => {
    expect(groupStoryFormProblems(filled())).toEqual([])
  })

  it('needs a title', () => {
    expect(groupStoryFormProblems({ ...filled(), title: '  ' })).toEqual(['Give it a title.'])
  })

  it('needs a part or a linked story', () => {
    expect(groupStoryFormProblems(form())).toEqual(['Add a part or a linked story.'])
    expect(
      groupStoryFormProblems(
        form({ links: [{ key: 'l', projectId: 'web', projectTitle: 'Web', storyId: 'w1' }] }),
      ),
    ).toEqual([])
  })

  it('needs the story of a part using one, and of each link', () => {
    expect(
      groupStoryFormProblems(form({ rows: [row('k', 'ui', { storyId: undefined })] })),
    ).toEqual(['Pick UI’s story.'])
    expect(
      groupStoryFormProblems(
        form({ links: [{ key: 'l', projectId: 'web', projectTitle: 'Web' }] }),
      ),
    ).toEqual(['Pick the Web story to link.'])
  })

  it('refuses one story picked twice', () => {
    expect(
      groupStoryFormProblems(form({ rows: [row('a', 'ui'), row('b', 'ui', { storyId: 'a' })] })),
    ).toEqual(['A story is picked twice: each part and link is a story of its own.'])
    expect(
      groupStoryFormProblems(
        form({
          rows: [row('a', 'ui')],
          links: [{ key: 'l', projectId: 'ui', projectTitle: 'UI', storyId: 'a' }],
        }),
      ),
    ).toEqual(['A story is picked twice: each part and link is a story of its own.'])
  })

  it('refuses parts that need each other', () => {
    expect(
      groupStoryFormProblems(
        form({
          rows: [
            row('u', 'ui', { projectTitle: 'UI', needs: ['w'] }),
            row('w', 'web', { projectTitle: 'Web', needs: ['u'] }),
          ],
        }),
      ),
    ).toEqual(['UI and Web need each other, so neither could start.'])
  })

  it('refuses a part needing one that runs after an earlier part of its own project', () => {
    expect(
      groupStoryFormProblems(
        form({
          rows: [
            row('u1', 'ui', { projectTitle: 'UI', needs: ['b1'] }),
            row('b1', 'backend', { projectTitle: 'Backend', needs: ['u2'] }),
            row('u2', 'ui', { projectTitle: 'UI' }),
          ],
        }),
      ),
    ).toEqual(['UI, Backend and UI wait on one another, so none could start.'])
  })

  it('asks new stories another part needs for titles of their own', () => {
    expect(
      groupStoryFormProblems(
        form({
          rows: [
            row('n1', 'ui', { choice: 'new' }),
            row('n2', 'backend', { choice: 'new' }),
            row('w', 'web', { needs: ['n1'] }),
          ],
        }),
      ),
    ).toEqual(['Give each new story another part needs its own title.'])
  })
})

describe('groupStoryFormRequest', () => {
  it('sends the parts in order, what each needs by story or new title, and the links', () => {
    expect(
      groupStoryFormRequest({
        title: ' Empty folders ',
        description: 'Show them',
        projects: MEMBERS,
        rows: [
          row('s-ui', 'ui'),
          row('new-1', 'ui', { choice: 'new', newStoryTitle: ' Then this ' }),
          row('new-2', 'web', { choice: 'new', newStoryTitle: ' ', needs: ['new-1', 's-ui'] }),
          row('new-3', 'backend', { choice: 'new' }),
        ],
        links: [{ key: 'l', projectId: 'web', projectTitle: 'Web', storyId: 'w1' }],
      }),
    ).toEqual({
      title: 'Empty folders',
      description: 'Show them',
      parts: [
        { projectId: 'ui', storyId: 's-ui' },
        { projectId: 'ui', newStoryTitle: 'Then this' },
        { projectId: 'web' },
        { projectId: 'backend' },
      ],
      links: [{ projectId: 'web', storyId: 'w1' }],
      needs: { 's-ui': [], 'Empty folders': ['Then this', 's-ui'] },
    })
  })
})

describe('groupStoryNeedOptions', () => {
  it('offers the other projects’ parts, by project and, when it has several, by story', () => {
    const start = form({
      rows: [
        row('b1', 'backend', { projectTitle: 'Backend' }),
        row('u1', 'ui', { projectTitle: 'UI' }),
        row('new-1', 'ui', { projectTitle: 'UI', choice: 'new', newStoryTitle: 'Then this' }),
        row('w1', 'web', { projectTitle: 'Web' }),
      ],
    })
    expect(groupStoryNeedOptions(start, 'w1', { ui: [{ id: 'u1', title: 'First' }] })).toEqual([
      { id: 'b1', title: 'Backend' },
      { id: 'u1', title: 'UI · First' },
      { id: 'new-1', title: 'UI · Then this' },
    ])
    expect(groupStoryNeedOptions(start, 'u1').map((o) => o.id)).toEqual(['b1', 'w1'])
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
    expect(
      groupStoryRunState(
        run('running', [{ legId: 'ui', projectId: 'ui', storyId: 's-ui', status: 'needs-you' }]),
      ),
    ).toBe('needs-you')
    expect(
      groupStoryRunState(
        run('running', [{ legId: 'ui', projectId: 'ui', storyId: 's-ui', status: 'at-sign-off' }]),
      ),
    ).toBe('needs-you')
  })

  it('reads projects only waiting on other work as waiting, and working ones as running', () => {
    expect(
      groupStoryRunState(
        run('running', [{ legId: 'ui', projectId: 'ui', storyId: 's-ui', status: 'waiting' }]),
      ),
    ).toBe('waiting')
    expect(
      groupStoryRunState(
        run('running', [{ legId: 'ui', projectId: 'ui', storyId: 's-ui', status: 'running' }]),
      ),
    ).toBe('running')
  })
})

describe('groupStoryRunState on a run built on branches', () => {
  const onBranch = (latestRun: object) =>
    view([part('ui')], {
      latestRun: {
        groupRunId: 'r',
        title: 't',
        startedAt: 0,
        buildMode: 'on-branch',
        ...latestRun,
      } as unknown as GroupStoryRunSummary,
    })

  it('reads one project finished and another working as running, not needing you', () => {
    const legs = [
      { legId: 'ui', projectId: 'ui', storyId: 's-ui', status: 'at-sign-off' },
      { legId: 'web', projectId: 'web', storyId: 's-web', status: 'running' },
    ]
    expect(groupStoryRunState(onBranch({ status: 'running', legs }))).toBe('running')
  })

  it('reads the same legs on a run with its own sign-offs as needing you', () => {
    const legs = [
      { legId: 'ui', projectId: 'ui', storyId: 's-ui', status: 'at-sign-off' },
      { legId: 'web', projectId: 'web', storyId: 's-web', status: 'running' },
    ]
    expect(
      groupStoryRunState(onBranch({ status: 'running', legs, buildMode: 'merge-first' })),
    ).toBe('needs-you')
  })

  it.each(['sign-off', 'sign-off-failed'])('reads a run stopped at %s as needing you', (reason) => {
    const legs = [{ legId: 'ui', projectId: 'ui', storyId: 's-ui', status: 'at-sign-off' }]
    expect(groupStoryRunState(onBranch({ status: 'parked', legs, park: { reason } }))).toBe(
      'needs-you',
    )
  })

  it('names the one sign-off on the row’s badge from its stop', () => {
    const legs = [{ legId: 'ui', projectId: 'ui', storyId: 's-ui', status: 'at-sign-off' }]
    const badgeOf = (reason: string) =>
      processGroupBadge(onBranch({ status: 'parked', legs, park: { reason } }).latestRun!).label
    expect(badgeOf('sign-off')).toBe(PROCESS_RUN_WORDS.signOff)
    expect(badgeOf('sign-off-failed')).toBe(PROCESS_RUN_WORDS.needsYou)
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
      legs: [{ legId: 'backend', projectId: 'backend', storyId: 's-backend', status: 'waiting' }],
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
