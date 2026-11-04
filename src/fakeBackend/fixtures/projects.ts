import type {
  ListProjectsGroupsResponse,
  ProjectSpec,
} from '../../headless/api/generated/types.gen'
import { FAKE_STAMP } from './stamps'

export const MEMBERS = [
  { id: 'thefactory-tools', title: 'TheFactory Tools' },
  { id: 'thefactory-backend', title: 'TheFactory Backend' },
  { id: 'thefactory-ui', title: 'TheFactory UI' },
  { id: 'thefactory-overseer-web', title: 'Overseer Web' },
  { id: 'overseer-local', title: 'Overseer Desktop' },
  { id: 'thefactory-overseer-mobile', title: 'Overseer Mobile' },
]

export const FAKE_PROJECT_ID = 'thefactory-tools'

export const FAKE_GROUP_ID = 'overseer'

const STANDALONE_PROJECT_ID = 'wargames'

const project = (id: string, title: string, over: Partial<ProjectSpec> = {}): ProjectSpec => ({
  id,
  title,
  description: `${title}, as the fake backend holds it.`,
  path: `/fake/projects/${id}`,
  repo_url: `https://example.invalid/${id}.git`,
  active: true,
  overrides: {},
  scopeGroupIds: [],
  ...FAKE_STAMP,
  ...over,
})

/** Most recently updated first: the project a client with nothing remembered opens is the first. */
export const FAKE_PROJECTS: ProjectSpec[] = [
  ...MEMBERS.map(({ id, title }) =>
    project(id, title, {
      mainGroupId: FAKE_GROUP_ID,
      ...(id === FAKE_PROJECT_ID ? { updatedAt: '2026-10-26T10:00:00.000Z' } : {}),
      ...(id === 'thefactory-backend' ? { metadata: { isUiApp: false } } : {}),
    }),
  ),
  project(STANDALONE_PROJECT_ID, 'WarGames', {
    codeInfo: { language: 'javascript' },
  }),
]

export const FAKE_GROUPS: ListProjectsGroupsResponse = [
  {
    id: FAKE_GROUP_ID,
    title: 'Overseer',
    type: 'MAIN',
    active: true,
    projects: MEMBERS.map(({ id }) => id),
    ...FAKE_STAMP,
  },
]
