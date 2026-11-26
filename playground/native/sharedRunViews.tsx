import ProcessRunsView from '../../src/native/screens/ProcessRunsView'
import { OnFixtures } from '../scenes/onFixtures'
import { SHARED_RUN_LISTED_PROJECT_ID } from '../scenes/sharedRunFixtures'
import type { NativeView } from './views'

const noop = () => {}

/** A project's runs list holding a run filed under another project. Native peer of the `project-runs` scene. */
export const SHARED_RUN_VIEWS: readonly NativeView[] = [
  {
    id: 'project-runs',
    title: 'Project runs list: a run from another project',
    render: () => (
      <OnFixtures>
        <ProcessRunsView
          projectId={SHARED_RUN_LISTED_PROJECT_ID}
          onSelectRun={noop}
          onOpenSettings={noop}
        />
      </OnFixtures>
    ),
  },
]
