import type {
  GetGitBundleResponse,
  GitLogCommit,
  GitUnifiedBranch,
} from '../../headless/api/generated/types.gen'

type GitBundleStatus = NonNullable<GetGitBundleResponse['status']['status']>

const DAY = 86_400_000
const AT = Date.UTC(2026, 10, 2, 10, 0)

const commit = (
  hash: string,
  parents: string[],
  subject: string,
  ago: number,
  refs: GitLogCommit['refs'] = [],
): GitLogCommit => ({
  hash,
  parents,
  subject,
  authorName: 'cloudjubei-ai',
  authorEmail: 'ai@example.invalid',
  authorDate: AT - ago,
  refs,
})

/**
 * thefactory-backend on 2 Nov: `dev` is checked out at 403c4cf, and a run's
 * branch has a newer commit than it — the one the log lists first.
 */
export const LOG: GitLogCommit[] = [
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

export const STATUS: GitBundleStatus = {
  staged: [
    'src/agent/AgentTools.test.ts',
    'src/agent/AgentTools.ts',
    'src/workflow/ProcessGroupDriver.test.ts',
    'src/workflow/ProcessGroupDriver.ts',
  ],
  unstaged: [],
  untracked: [],
}

const BRANCHES: GitUnifiedBranch[] = [
  { name: 'dev', isLocal: true, isRemote: true, current: true, isDefault: true },
  { name: 'factory/cli-run-store-and-capture-at-scale-214983c8', isLocal: true, isRemote: false },
]

const DONE = { ok: true as const, result: { code: 0, stdout: '', stderr: '' } }

/** A project's git as one read of the bundle: the log only when a screen asks for it. */
export function fakeGitBundle(maxCount: number): GetGitBundleResponse {
  return {
    status: { ...DONE, status: STATUS },
    branches: { ...DONE, branches: BRANCHES },
    log: { commits: LOG.slice(0, maxCount) },
    stashes: { ...DONE, stashes: [] },
  }
}
