import { ProcessRunsView } from 'thefactory-ui/web'
import { OnFixtures } from './onFixtures'
import { RUN_CHAT_PROJECT_ID, RUN_CHAT_STANDINGS, runChatRoutes } from './runChatQuietFixtures'
import { SHARED_RUN_LISTED_PROJECT_ID } from './sharedRunFixtures'
import type { Scene } from '../showcase/types'

const noop = () => {}

export const PROJECT_RUNS_SCENES: Scene[] = [
  {
    id: 'project-runs',
    title: 'Project runs list',
    component: 'ProcessRunsView',
    group: 'Process',
    wide: true,
    kind: 'screen',
    description:
      'A project’s Processes tab on the fake backend’s fixtures: every run that belongs to the project, also one filed under another project. What a run’s agent writes in the run’s own chat raises nothing on its row; a stop that needs the person is one Needs you on the run.',
    states: [
      {
        id: 'from-another-project',
        title: 'A run from another project',
        description:
          'The review is filed under TheFactory Backend and also belongs to TheFactory UI: it is listed here with a chip naming its home project, and opens as that project’s run.',
        render: () => (
          <OnFixtures>
            <div className="h-[420px]">
              <ProcessRunsView
                projectId={SHARED_RUN_LISTED_PROJECT_ID}
                onSelectRun={noop}
                onOpenSettings={noop}
              />
            </div>
          </OnFixtures>
        ),
      },
      ...RUN_CHAT_STANDINGS.map((standing) => ({
        id: `run-chat-${standing.id}`,
        title: standing.title,
        description: standing.description,
        render: () => (
          <OnFixtures routes={runChatRoutes(standing.id)}>
            <div className="h-[420px]">
              <ProcessRunsView
                projectId={RUN_CHAT_PROJECT_ID}
                onSelectRun={noop}
                onOpenSettings={noop}
              />
            </div>
          </OnFixtures>
        ),
      })),
    ],
  },
]
