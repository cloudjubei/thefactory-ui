import { PROCESS_RUN_LIST_COPY } from 'thefactory-ui/headless'
import { ProcessRunsView } from 'thefactory-ui/web'
import { OnFixtures, Picked } from './onFixtures'
import type { Scene } from '../showcase/types'

const noop = () => {}
const { scope: SCOPE, story: STORY, status: STATUS, ending: ENDING } = PROCESS_RUN_LIST_COPY

/** The list as a project's Processes tab draws it, with these filters chosen. */
function RunsList({
  projectId,
  choices = {},
}: {
  projectId: string
  choices?: Readonly<Record<string, string>>
}) {
  return (
    <OnFixtures>
      <Picked choices={choices}>
        <div className="h-[520px] w-[320px] overflow-hidden rounded-lg border border-(--border-subtle)">
          <ProcessRunsView projectId={projectId} onSelectRun={noop} onOpenSettings={noop} narrow />
        </div>
      </Picked>
    </OnFixtures>
  )
}

export const PROCESS_RUNS_SCENES: Scene[] = [
  {
    id: 'process-runs-filters',
    title: 'Process runs filters',
    component: 'ProcessRunsView',
    group: 'Process',
    description:
      'The Processes list filters a project’s runs by story, status and ending, and can widen to every project or to a group. Rows name their project once the list is wider than one. Each state opens from a different project, because the filters are kept per project for the session.',
    states: [
      {
        id: 'filters',
        title: 'Filters',
        description: 'Which projects, which story, which status and which ending, above the list.',
        render: () => <RunsList projectId="thefactory-tools" />,
      },
      {
        id: 'all-projects',
        title: 'All projects',
        description: 'Widened from a project with no runs of its own: rows name their project.',
        render: () => <RunsList projectId="wargames" choices={ALL_CHOICES} />,
      },
      {
        id: 'group',
        title: 'A group',
        description: 'Widened to the group the project belongs to.',
        render: () => <RunsList projectId="thefactory-backend" choices={GROUP_CHOICES} />,
      },
      {
        id: 'story',
        title: 'One story',
        description: 'Narrowed to the runs of one story.',
        render: () => <RunsList projectId="thefactory-ui" choices={STORY_CHOICES} />,
      },
      {
        id: 'not-merged',
        title: 'Not merged',
        description:
          'Across every project, the work that was never brought in. It sits in History.',
        render: () => (
          <RunsList projectId="thefactory-overseer-mobile" choices={UNMERGED_CHOICES} />
        ),
      },
      {
        id: 'no-match',
        title: 'Nothing matches',
        description: 'Narrowed to nothing: the list says the filters did it.',
        render: () => <RunsList projectId="thefactory-overseer-web" choices={NO_MATCH_CHOICES} />,
      },
    ],
  },
]

const ALL_CHOICES = { [SCOPE]: 'all' }
const GROUP_CHOICES = { [SCOPE]: 'group:overseer' }
const STORY_CHOICES = { [STORY]: '2d20d84b-5ec6-4054-bbb5-1eedf9e41861' }
const UNMERGED_CHOICES = { [SCOPE]: 'all', [ENDING]: 'unmerged' }
const NO_MATCH_CHOICES = { [STATUS]: 'pending' }
