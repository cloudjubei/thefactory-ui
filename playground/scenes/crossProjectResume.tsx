import { CrossProjectSettings } from 'thefactory-ui/web'
import { OnFixtures, type FixtureRoutes } from './onFixtures'
import type { Scene } from '../showcase/types'

const RESUME_KEY = 'crossProjectResumeMode'

/** The user-global default the settings read, set to this mode. */
const globalDefault = (mode: string): FixtureRoutes => ({
  [`/api/v1/settings/${RESUME_KEY}`]: () => ({ key: RESUME_KEY, value: { mode } }),
})

/** The open project's record, set to this mode. */
const projectOverride = (mode: string): FixtureRoutes => ({
  '/api/v1/projects/{projectId}/data': (_, query) =>
    query.get('key') === RESUME_KEY ? [{ key: RESUME_KEY, content: { mode } }] : [],
})

function Settings({ routes }: { routes?: FixtureRoutes }) {
  return (
    <OnFixtures {...(routes ? { routes } : {})}>
      <div className="w-[560px] max-w-full p-4">
        <CrossProjectSettings />
      </div>
    </OnFixtures>
  )
}

const CHANGED_DEFAULT = globalDefault('notify')
const THIS_PROJECT = { ...globalDefault('notify'), ...projectOverride('auto') }

export const CROSS_PROJECT_RESUME_SCENES: Scene[] = [
  {
    id: 'cross-project-resume',
    title: 'When a sent request finishes',
    component: 'CrossProjectSettings',
    group: 'Settings',
    description:
      'What the sending chat does when a feature request it sent finishes: ask first, only say so in the chat, or carry on by itself. A default for every project, and an override for the open one, read in the backend’s order.',
    states: [
      {
        id: 'nothing-set',
        title: 'Nothing set',
        description: 'Neither layer is set, so it asks first.',
        render: () => <Settings />,
      },
      {
        id: 'default-changed',
        title: 'Default changed',
        description: 'The default is Notify, and the project follows it.',
        render: () => <Settings routes={CHANGED_DEFAULT} />,
      },
      {
        id: 'project-override',
        title: 'Project override',
        description: 'This project wakes its agent by itself, over a default of Notify.',
        render: () => <Settings routes={THIS_PROJECT} />,
      },
    ],
  },
]
