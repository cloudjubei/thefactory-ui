// Not on the package's public surface as a scene needs it: the showcase reaches into the source,
// as the playground renders the library from source.
import { GitCommitGraph } from '../../src/web/compound/git/commitGraph/GitCommitGraph'
import { LOG } from '../../src/fakeBackend/fixtures/git'
import type { Scene } from '../showcase/types'

const noop = () => {}
export const GIT_GRAPH_UNCOMMITTED_SCENES: Scene[] = [
  {
    id: 'git-graph-uncommitted',
    title: 'Uncommitted changes in the commit graph',
    component: 'GitCommitGraph',
    group: 'Project',
    description:
      'The working tree’s changes lead the timeline as a hollow node whose line runs down to the checked-out commit — the one carrying HEAD — as SourceTree draws it, never onto whichever commit is newest. A newer commit on another branch takes a lane of its own.',
    states: [
      {
        id: 'behind-a-newer-branch',
        title: 'dev checked out, a run’s branch newer',
        render: () => (
          <div className="h-[340px] max-w-[980px] p-4">
            <GitCommitGraph
              commits={LOG}
              uncommittedChanges
              selectedCommitSha="UNCOMMITTED"
              onSelectCommit={noop}
            />
          </div>
        ),
      },
    ],
  },
]
