import { useState, type ReactNode } from 'react'
import type {
  MergeChecks,
  ProcessLedgerEntry,
  VerificationCheckResult,
  VerificationSiblingFallback,
} from 'thefactory-tools/types'
import { siblingFallbackNoticeState } from 'thefactory-ui/headless'
// Not on the package's public surface: the pipeline draws a checks step's list and the merge
// sheet its result itself. The showcase reaches into the source for them.
import MergeChecksResult from '../../src/web/compound/git/MergeChecksResult'
import ProcessCheckList from '../../src/web/compound/process/ProcessCheckList'
import SiblingFallbackNotice from '../../src/web/compound/process/SiblingFallbackNotice'
import ProjectStableBranchField from '../../src/web/compound/projects/ProjectStableBranchField'
import type { Scene } from '../showcase/types'

const NOW = 1_760_000_000_000
const CHECK_STEP = { kind: 'check' as const }
const HEAD = '91e4ba5c2d7f8e1a6b3c4d5e6f708192a3b4c5d6'
const DB_LIVE = 'd4e3c6c18f2a9b7e5d4c3b2a1908f7e6d5c4b3a2'
const DB_STABLE = '3161c83a5b6c7d8e9f0a1b2c3d4e5f60718293a4'
const DB_PATH = '/Users/me/Work/shared-db'

function frame(children: ReactNode, width = 'w-[440px]'): ReactNode {
  return (
    <div
      className={`${width} max-w-full rounded-md border border-(--border-subtle) bg-(--surface-base) p-3`}
    >
      {children}
    </div>
  )
}

const LIVE_REVISION = {
  label: 'shared-db (file:../shared-db)',
  path: DB_PATH,
  sha: DB_LIVE,
  branch: 'dev',
  dirty: true,
  dirtyHash: 'e1c0ffee',
}

const STABLE_REVISION = {
  label: 'shared-db (file:../shared-db)',
  path: DB_PATH,
  sha: DB_STABLE,
  branch: 'main',
  dirty: false,
  snapshot: true,
}

function result(over: Partial<VerificationCheckResult>): VerificationCheckResult {
  return {
    id: 'build',
    label: 'Build',
    kind: 'command',
    category: 'build',
    status: 'passed',
    durationMs: 41_000,
    summary: 'Command succeeded',
    ranIn: 'host',
    hostReason: 'This project depends on code outside its checkout, which the sandbox cannot see.',
    ...over,
  }
}

const tests = (over: Partial<VerificationCheckResult> = {}) =>
  result({
    id: 'test',
    label: 'Unit tests',
    category: 'test',
    durationMs: 190_000,
    summary: '15754/15754 passed',
    testCount: { total: 15754, passed: 15754, failed: 0, skipped: 0 },
    ...over,
  })

const AT_STABLE = [
  result({ dependencyRevisions: [STABLE_REVISION] }),
  tests({ dependencyRevisions: [STABLE_REVISION] }),
]

const AGAINST_PENDING = [
  result({
    status: 'failed',
    summary: 'Exited 2',
    details:
      'Failing lines:\nsrc/db/search.ts(88,14): error TS2339: Property ‘externalKey’ does not exist.',
    dependencyRevisions: [LIVE_REVISION],
  }),
  tests({
    status: 'skipped',
    summary: 'Not run — the build failed, so the tests could not compile.',
    testCount: undefined,
    dependencyRevisions: [LIVE_REVISION],
  }),
]

const SIBLING = {
  name: 'shared-db',
  label: 'shared-db (file:../shared-db)',
  path: DB_PATH,
  liveBranch: 'dev',
  liveSha: DB_LIVE,
  dirty: true,
  dirtyHash: 'e1c0ffee',
  stableBranch: 'main',
  stableSha: DB_STABLE,
}

const STABLE_PASSED: VerificationSiblingFallback = {
  outcome: 'stable-passed',
  siblings: [SIBLING],
  liveStatus: 'failed',
  liveFailures: [
    'Build: src/db/search.ts(88,14): error TS2339: Property ‘externalKey’ does not exist.',
  ],
  liveChecks: AGAINST_PENDING,
  stableStatus: 'passed',
  message:
    'Passed against shared-db@3161c83; your pending changes in shared-db break it: Build: src/db/search.ts(88,14): error TS2339: Property ‘externalKey’ does not exist.',
}

const AT_STABLE_FAILED = [
  result({
    status: 'failed',
    summary: 'Exited 2',
    details: 'Failing lines:\nsrc/app/feed.ts(12,3): error TS2304: Cannot find name ‘feedRow’.',
    dependencyRevisions: [STABLE_REVISION],
  }),
]

const STABLE_FAILED: VerificationSiblingFallback = {
  outcome: 'stable-failed',
  siblings: [SIBLING],
  liveStatus: 'failed',
  liveFailures: ['Build: src/app/feed.ts(12,3): error TS2304: Cannot find name ‘feedRow’.'],
  stableStatus: 'failed',
  stableFailures: ['Build: src/app/feed.ts(12,3): error TS2304: Cannot find name ‘feedRow’.'],
  stableChecks: AT_STABLE_FAILED,
  message:
    'Also fails against shared-db@3161c83: Build: src/app/feed.ts(12,3): error TS2304: Cannot find name ‘feedRow’.',
}

const UNAVAILABLE: VerificationSiblingFallback = {
  outcome: 'unavailable',
  siblings: [],
  notReplaced: [
    {
      name: 'shared-db',
      label: 'shared-db (file:../shared-db)',
      path: DB_PATH,
      reason:
        'it has no main or dev branch and no remote default branch, and no stable branch is set for it',
    },
  ],
  liveStatus: 'failed',
  liveFailures: ['Build: Exited 2'],
  message:
    'Not checked against a stable shared-db: it has no main or dev branch and no remote default branch, and no stable branch is set for it',
}

function attempt(over: Partial<ProcessLedgerEntry>): ProcessLedgerEntry {
  return {
    id: 'checks-1',
    stepId: 'checks',
    iteration: 1,
    status: 'done',
    outcome: 'passed',
    startedAt: NOW,
    endedAt: NOW,
    ...over,
  }
}

const BASE_ATTEMPT = attempt({
  checks: [
    result({
      dependencyRevisions: [
        { ...LIVE_REVISION, dirty: false, dirtyHash: undefined, branch: 'main', sha: DB_STABLE },
      ],
    }),
    tests(),
  ],
})
const PASSED_ATTEMPT = attempt({ checks: AT_STABLE, siblingFallback: STABLE_PASSED })
const FAILED_ATTEMPT = attempt({
  outcome: 'failed',
  checks: AGAINST_PENDING,
  siblingFallback: STABLE_FAILED,
})
const UNAVAILABLE_ATTEMPT = attempt({
  outcome: 'failed',
  checks: AGAINST_PENDING,
  siblingFallback: UNAVAILABLE,
})

const PLAN = {
  steps: [
    { id: 'implement', kind: 'agent' as const },
    { id: 'checks', kind: 'check' as const },
  ],
}

/** The host's message as the middle of a sentence: its own closing full stop dropped. */
const clause = (message: string) => message.replace(/\.+$/, '')

function chatNotice(ledger: ProcessLedgerEntry[]): ReactNode {
  const notice = siblingFallbackNoticeState({ plan: PLAN, ledger }, 'checks-1')
  if (notice.state === 'unknown') return null
  return frame(
    <div className="flex flex-col gap-1.5">
      <p className="m-0 text-[13px] text-(--text-primary)">
        The checks: {clause(STABLE_PASSED.message)}. The run goes on; fix those pending changes
        before relying on this work with them.
      </p>
      <SiblingFallbackNotice
        view={notice.view}
        {...(notice.state === 'superseded' ? { superseded: notice.line } : {})}
      />
    </div>,
    'w-[520px]',
  )
}

const MERGE_BASE: MergeChecks = {
  status: 'passed',
  summary: 'The merged result 91e4ba5 builds and type-checks.',
  sha: HEAD,
  checks: [result({}), result({ id: 'typecheck', label: 'Type check', category: 'typecheck' })],
}

const MERGE_FLAGGED: MergeChecks = {
  ...MERGE_BASE,
  summary: `The merged result 91e4ba5 builds and type-checks. ${clause(STABLE_PASSED.message)}.`,
  siblingFallback: STABLE_PASSED,
}

function StableBranchField({ initial }: { initial: string | undefined }) {
  const [value, setValue] = useState(initial)
  return <ProjectStableBranchField value={value} onChange={setValue} />
}

export const SIBLING_STABLE_BRANCH_SCENES: Scene[] = [
  {
    id: 'checks-stable-branch',
    title: 'Checks against a sibling’s stable branch',
    component: 'ProcessCheckList',
    group: 'Process',
    description:
      'A checks step whose project builds against code outside its checkout: checks that failed with that code’s pending changes ran again at its stable branch.',
    states: [
      {
        id: 'base-host-checks',
        title: 'Passed, sibling clean on its stable branch',
        description: 'The look-alike base: the same checks with nothing to fall back from.',
        render: () => frame(<ProcessCheckList step={CHECK_STEP} latest={BASE_ATTEMPT} />),
      },
      {
        id: 'stable-passed',
        title: 'Passes only at the stable branch',
        description: 'Fails with the pending changes in shared-db; passes against shared-db@main.',
        render: () => frame(<ProcessCheckList step={CHECK_STEP} latest={PASSED_ATTEMPT} />),
      },
      {
        id: 'stable-failed',
        title: 'Fails at the stable branch too',
        render: () => frame(<ProcessCheckList step={CHECK_STEP} latest={FAILED_ATTEMPT} />),
      },
      {
        id: 'unavailable',
        title: 'Not checked at a stable branch',
        render: () => frame(<ProcessCheckList step={CHECK_STEP} latest={UNAVAILABLE_ATTEMPT} />),
      },
      {
        id: 'clean-copy-row',
        title: 'A check built against a clean copy',
        description: 'Under each row: “Built against shared-db main at 3161c83 (a clean copy)”.',
        render: () =>
          frame(<ProcessCheckList step={CHECK_STEP} latest={attempt({ checks: AT_STABLE })} />),
      },
    ],
  },
  {
    id: 'run-chat-stable-branch-notice',
    title: 'Run chat: checks passed only at the stable branch',
    component: 'RunSiblingFallbackNotice',
    group: 'Chat',
    description:
      'What the run’s chat is told, read live off the run: the notice while its checks attempt is the newest, history once a newer attempt ran.',
    states: [
      {
        id: 'live',
        title: 'Current',
        render: () => chatNotice([PASSED_ATTEMPT]),
      },
      {
        id: 'superseded',
        title: 'Checked again since',
        render: () =>
          chatNotice([
            PASSED_ATTEMPT,
            attempt({ id: 'checks-2', iteration: 2, checks: AT_STABLE }),
          ]),
      },
    ],
  },
  {
    id: 'merge-result-stable-branch',
    title: 'Merge result checked at a sibling’s stable branch',
    component: 'MergeChecksResult',
    group: 'Process',
    description: 'The checks on a merge’s result, run again at a sibling’s stable branch.',
    states: [
      {
        id: 'base-passed',
        title: 'Builds',
        description: 'The look-alike base.',
        render: () => frame(<MergeChecksResult checks={MERGE_BASE} />, 'w-[520px]'),
      },
      {
        id: 'stable-passed',
        title: 'Builds only at the stable branch',
        render: () => frame(<MergeChecksResult checks={MERGE_FLAGGED} />, 'w-[520px]'),
      },
    ],
  },
  {
    id: 'project-stable-branch-field',
    title: 'Project stable branch',
    component: 'ProjectStableBranchField',
    group: 'Process',
    description: 'The project setting other projects’ checks fall back to.',
    states: [
      {
        id: 'empty',
        title: 'Not set',
        render: () => frame(<StableBranchField initial={undefined} />),
      },
      { id: 'set', title: 'Set', render: () => frame(<StableBranchField initial="release/2.0" />) },
      {
        id: 'invalid',
        title: 'Not a branch name',
        render: () => frame(<StableBranchField initial="release..2" />),
      },
    ],
  },
]
