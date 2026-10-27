import { useState, type ReactNode } from 'react'
import {
  ChatChangesBar,
  ChatChangesMarker,
  ChatReviewPanel,
  MessageRow,
  type ChatMessageLike,
} from 'thefactory-ui/web'
import {
  chatChangesBarView,
  chatChangesMarkerView,
  chatReviewHeader,
  chatReviewLayout,
  checkMethodRows,
  signoffVerdict,
  type ChatChangesMarkerInput,
  type ChatChangesVerdictInput,
  type PendingToolGrant,
} from 'thefactory-ui/headless'
// Not on the package's public surface: the chat renders it itself. The showcase reaches into the
// source for it, as the playground renders the library from source anyway.
import ApprovalStack from '../../src/web/compound/chat/ApprovalStack'
import { useElementSize } from '../../src/web/compound/chat/signoff/useElementSize'
import type { ChangeFile } from '../../src/web/compound/chat/signoff'
import type { ChatOpenChanges, RunVerification } from '../../src/headless/api/generated'
import type { Scene } from '../showcase/types'
import { BRANCH, ChangeCard, NOW } from './chatChanges'

const noop = () => {}
const HOUR = 60 * 60 * 1000
const RUN = 'chat-turn-2'

// ---------------------------------------------------------------------------------------------
// Fixed data: a turn that changed ten files, whose checks did not all pass

const PATHS = [
  'src/mcp/McpServer.ts',
  'src/mcp/McpServer.test.ts',
  'src/completion/toolLoop.ts',
  'src/completion/toolLoop.test.ts',
  'src/completion/CompletionTools.ts',
  'src/completion/CompletionTools.test.ts',
  'src/completion/refusalLoop.ts',
  'src/completion/refusalLoop.test.ts',
  'src/completion/completionConstants.ts',
  'docs/TOOL_LOOPS.md',
]

const FILES: ChangeFile[] = PATHS.map((path, i) => ({
  path,
  status: i === 6 || i === 7 ? 'A' : 'M',
  patch: ['@@ -1,3 +1,4 @@', ' import { loop } from "./loop"', `+// guard ${i + 1}`, ' '].join(
    '\n',
  ),
}))

const VERIFICATION: RunVerification = {
  status: 'failed',
  startedAt: NOW - 50_000,
  finishedAt: NOW - 3_000,
  checks: [
    {
      id: 'tests',
      label: 'Unit tests',
      kind: 'tests',
      category: 'test',
      status: 'error',
      durationMs: 31_000,
      summary: '1 file didn’t finish (stopped after 30 s) — 132/132 passed in the other 2',
    },
    {
      id: 'typecheck',
      label: 'Type check',
      kind: 'compile',
      category: 'typecheck',
      status: 'failed',
      durationMs: 8_000,
      summary: '1 error — McpServer.test.ts:1778',
    },
    {
      id: 'lint',
      label: 'Lint',
      kind: 'command',
      category: 'lint',
      status: 'failed',
      durationMs: 6_000,
      summary: '2 errors — McpServer.ts',
    },
    {
      id: 'format',
      label: 'Formatting',
      kind: 'command',
      category: 'format',
      status: 'failed',
      durationMs: 2_000,
      summary: '6 files',
    },
  ],
}

/** The verdict the bar shows, read the way `useRunSignoffVerdict` reads it. */
function verdictOf(verification: RunVerification | undefined): ChatChangesVerdictInput {
  const rows = checkMethodRows({ verification, approaches: [], evidence: [] })
  const headline = signoffVerdict({ rows, verified: verification !== undefined })
  return {
    key: headline.key,
    failed: rows.filter((r) => r.state === 'failed' || r.state === 'unfinished').length,
  }
}

const OPEN: ChatOpenChanges = {
  runId: RUN,
  projectId: 'thefactory-tools',
  review: { branch: BRANCH, baseSha: 'c1854b26', headSha: 'abe79891', landedAt: NOW },
  openSince: NOW - HOUR / 3,
  files: PATHS.map((path) => ({ path, status: 'modified' as const })),
  changed: [],
  heldRunIds: [],
}

const UNFIT: ChatOpenChanges = {
  ...OPEN,
  changed: PATHS.slice(0, 5).map((path) => ({ path, reason: 'changed in the checkout' })),
}

const WAITED: ChatOpenChanges = { ...UNFIT, openSince: NOW - 47 * HOUR - HOUR / 4 }

const MARKER_BASE: ChatChangesMarkerInput = {
  runId: RUN,
  artifact: { payload: { files: PATHS } },
  review: { branch: BRANCH },
  openRunId: RUN,
  canOpen: true,
}

function Marker(over: Partial<ChatChangesMarkerInput>) {
  const view = chatChangesMarkerView({ ...MARKER_BASE, ...over })
  return view ? <ChatChangesMarker view={view} onOpen={noop} /> : null
}

type BarSetup = {
  open?: ChatOpenChanges
  verification?: RunVerification
  checked?: boolean
}

function Bar({
  open = OPEN,
  checked = true,
  compact = false,
  narrow = false,
  ...rest
}: BarSetup & { compact?: boolean; narrow?: boolean }) {
  const verification = 'verification' in rest ? rest.verification : VERIFICATION
  const view = chatChangesBarView(
    { openChanges: open, ...(checked ? { verdict: verdictOf(verification) } : {}) },
    NOW,
  )
  return view ? (
    <ChatChangesBar
      view={view}
      compact={compact}
      narrow={narrow}
      onReview={noop}
      onDiscard={noop}
    />
  ) : null
}

// ---------------------------------------------------------------------------------------------
// The chat around them, laid out as `ChatBody` lays it out

const AI_1: ChatMessageLike = {
  id: 'a1',
  role: 'assistant',
  content:
    'The loop detector is in, with the guard in the MCP server and the API tool loop. Running the checks on the review branch.',
}
const AI_2: ChatMessageLike = {
  id: 'a2',
  role: 'assistant',
  content:
    'Three checks need small fixes in my code — a type error in a test, two lint errors and formatting. The unit tests didn’t finish: one file was stopped after 30 s.',
}
const USER: ChatMessageLike = {
  id: 'u1',
  role: 'user',
  content: 'Fix those, and find out why that test file hangs.',
}
const AI_3: ChatMessageLike = {
  id: 'a3',
  role: 'assistant',
  content: 'On it — starting with the test file that didn’t finish.',
}

function Row({ msg, i }: { msg: ChatMessageLike; i: number }) {
  return (
    <MessageRow
      msg={msg}
      globalIndex={i}
      totalMessages={4}
      isThinking={false}
      isLast={i === 3}
      prevUserMessagesLen={4}
      enhancedTotalLength={4}
    />
  )
}

/** The message box, as it sits under the conversation. */
function Composer() {
  return (
    <div className="shrink-0 border-t border-(--border-subtle) bg-(--surface-raised) p-2">
      <div className="flex items-center justify-between rounded-md border border-(--border-default) bg-(--surface-base) px-3 py-2.5 text-[13px] text-(--text-muted)">
        <span>Type your message…</span>
        <span className="text-[11px]">⌘ + Enter to send</span>
      </div>
    </div>
  )
}

const APPROVAL: PendingToolGrant = {
  id: 'grant-run-shell',
  chatRunner: 'cli',
  label: 'runShellCommand',
  toolName: 'runShellCommand',
  args: { reason: 'Run the hanging test file on its own.' },
  alwaysAllowScopes: ['chat'],
  grantCovers: 'tool',
  detail: 'npx vitest run src/completion/CompletionTools.test.ts',
  decide: () => new Promise<void>(noop),
}

type ChatSetup = BarSetup & {
  /** Open the review: beside the chat, or over it when the chat is narrow, as `ChatBody` picks. */
  review?: boolean
  /** An approval holds the message box; the bar waits above it, one line. */
  underApproval?: boolean
  /** The chat's whole width, in px, at most the screen's. */
  width?: number
  height?: number
  phone?: boolean
}

function Chat({
  review,
  underApproval = false,
  width,
  height = 640,
  phone = false,
  ...bar
}: ChatSetup) {
  const reviewHeader = chatReviewHeader({ fileCount: FILES.length, review: { branch: BRANCH } })
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null)
  const chatWidth = useElementSize(rootEl)?.w ?? width
  const reviewLayout = chatReviewLayout(chatWidth)
  return (
    <div
      ref={setRootEl}
      className={`relative flex overflow-hidden border border-(--border-default) bg-(--surface-base) ${
        phone ? 'rounded-[34px]' : 'rounded-xl'
      }`}
      style={{ height, ...(width ? { width, maxWidth: '100%' } : {}) }}
    >
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {phone ? (
          <div className="h-9 shrink-0 px-6 pt-2 text-[13px] font-semibold">9:41</div>
        ) : null}
        <div className="flex shrink-0 items-center gap-2 border-b border-(--border-subtle) px-4 py-2.5">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-semibold text-(--text-primary)">
              Stop deterministic tool-refusal loops
            </span>
            <span className="text-[12px] text-(--text-secondary)">TheFactory Tools</span>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden px-4 py-4">
          <div>
            <Row msg={AI_1} i={0} />
            <Marker />
          </div>
          <Row msg={AI_2} i={1} />
          <Row msg={USER} i={2} />
          <Row msg={AI_3} i={3} />
        </div>
        <Bar {...bar} compact={underApproval} narrow={reviewLayout === 'sheet'} />
        {underApproval ? <ApprovalStack grants={[APPROVAL]} onDecideLater={noop} /> : <Composer />}
      </div>
      {review ? (
        <ChatReviewPanel
          layout={reviewLayout}
          header={reviewHeader}
          {...(chatWidth !== undefined ? { chatWidth } : {})}
          onClose={noop}
        >
          <ChangeCard
            framed={false}
            files={FILES}
            verification={VERIFICATION}
            openChanges={bar.open ?? OPEN}
          />
        </ChatReviewPanel>
      ) : null}
    </div>
  )
}

function Phone({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-[390px] max-w-full">{children}</div>
}

export const CHAT_CHANGES_DOCK_SCENES: Scene[] = [
  {
    id: 'chat-changes-marker',
    title: 'Changes marker',
    component: 'ChatChangesMarker',
    group: 'Chat',
    description:
      'The one dashed line a chat turn leaves where it changed files: how many, the branch they wait on, and the link to their review. The decision is never here — it waits in the bar above the message box.',
    states: [
      {
        id: 'open-review',
        title: 'Held by the bar',
        description: 'The chat’s open changes: “Review below” points at the bar that holds them.',
        render: () => <Marker />,
      },
      {
        id: 'other-run',
        title: 'Its own review',
        description:
          'An earlier turn’s changes, kept apart from the open ones until those are decided.',
        render: () => (
          <Marker
            runId="chat-turn-1"
            artifact={{ payload: { files: PATHS.slice(0, 3) }, heldBehindReview: RUN }}
          />
        ),
      },
      {
        id: 'decided',
        title: 'Decided',
        description: 'Merged changes say so and open as a record.',
        render: () => <Marker runId="chat-turn-1" review={{ branch: BRANCH, mergedAt: NOW }} />,
      },
      {
        id: 'superseded',
        title: 'Captured again',
        description: 'A later turn captured these changes with its own: the one-line notice stays.',
        render: () => (
          <Marker
            runId="chat-turn-1"
            artifact={{
              payload: { files: PATHS.slice(0, 3) },
              supersededBy: { runId: RUN, at: NOW } as never,
            }}
          />
        ),
      },
    ],
  },
  {
    id: 'chat-changes-bar',
    title: 'Changes bar',
    component: 'ChatChangesBar',
    group: 'Chat',
    description:
      'The decision on the chat’s open changes, docked above the message box while they wait: the checks’ verdict, whether they still fit the checkout, how long they have waited, Discard and Review.',
    states: [
      {
        id: 'fresh',
        title: 'Fresh',
        description: 'Just made; the checks have not run yet.',
        render: () => <Bar verification={undefined} />,
      },
      {
        id: 'failing-checks',
        title: 'Checks didn’t pass',
        render: () => <Bar />,
      },
      {
        id: 'no-longer-fits',
        title: 'No longer fits',
        description: 'The checkout changed five of the files since.',
        render: () => <Bar open={UNFIT} />,
      },
      {
        id: 'waiting-47h',
        title: 'Waiting 47 h',
        render: () => <Bar open={WAITED} />,
      },
      {
        id: 'phone-row',
        title: 'On a phone',
        description:
          'One row: what waits and what the checks said on the left, Review on the right. The whole row opens the review, where Discard lives.',
        render: () => (
          <Phone>
            <Bar open={WAITED} narrow />
          </Phone>
        ),
      },
      {
        id: 'under-approval',
        title: 'Under an approval',
        description:
          'An approval holds the message box: the bar stays, one line, so it never squeezes what the agent waits on.',
        render: () => (
          <div className="flex max-w-2xl flex-col rounded-xl border border-(--border-subtle) bg-(--surface-base)">
            <Bar compact />
            <ApprovalStack grants={[APPROVAL]} onDecideLater={noop} />
          </div>
        ),
      },
    ],
  },
  {
    id: 'chat-changes-review',
    title: 'Chat with changes',
    component: 'ChatBody (ChatChangesMarker, ChatChangesBar, ChatReviewPanel)',
    group: 'Chat',
    wide: true,
    description:
      'A chat whose agent changed files: the marker where it happened, the bar above the message box, and the review opened beside a wide chat, over a narrow one, and on a phone.',
    states: [
      {
        id: 'docked',
        title: 'Docked',
        render: () => <Chat open={WAITED} />,
      },
      {
        id: 'under-approval',
        title: 'Under an approval',
        render: () => <Chat open={WAITED} underApproval />,
      },
      {
        id: 'side-panel',
        title: 'Review beside the chat',
        description: 'Dragged wider or narrower at its edge; the chat keeps its own room.',
        render: () => <Chat open={WAITED} review width={1100} height={760} />,
      },
      {
        id: 'narrow-sheet',
        title: 'Review over a narrow chat',
        description: 'Below 768 px the review covers the chat, with “‹ Chat” back.',
        render: () => <Chat open={WAITED} review width={600} height={760} />,
      },
      {
        id: 'phone',
        title: 'On a phone',
        description: 'One row above the message box; Review pushes the review as its own screen.',
        render: () => (
          <Phone>
            <Chat open={WAITED} width={390} height={844} phone />
          </Phone>
        ),
      },
      {
        id: 'phone-review',
        title: 'On a phone — the review',
        render: () => (
          <Phone>
            <Chat open={WAITED} review width={390} height={844} phone />
          </Phone>
        ),
      },
    ],
  },
]
