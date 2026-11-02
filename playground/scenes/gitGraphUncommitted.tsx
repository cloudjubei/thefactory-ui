import type { GitLogCommitLike } from 'thefactory-ui/headless'
// Not on the package's public surface as a scene needs it: the showcase reaches into the source,
// as the playground renders the library from source.
import { GitCommitGraph } from '../../src/web/compound/git/commitGraph/GitCommitGraph'
import type { Scene } from '../showcase/types'

const noop = () => {}
const DAY = 86_400_000
const AT = Date.UTC(2026, 10, 2, 10, 0)

const commit = (
  hash: string,
  parents: string[],
  subject: string,
  ago: number,
  refs: GitLogCommitLike['refs'] = [],
): GitLogCommitLike => ({
  hash,
  parents,
  subject,
  authorName: 'cloudjubei-ai',
  authorEmail: 'cloudjubei+ai@gmail.com',
  authorDate: AT - ago,
  refs,
})

/**
 * thefactory-backend on 2 Nov: `dev` is checked out at 403c4cf, and a run's
 * branch has a newer commit than it — the one the log lists first.
 */
const LOG: GitLogCommitLike[] = [
  commit('b8156ed2', ['75af2a10'], 'Code review follow-ups: swagger/swagger.json', DAY / 24, [
    { type: 'branch', name: 'factory/cli-run-store-and-capture-at-scale-214983c8' },
  ]),
  commit('403c4cf1', ['c000fe62'], 'step', DAY / 12, [
    { type: 'HEAD', name: 'HEAD' },
    { type: 'branch', name: 'dev' },
    { type: 'branch', name: 'main' },
  ]),
  commit('75af2a10', ['e9a24f99'], 'Bound unfiltered listRuns — developer, attempt 4', DAY),
  commit('c000fe62', ['cdab13db'], 'step', DAY),
  commit('e9a24f99', ['cdab13db'], 'Bound unfiltered listRuns — developer, attempt 3', DAY),
  commit('cdab13db', [], 'step', DAY * 2),
]

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
