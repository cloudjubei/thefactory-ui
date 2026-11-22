import type {
  ProjectsContextValue,
  ProjectsGroupsContextValue,
  Template,
  TemplateForkProgress,
  TemplatesContextValue,
} from 'thefactory-ui/headless'
import { FAKE_GROUP_ID, FAKE_GROUPS, FAKE_PROJECTS } from '../../src/fakeBackend/fixtures/projects'
import type { FixtureRoutes } from './onFixtures'

/** Tiny fixed SVG so a card with a thumbnail stays the same on every load. */
export const SHOWCASE_THUMBNAIL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect fill='%231d4ed8' width='320' height='180'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' fill='white' font-size='28' font-family='system-ui'%3EI%3C/text%3E%3C/svg%3E"

export const SHOWCASE_TEMPLATES: Template[] = [
  {
    id: 'investment-planner',
    name: 'Investment Planner',
    description:
      'A working investment planner you sculpt into your own — calculator, holdings tracker, and personalised top picks.',
    repoUrl: 'https://github.com/cloudjubei/thefactory-templates-financialplanner',
    difficulty: 'intermediate',
    estimatedTime: '1-2 hours',
    thumbnailUrl: SHOWCASE_THUMBNAIL,
  },
  {
    id: 'car-finder',
    name: 'Car Finder',
    description:
      'A working car-buying helper you sculpt into your own — a needs profile, a shortlist, fit-score comparison, and LLM-researched recommendations.',
    repoUrl: 'https://github.com/cloudjubei/thefactory-templates-carfinder',
    difficulty: 'beginner',
    estimatedTime: '30-60 min',
  },
  {
    id: 'plastic-free',
    name: 'Plastic-Free',
    description:
      'A working plastic-free replacement finder you sculpt into your own — state a goal, get products whose materials are verified with proof.',
    repoUrl: 'https://github.com/cloudjubei/thefactory-templates-plasticfree',
    difficulty: 'advanced',
    estimatedTime: '2-3 hours',
  },
]

export const SHOWCASE_FORK_JOB = 'showcase-fork-job'
export const SHOWCASE_PROJECT_ID = 'my-investments'

export const SHOWCASE_FORK_PROGRESS: TemplateForkProgress = {
  jobId: SHOWCASE_FORK_JOB,
  templateId: 'investment-planner',
  projectId: SHOWCASE_PROJECT_ID,
  phase: 'cloning',
  message: 'Cloning template…',
}

export const SHOWCASE_GITHUB_ATTACH_WARNING =
  'Project created, but attaching the GitHub repository failed: repository name already exists on that account.'

/** Terminal done+error progress the backend emits when the local fork succeeded but GitHub attach failed. */
export const SHOWCASE_GITHUB_ATTACH_DONE: TemplateForkProgress = {
  jobId: SHOWCASE_FORK_JOB,
  templateId: 'investment-planner',
  projectId: SHOWCASE_PROJECT_ID,
  phase: 'done',
  message: `Created project ${SHOWCASE_PROJECT_ID}; GitHub repository was not attached`,
  error: SHOWCASE_GITHUB_ATTACH_WARNING,
}

export const SHOWCASE_FORM_PREFILL = {
  initialTemplateId: 'investment-planner',
  initialName: 'My investments',
  initialId: SHOWCASE_PROJECT_ID,
  initialMainGroupId: FAKE_GROUP_ID,
} as const

/** Catalog + GitHub name check; create-from-template POST is added per state. */
export const CREATE_FROM_TEMPLATE_ROUTES: FixtureRoutes = {
  '/api/v1/templates': () => ({ templates: SHOWCASE_TEMPLATES }),
  '/api/v1/projects/github/check-name': () => ({
    connected: false,
    available: false,
  }),
  'POST /api/v1/projects/from-template/abort': () => ({ aborted: true }),
}

/** POST returns a job id; progress (or hang) comes from WS / a pending done waiter. */
export const CREATE_FROM_TEMPLATE_START_ROUTES: FixtureRoutes = {
  ...CREATE_FROM_TEMPLATE_ROUTES,
  'POST /api/v1/projects/from-template': () => ({ jobId: SHOWCASE_FORK_JOB }),
}

/**
 * POST never settles — the form stays genuinely submitting after Create, with no
 * terminal WS event.
 */
export const CREATE_FROM_TEMPLATE_PENDING_ROUTES: FixtureRoutes = {
  ...CREATE_FROM_TEMPLATE_ROUTES,
  'POST /api/v1/projects/from-template': () => new Promise(() => {}),
}

/** Fixed TemplatesContext so picker / idle paint without a catalog fetch. */
export function showcaseTemplatesValue(
  over: Partial<TemplatesContextValue> = {},
): TemplatesContextValue {
  return {
    isLoaded: true,
    loadError: null,
    templates: SHOWCASE_TEMPLATES,
    refresh: async () => undefined,
    createFromTemplate: async () => ({
      jobId: SHOWCASE_FORK_JOB,
      done: new Promise(() => {}),
    }),
    abortCreateFromTemplate: async () => true,
    forkProgress: null,
    ...over,
  }
}

const never = async () => {
  throw new Error('showcase: mutation not available')
}

/** Fixed projects list so collision-checked ids settle on first paint. */
export function showcaseProjectsValue(): ProjectsContextValue {
  return {
    isLoaded: true,
    loadError: null,
    projects: FAKE_PROJECTS,
    activeProjectId: FAKE_PROJECTS[0]?.id,
    activeProject: FAKE_PROJECTS[0],
    setActiveProjectId: () => undefined,
    refresh: async () => undefined,
  }
}

/** Fixed MAIN groups so the group field settles on first paint. */
export function showcaseGroupsValue(): ProjectsGroupsContextValue {
  return {
    isLoaded: true,
    loadError: null,
    groups: FAKE_GROUPS,
    activeGroupId: FAKE_GROUP_ID,
    setActiveGroupId: () => undefined,
    getGroupById: (id) => FAKE_GROUPS.find((g) => g.id === id),
    getGroupForProject: (projectId) =>
      FAKE_GROUPS.find((g) => g.type !== 'SCOPE' && g.projects.includes(projectId)),
    getScopeGroupsForProject: (projectId) =>
      FAKE_GROUPS.filter((g) => g.type === 'SCOPE' && g.projects.includes(projectId)),
    createGroup: never,
    updateGroup: never,
    deleteGroup: never,
    reorderProject: never,
    reorderGroup: never,
    refresh: async () => undefined,
  }
}

export { FAKE_GROUP_ID }
