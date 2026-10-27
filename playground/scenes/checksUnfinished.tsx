import type { ReactNode } from 'react'
import { MessageRow, type ChatMessageLike } from 'thefactory-ui/web'
import {
  aggregateTestCounts,
  approveActionDescriptors,
  checkMethodRows,
  earnedApproveActions,
  handoffRequest,
  reviewCheckGroups,
  reviewTabOrder,
  reviewTabs,
  signoffVerdict,
  type CheckActionHost,
} from 'thefactory-ui/headless'
// Not on the package's public surface: the review draws them itself. The showcase reaches into the
// source for them, as the playground renders the library from source anyway.
import { RunVerdictLine } from '../../src/web/compound/chat/RunVerdictLine'
import {
  CheckChipRow,
  ChecksTab,
  DecisionBar,
  ReviewTabBar,
} from '../../src/web/compound/chat/signoff'
import type { RunVerification, VerificationCheckResult } from '../../src/headless/api/generated'
import type { Scene } from '../showcase/types'

const noop = () => {}
const BRANCH = 'agent/5e65f9b0ef0f'
const NOW = Date.UTC(2026, 9, 18, 14, 0)

// ---------------------------------------------------------------------------------------------
// Fixed data: a unit-test run with one file stopped at its time limit, beside three that failed

const TAIL = [
  ' ✓ builds the prompt from the history (3 ms)',
  ' ✓ keeps the system message first (1 ms)',
  ' ⠙ streams a tool call that never closes',
  '   waiting on the stream…',
].join('\n')

const UNIT_TESTS: VerificationCheckResult = {
  id: 'tests',
  label: 'Unit tests',
  kind: 'tests',
  category: 'test',
  status: 'error',
  durationMs: 31_400,
  command: 'npx vitest run src/completion src/mcp',
  summary: "1 file didn't finish (stopped after 30 s) — 132/132 passed in the other 2",
  testCount: { total: 132, passed: 132, failed: 0, skipped: 0 },
  unfinishedFiles: [
    {
      path: 'src/completion/CompletionTools.test.ts',
      reason: 'stopped after 30 s',
      timedOutAfterMs: 30_000,
      outputTail: TAIL,
    },
  ],
}

const FAILED_CHECKS: VerificationCheckResult[] = [
  {
    id: 'typecheck',
    label: 'Type check',
    kind: 'compile',
    category: 'typecheck',
    status: 'failed',
    durationMs: 8_000,
    summary: '1 type error',
  },
  {
    id: 'lint',
    label: 'Lint',
    kind: 'command',
    category: 'lint',
    status: 'failed',
    durationMs: 6_000,
    summary: 'Lint: 2 errors',
  },
  {
    id: 'format',
    label: 'Formatting',
    kind: 'command',
    category: 'format',
    status: 'failed',
    durationMs: 2_000,
    summary: '6 files unformatted',
  },
]

const verificationOf = (tests: VerificationCheckResult): RunVerification => ({
  status: 'failed',
  startedAt: NOW - 50_000,
  finishedAt: NOW - 3_000,
  checks: [tests, ...FAILED_CHECKS],
})

/** An older record of the same run: it kept no file, only that the check did not finish. */
const OLD_UNIT_TESTS: VerificationCheckResult = {
  ...UNIT_TESTS,
  summary: '132/132 passed',
  unfinishedFiles: undefined,
}

const ACTIONS: CheckActionHost = { canRequest: true, onRun: noop, onRequest: noop }

// ---------------------------------------------------------------------------------------------
// The review, as `CliRunArtifactPanel` lays it out on its Tests tab

function reviewOf(tests: VerificationCheckResult) {
  const verification = verificationOf(tests)
  const rows = checkMethodRows({ verification, approaches: [], evidence: [] })
  const headline = signoffVerdict({ rows, verified: true })
  const groups = reviewCheckGroups(verification)
  const tabs = reviewTabs({
    screens: 0,
    walkthroughs: 0,
    reports: 0,
    testCount: aggregateTestCounts(groups.tests)?.total ?? 0,
    testChecks: groups.tests.length,
    buildChecks: groups.build.length,
    changedFiles: 10,
  })
  const testsRow = rows.find((r) => r.id === 'tests')!
  const earned = earnedApproveActions(
    approveActionDescriptors({
      branch: BRANCH,
      baseBranch: 'the working branch',
      hasRemote: true,
      fileCount: 10,
    }),
    headline.key,
  )
  return { rows, headline, groups, tabs, testsRow, earned }
}

function ReviewBody({ tests }: { tests: VerificationCheckResult }) {
  const { rows, headline, groups, tabs, testsRow } = reviewOf(tests)
  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <RunVerdictLine headline={headline} />
      <div className="relative flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
          What was checked
        </span>
        <CheckChipRow
          tabOrder={reviewTabOrder()}
          rows={rows}
          branch={BRANCH}
          busyId={undefined}
          onOpenProof={noop}
          actions={ACTIONS}
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <ReviewTabBar tabs={tabs} active="tests" onChange={noop} />
        <ChecksTab
          methods={[testsRow]}
          checks={groups.tests}
          branch={BRANCH}
          busyId={undefined}
          actions={ACTIONS}
        />
      </div>
    </div>
  )
}

function Foot({ tests }: { tests: VerificationCheckResult }) {
  const { earned } = reviewOf(tests)
  return (
    <div className="flex shrink-0 items-center justify-end border-t border-(--border-subtle) bg-(--surface-base) px-3 py-2">
      <DecisionBar
        earned={earned}
        approveDisabledReason={undefined}
        busy={false}
        isMerged={false}
        requestingChanges={false}
        rejecting={false}
        onApprove={noop}
        onRequestChanges={noop}
        onReject={noop}
      />
    </div>
  )
}

function Review({ tests = UNIT_TESTS }: { tests?: VerificationCheckResult }) {
  return (
    <div className="max-w-3xl rounded-md border border-(--border-default) bg-(--surface-raised)">
      <ReviewBody tests={tests} />
      <Foot tests={tests} />
    </div>
  )
}

/** What "Ask the agent to fix this" sends, as the chat shows it once sent. */
function HandOff() {
  const { testsRow } = reviewOf(UNIT_TESTS)
  const msg: ChatMessageLike = {
    id: 'handoff',
    role: 'user',
    content: handoffRequest(testsRow, 'fix', { branch: BRANCH }).message,
  }
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <Review />
      <span className="text-[11.5px] text-(--text-secondary)">What it sends to the agent</span>
      <MessageRow
        msg={msg}
        globalIndex={0}
        totalMessages={1}
        isThinking={false}
        isLast
        prevUserMessagesLen={1}
        enhancedTotalLength={1}
      />
    </div>
  )
}

/** The review pushed as a phone's screen: it scrolls, its decision pinned at the bottom. */
function PhoneReview({ children }: { children?: ReactNode }) {
  return (
    <div className="mx-auto flex h-[680px] w-[390px] max-w-full flex-col overflow-hidden rounded-[34px] border border-(--border-default) bg-(--surface-base)">
      <div className="h-9 shrink-0 px-6 pt-2 text-[13px] font-semibold">9:41</div>
      <div className="flex shrink-0 items-center gap-1.5 border-b border-(--border-subtle) px-2 py-2">
        <span className="px-1 text-[15px] text-(--accent-primary)">‹ Chat</span>
        <span className="truncate text-[15px] font-semibold text-(--text-primary)">
          Changes · 10 files
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ReviewBody tests={UNIT_TESTS} />
        {children}
      </div>
      <div className="pb-6">
        <Foot tests={UNIT_TESTS} />
      </div>
    </div>
  )
}

export const CHECKS_UNFINISHED_SCENES: Scene[] = [
  {
    id: 'review-checks-unfinished',
    title: 'Review — a test file didn’t finish',
    component: 'CliRunArtifactPanel (RunVerdictLine, CheckChipRow, ChecksTab)',
    group: 'Chat',
    description:
      'A unit-test file stopped at its time limit is not a failure: its chip says “didn’t finish” in amber, the headline counts it apart from what failed, the Tests tab names the file, why and the last it printed, and the hand-off asks the agent to find why it stops.',
    states: [
      {
        id: 'tests-tab',
        title: 'Tests tab',
        description:
          '“3 checks failed, 1 didn’t finish”: amber banner, the stopped file with its last output, and the files that passed.',
        render: () => <Review />,
      },
      {
        id: 'hand-off',
        title: 'Hand-off sent',
        description:
          'What “Ask the agent to fix this” sends: the file, how the others went, its last output — the end of it, not the start.',
        render: () => <HandOff />,
      },
      {
        id: 'older-record',
        title: 'Older record',
        description:
          'A run recorded before files were named still reads “didn’t finish”, with its summary.',
        render: () => <Review tests={OLD_UNIT_TESTS} />,
      },
      {
        id: 'phone',
        title: 'On a phone',
        description:
          'The review as a screen of its own, on a short phone: the review scrolls under the decision, which stays pinned at the bottom.',
        render: () => <PhoneReview />,
      },
    ],
  },
]
