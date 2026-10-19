import type { ReactNode } from 'react'
import {
  ChatChangesBar,
  ChatChangesMarker,
  MessageRow,
  type ChatMessageLike,
} from 'thefactory-ui/web'
import {
  alreadyOnBaseView,
  chatChangesBarView,
  chatChangesMarkerView,
  checkMethodRows,
  commitReceiptView,
} from 'thefactory-ui/headless'
// Not on the package's public surface: the chat draws them itself, in place of a commit's tool row
// and of a turn's marker. The showcase reaches into the source for them, as the playground renders
// the library from source anyway.
import { AlreadyOnBaseLine } from '../../src/web/compound/chat/AlreadyOnBaseLine'
import { CommitReceipt } from '../../src/web/compound/chat/CommitReceipt'
import type {
  ChatOpenChanges,
  CliRunLandFailure,
  ReviewEvidenceRef,
} from '../../src/headless/api/generated'
import type { Scene } from '../showcase/types'

const noop = () => {}
const NOW = Date.UTC(2026, 9, 18, 16, 0)
const DRAFT = 'design/drafts/10-chip-slots-v5.html'
const SUBJECT = 'Draft 10: upright plaque, one gem wide'

// ---------------------------------------------------------------------------------------------
// Fixed data: the agent commits draft 10 to dev, with the screens the turn already captured

const COMMITTED = {
  operation: 'commit',
  ok: true,
  repoPath: '/Users/me/Work/wargames',
  branch: 'dev',
  sha: '0956f8c41d2e9a7b3c5d',
  previousSha: '7a1b2c3d',
  message: SUBJECT,
}

const RECEIPT = commitReceiptView('commitGitChanges', COMMITTED, 'success', [
  { path: DRAFT, status: 'modified' },
])!

const SHOTS: ReviewEvidenceRef[] = ['before', 'after'].map((side, i) => ({
  id: `shot-${side}`,
  kind: 'screenshot',
  path: `.factory/artifacts/review/chat-turn-7/${side}.png`,
  mediaType: 'image/png',
  bytes: 120_000 + i,
  createdAt: NOW - 60_000,
  runId: 'chat-turn-7',
  projectId: 'wargames',
}))

const PROOF = checkMethodRows({ verification: undefined, approaches: [], evidence: SHOTS }).filter(
  (row) => row.state === 'passed',
)

const ALREADY: CliRunLandFailure = {
  reason: 'already-on-base',
  baseRef: 'dev',
  landedBy: { sha: COMMITTED.sha, subject: SUBJECT },
  at: NOW,
}

function whenAlready(failure: CliRunLandFailure) {
  const view = alreadyOnBaseView(failure)
  return view ? { alreadyOnBase: view } : {}
}

function AlreadyMarker({ failure }: { failure: CliRunLandFailure }) {
  const view = chatChangesMarkerView({
    runId: 'chat-turn-8',
    artifact: { payload: { files: [DRAFT] } },
    changeFiles: [{ path: DRAFT, status: 'modified' }],
    ...whenAlready(failure),
    canOpen: true,
  })
  return view ? <ChatChangesMarker view={view} onOpen={noop} /> : null
}

// ---------------------------------------------------------------------------------------------
// The conversation around it, laid out as `ChatBody` lays it out

const ASK: ChatMessageLike = {
  id: 'u1',
  role: 'user',
  content: 'last issue — the one plaque is simply too long/big.',
}
const SAYS: ChatMessageLike = {
  id: 'a1',
  role: 'assistant',
  content:
    'The plaque now stands upright, 36–44 px wide, one gem wide. I’ll commit draft 10 to dev.',
}
const AGAIN: ChatMessageLike = {
  id: 'a2',
  role: 'assistant',
  content: 'Draft 10 is proposed again with the new captures.',
}
const REPLY: ChatMessageLike = {
  id: 'u2',
  role: 'user',
  content:
    'great the new solution is better (and we can actually offer a size choice to the user).',
}
const LEFT: ChatMessageLike = {
  id: 'a3',
  role: 'assistant',
  content: 'I added a size choice to the chip slots. That one isn’t committed yet.',
}

function Row({ msg, i, of }: { msg: ChatMessageLike; i: number; of: number }) {
  return (
    <MessageRow
      msg={msg}
      globalIndex={i}
      totalMessages={of}
      isThinking={false}
      isLast={i === of - 1}
      prevUserMessagesLen={of}
      enhancedTotalLength={of}
    />
  )
}

const OPEN: ChatOpenChanges = {
  runId: 'chat-turn-9',
  projectId: 'wargames',
  review: { branch: 'agent/2b7c91d0a4e3', baseSha: '0956f8c4', landedAt: NOW },
  openSince: NOW - 60_000,
  files: [{ path: 'design/drafts/10-chip-slots-v5.html', status: 'modified' }],
  changed: [],
  heldRunIds: [],
}

/** A chat that commits as it goes: the receipt where the commit card was, and what follows it. */
function Chat({ leftOver = false }: { leftOver?: boolean }) {
  const messages = leftOver ? [ASK, SAYS, AGAIN, REPLY, LEFT] : [ASK, SAYS, AGAIN, REPLY]
  const marker = chatChangesMarkerView({
    runId: OPEN.runId,
    artifact: { payload: { files: OPEN.files } },
    review: { branch: OPEN.review.branch },
    openRunId: OPEN.runId,
    canOpen: true,
  })
  const bar = leftOver
    ? chatChangesBarView({ openChanges: OPEN, verdict: { key: 'partly', failed: 0 } }, NOW)
    : undefined
  return (
    <div className="flex max-w-3xl flex-col overflow-hidden rounded-xl border border-(--border-default) bg-(--surface-base)">
      <div className="flex flex-col gap-3 px-4 py-4">
        <Row msg={ASK} i={0} of={messages.length} />
        <Row msg={SAYS} i={1} of={messages.length} />
        <CommitReceipt view={RECEIPT} proof={PROOF} />
        <Row msg={AGAIN} i={2} of={messages.length} />
        <Row msg={REPLY} i={3} of={messages.length} />
        {leftOver ? (
          <div>
            <Row msg={LEFT} i={4} of={messages.length} />
            {marker ? <ChatChangesMarker view={marker} onOpen={noop} /> : null}
          </div>
        ) : null}
      </div>
      {bar ? <ChatChangesBar view={bar} onReview={noop} onDiscard={noop} /> : null}
      <div className="shrink-0 border-t border-(--border-subtle) bg-(--surface-raised) p-2">
        <div className="flex items-center justify-between rounded-md border border-(--border-default) bg-(--surface-base) px-3 py-2.5 text-[13px] text-(--text-muted)">
          <span>Type your message…</span>
          <span className="text-[11px]">⌘ + Enter to send</span>
        </div>
      </div>
    </div>
  )
}

function Column({ children }: { children: ReactNode }) {
  return <div className="flex max-w-2xl flex-col gap-3">{children}</div>
}

export const COMMIT_RECEIPT_SCENES: Scene[] = [
  {
    id: 'commit-receipt',
    title: 'Commit receipt',
    component: 'CommitReceipt (ToolCallCard)',
    group: 'Chat',
    description:
      'A commit the person approved leaves one line in place of its tool row: what was committed and where, how many files, the proof the turn already has, and “View the change” opening the files and the message in place. Committing was the decision — nothing asks again.',
    states: [
      {
        id: 'collapsed',
        title: 'Committed',
        render: () => (
          <Column>
            <CommitReceipt view={RECEIPT} proof={PROOF} />
          </Column>
        ),
      },
      {
        id: 'expanded',
        title: 'The change, opened',
        description: 'Each file with its status, then the commit’s message.',
        render: () => (
          <Column>
            <CommitReceipt view={RECEIPT} proof={PROOF} defaultOpen />
          </Column>
        ),
      },
      {
        id: 'no-proof',
        title: 'Nothing proven yet',
        description: 'A turn with no proof shows no chips.',
        render: () => (
          <Column>
            <CommitReceipt view={RECEIPT} />
          </Column>
        ),
      },
      {
        id: 'in-chat',
        title: 'In the chat',
        description:
          'The turn ends with nothing left to decide: no changes card, no bar, no Apply or Discard — the work is on dev.',
        render: () => <Chat />,
      },
      {
        id: 'something-left',
        title: 'Something left',
        description:
          'A later turn leaves work the agent did not commit: only that gets a marker and the bar.',
        render: () => <Chat leftOver />,
      },
    ],
  },
  {
    id: 'already-on-base-line',
    title: 'Already on its base',
    component: 'AlreadyOnBaseLine (ChatChangesMarker, CliRunArtifactPanel)',
    group: 'Chat',
    description:
      'A turn whose change its base already holds: one neutral line in the timeline — and in its review, if one is opened — never a changes marker, a verdict, checks, Apply or Discard. A turn whose own commit receipt says so shows nothing more.',
    states: [
      {
        id: 'with-commit',
        title: 'Names the commit',
        render: () => (
          <Column>
            <AlreadyMarker failure={ALREADY} />
          </Column>
        ),
      },
      {
        id: 'with-commit-open',
        title: 'The change, opened',
        render: () => (
          <Column>
            <AlreadyMarkerOpen />
          </Column>
        ),
      },
      {
        id: 'older-record',
        title: 'Older record',
        description: 'A record that names no commit: the line alone, nothing to open.',
        render: () => (
          <Column>
            <AlreadyMarker failure={{ reason: 'already-on-base', baseRef: 'dev', at: NOW }} />
          </Column>
        ),
      },
    ],
  },
]

function AlreadyMarkerOpen() {
  const view = chatChangesMarkerView({
    runId: 'chat-turn-8',
    changeFiles: [{ path: DRAFT, status: 'modified' }],
    ...whenAlready(ALREADY),
    canOpen: true,
  })
  if (view?.kind !== 'already') return null
  return (
    <AlreadyOnBaseLine
      text={view.text}
      {...(view.change ? { change: view.change } : {})}
      defaultOpen
    />
  )
}
