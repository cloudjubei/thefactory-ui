import {
  groupStoryFormFor,
  type GroupProjectStoryOption,
  type GroupStoryForm,
  type GroupStoryPartView,
  type GroupStoryView,
} from 'thefactory-ui/headless'
import { MEMBERS } from '../../src/fakeBackend/fixtures/projects'

export const AT = '2026-10-25T10:00:00.000Z'
export const title = (id: string) => MEMBERS.find((m) => m.id === id)?.title ?? id

export function part(
  projectId: string,
  over: Partial<GroupStoryPartView> = {},
): GroupStoryPartView {
  return {
    projectId,
    projectTitle: title(projectId),
    storyId: `story-${projectId}`,
    storyTitle: 'Conflict-safe editing',
    status: 'pending',
    featuresDone: 0,
    featuresTotal: 2,
    needs: [],
    step: 1,
    ...over,
  }
}

export function story(
  id: string,
  storyTitle: string,
  partViews: GroupStoryPartView[],
  over: Partial<GroupStoryView> = {},
): GroupStoryView {
  const steps: string[][] = []
  for (const p of partViews) {
    if (p.step === undefined) continue
    ;(steps[p.step - 1] ??= []).push(p.storyId)
  }
  return {
    id,
    groupId: 'factory',
    groupTitle: 'TheFactory',
    title: storyTitle,
    description: '',
    parts: partViews.map((p) => ({ projectId: p.projectId, storyId: p.storyId })),
    createdAt: AT,
    updatedAt: AT,
    partViews,
    linkViews: [],
    steps,
    problems: [],
    status: 'pending',
    ...over,
  }
}

export const TWO_IN_UI = story('gs-two-in-ui', 'Files tree: empty folders, then collapsing them', [
  part('thefactory-tools', { storyTitle: 'Empty folders in the file listing', featuresTotal: 1 }),
  part('thefactory-ui', {
    storyId: 'story-ui-empty',
    storyTitle: 'Show empty folders in the files tree',
    step: 2,
    needs: ['story-thefactory-tools'],
    featuresTotal: 2,
  }),
  part('thefactory-ui', {
    storyId: 'story-ui-collapse',
    storyTitle: 'Collapse empty folders on demand',
    step: 3,
    needs: ['story-ui-empty'],
    featuresTotal: 1,
  }),
])

const LINK = (projectId: string, storyTitle: string, over = {}) => ({
  projectId,
  projectTitle: title(projectId),
  storyId: `link-${projectId}`,
  storyTitle,
  status: 'in_progress' as const,
  featuresDone: 1,
  featuresTotal: 3,
  ...over,
})

export const WITH_LINKS = story(
  'gs-with-links',
  'Files tree shows empty folders',
  [
    part('thefactory-tools', { storyTitle: 'Empty folders in the file listing', featuresTotal: 1 }),
    part('thefactory-ui', {
      storyTitle: 'Show empty folders in the files tree',
      step: 2,
      needs: ['story-thefactory-tools'],
      featuresTotal: 2,
    }),
  ],
  {
    links: [
      { projectId: 'thefactory-backend', storyId: 'link-thefactory-backend' },
      { projectId: 'thefactory-overseer-web', storyId: 'link-thefactory-overseer-web' },
    ],
    linkViews: [
      LINK('thefactory-backend', 'Say which file changed'),
      LINK('thefactory-overseer-web', 'Files tab polish', {
        status: 'pending',
        featuresDone: 0,
        featuresTotal: 0,
      }),
    ],
  },
)

export const ONLY_LINKS = story('gs-only-links', 'Watch the release blockers', [], {
  links: [{ projectId: 'thefactory-backend', storyId: 'link-thefactory-backend' }],
  linkViews: [LINK('thefactory-backend', 'Say which file changed')],
  status: undefined,
})

export const STORIES_BY_PROJECT: Record<string, GroupProjectStoryOption[]> = {
  'thefactory-tools': [
    { id: 'story-thefactory-tools', title: 'Empty folders in the file listing', status: 'pending' },
    { id: 't2', title: 'Ongoing improvements', status: 'pending' },
  ],
  'thefactory-backend': [{ id: 'b1', title: 'Say which file changed', status: 'pending' }],
  'thefactory-ui': [
    { id: 'story-thefactory-ui', title: 'Show empty folders in the files tree', status: 'pending' },
  ],
  'thefactory-overseer-web': [],
  'overseer-local': [],
  'thefactory-overseer-mobile': [],
}

export const NEW_FORM = groupStoryFormFor(MEMBERS)

export const FILLED_FORM: GroupStoryForm = {
  ...NEW_FORM,
  title: 'Files tree shows empty folders',
  description: 'An empty folder shows in the files tree on every client.',
  rows: [
    {
      key: 'story-thefactory-tools',
      projectId: 'thefactory-tools',
      projectTitle: title('thefactory-tools'),
      choice: 'existing',
      storyId: 'story-thefactory-tools',
      needs: [],
    },
    {
      key: 'new-1',
      projectId: 'thefactory-ui',
      projectTitle: title('thefactory-ui'),
      choice: 'new',
      needs: ['story-thefactory-tools'],
    },
  ],
}

export const LOOP_FORM: GroupStoryForm = {
  ...FILLED_FORM,
  rows: FILLED_FORM.rows.map((row) =>
    row.projectId === 'thefactory-tools' ? { ...row, needs: ['new-1'] } : row,
  ),
}

export const ORDERED_FORM: GroupStoryForm = {
  ...FILLED_FORM,
  rows: [
    ...FILLED_FORM.rows,
    {
      key: 'new-2',
      projectId: 'thefactory-ui',
      projectTitle: title('thefactory-ui'),
      choice: 'new',
      newStoryTitle: 'Collapse empty folders on demand',
      needs: [],
    },
    {
      key: 'new-3',
      projectId: 'thefactory-ui',
      projectTitle: title('thefactory-ui'),
      choice: 'existing',
      storyId: 'story-thefactory-ui',
      needs: [],
    },
  ],
}

export const LINKED_FORM: GroupStoryForm = {
  ...FILLED_FORM,
  links: [
    {
      key: 'link-b1',
      projectId: 'thefactory-backend',
      projectTitle: title('thefactory-backend'),
      storyId: 'b1',
    },
    {
      key: 'link-new-1',
      projectId: 'thefactory-tools',
      projectTitle: title('thefactory-tools'),
    },
  ],
}
