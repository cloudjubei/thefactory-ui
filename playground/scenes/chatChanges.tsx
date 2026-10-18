import type { ReactNode } from 'react'
import { MessageRow, type ChatMessageLike } from 'thefactory-ui/web'
import {
  approveActionDescriptors,
  chatChangesHeader,
  checkMethodRows,
  earnedApproveActions,
  openChangesNoticeView,
  reviewOnBaseOfferView,
  reviewTabOrder,
  reviewTabs,
  runProposalView,
  signoffVerdict,
  type RunModel,
} from 'thefactory-ui/headless'
import { CHAT_OPEN_CHANGES_NEEDS_YOU_AFTER_MS } from 'thefactory-tools/constants'
// Not on the package's public surface: the chat renders them itself inside its change card and
// its dock. The showcase reaches into the source for them, as the playground renders the library
// from source anyway.
import { OpenChangesNotice } from '../../src/web/compound/chat/OpenChangesNotice'
import { ReviewOnBaseOffer } from '../../src/web/compound/chat/ReviewOnBaseOffer'
import { RunChangesHead } from '../../src/web/compound/chat/RunChangesHead'
import { RunVerdictLine } from '../../src/web/compound/chat/RunVerdictLine'
import {
  ChangesTab,
  CheckChipRow,
  DecisionBar,
  ReviewTabBar,
} from '../../src/web/compound/chat/signoff'
import ToolAskCard from '../../src/web/compound/chat/ToolAskCard'
import type { ChatOpenChanges, CliRunReviewOnBase } from '../../src/headless/api/generated'
import { runProposalAskView } from '../../src/headless/utils/toolAskCard'
import type { Scene } from '../showcase/types'

const noop = () => {}

// ---------------------------------------------------------------------------------------------
// The change card of a chat's own changes, as the chat draws it under the turn that made them

const BRANCH = 'agent/84b6fd5bb3cd'
const HOUR = 60 * 60 * 1000
/** A fixed "now" — the card counts the wait against it, so two loads draw the same pixels. */
const NOW = Date.UTC(2026, 9, 15, 12, 30)

const MODEL: RunModel = {
  tool: 'cursor-agent',
  tag: 'CLI',
  model: 'Composer 2.5',
  requested: 'auto',
  effort: undefined,
}

const PATCH = [
  '@@ -13,6 +13,7 @@',
  '         <nav class="app-nav" aria-label="App">',
  '           <a href="#view=pairings" data-nav="matchups">Matchup results</a>',
  '+          <a href="#build" data-nav="build">Army builder</a>',
  '           <a href="#play" data-nav="play">Play (hot-seat)</a>',
  '         </nav>',
].join('\n')

const FILES = [{ path: 'index.html', status: 'M' as const, patch: PATCH }]

const OPEN: ChatOpenChanges = {
  runId: 'chat-turn-1',
  projectId: 'wargames',
  review: { branch: BRANCH, baseSha: 'c1854b26', headSha: 'abe79891', landedAt: NOW },
  openSince: NOW - CHAT_OPEN_CHANGES_NEEDS_YOU_AFTER_MS - HOUR / 2,
  files: [{ path: 'index.html', status: 'modified' }],
  changed: [],
  heldRunIds: [],
}

/** How the review stands against its base, as the server reads it, and the offer's state. */
type OnBase = { preview: CliRunReviewOnBase; confirming?: boolean; error?: string }

/** A review whose base lacks one of its files. */
const LACKS: CliRunReviewOnBase = {
  kind: 'neither',
  branch: BRANCH,
  baseRef: 'dev',
  reason: 'dev does not hold all of this review yet — a file differs: index.html.',
  paths: ['index.html'],
}

/** The card as `CliRunArtifactPanel` lays it out, from the same parts, on fixed data. */
function ChangeCard({ openChanges, onBase }: { openChanges?: ChatOpenChanges; onBase?: OnBase }) {
  const header = chatChangesHeader({ fileCount: FILES.length, branch: BRANCH })
  const rows = checkMethodRows({ verification: undefined, approaches: [], evidence: [] })
  const headline = signoffVerdict({ rows, verified: false })
  const tabs = reviewTabs({
    screens: 0,
    walkthroughs: 0,
    reports: 0,
    testCount: 0,
    testChecks: 0,
    buildChecks: 0,
    changedFiles: FILES.length,
  })
  const earned = earnedApproveActions(
    approveActionDescriptors({
      branch: BRANCH,
      baseBranch: 'the working branch',
      hasRemote: true,
      fileCount: FILES.length,
    }),
    headline.key,
  )
  const notice = openChanges
    ? openChangesNoticeView({ runId: openChanges.runId, openChanges }, NOW)
    : undefined
  const offer = onBase
    ? reviewOnBaseOfferView({
        preview: onBase.preview,
        ...(onBase.error ? { error: onBase.error } : {}),
      })
    : undefined
  return (
    <div className="max-w-3xl rounded-md border border-(--border-default) bg-(--surface-raised)">
      <RunChangesHead
        marker={headline.key}
        title={header.title}
        meta={header.meta}
        {...(header.branch ? { branch: header.branch } : {})}
        model={MODEL}
        durationLabel="25s"
        costLabel="$0.04"
      />
      <div className="flex flex-col gap-3 px-3 py-3">
        {notice ? <OpenChangesNotice view={notice} onDiscard={noop} onRebuild={noop} /> : null}
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
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <ReviewTabBar tabs={tabs} active="changes" onChange={noop} />
          <ChangesTab
            projectId="wargames"
            review={undefined}
            files={FILES}
            loading={false}
            error={undefined}
            onRetry={undefined}
            onOpenGit={undefined}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-(--border-subtle) px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3" />
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
        {offer ? (
          <ReviewOnBaseOffer
            view={offer}
            onClose={noop}
            {...(onBase?.confirming ? { defaultConfirming: true } : {})}
          />
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// A run's own chat: the person asks for a change, the agent proposes it on the run

const ASKS: ChatMessageLike = {
  id: 'u1',
  role: 'user',
  content:
    'The walkthrough never adds a faction card — those are special tactics cards that decide which units a faction may field. This is in the rules, and we must add it.',
}

const PROPOSES: ChatMessageLike = {
  id: 'a1',
  role: 'assistant',
  content: [
    'The validator already enforces one Faction Card (R1), but the army builder never lets you pick one.',
    '',
    'I don’t change code in this chat — it only reads the run. I’ve put the change on the run instead: the **Army builder** feature gets an acceptance line for faction cards, and its rework waits to start. The run’s own steps make it, and its sign-off covers it.',
  ].join('\n'),
}

const PROPOSAL_ARGS = {
  featureId: 'army-builder',
  acceptance:
    'The builder offers each faction’s Faction Cards, requires exactly one, and limits the units to those the card allows.',
  note: 'Add Faction Cards to the army builder and its walkthrough: pick one per army, and only offer units that card allows.',
  proofKinds: ['unit-tests', 'screens'],
}

function Conversation({ messages }: { messages: ChatMessageLike[] }) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg, i) => (
        <MessageRow
          key={msg.id ?? i}
          msg={msg}
          globalIndex={i}
          totalMessages={messages.length}
          isThinking={false}
          isLast={i === messages.length - 1}
          prevUserMessagesLen={messages.length}
          enhancedTotalLength={messages.length}
        />
      ))}
    </div>
  )
}

function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-2xl rounded-xl border border-(--border-subtle) bg-(--surface-base)">
      {children}
    </div>
  )
}

function RunChatProposal() {
  const view = runProposalView('proposeFeatureChange', PROPOSAL_ARGS, 'Army builder')
  if (!view) return null
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Conversation messages={[ASKS, PROPOSES]} />
      <Dock>
        <div className="m-3">
          <ToolAskCard
            view={runProposalAskView(view, PROPOSAL_ARGS)}
            busy={false}
            onApprove={noop}
            onDeny={noop}
            onLater={noop}
          />
        </div>
      </Dock>
    </div>
  )
}

export const CHAT_CHANGES_SCENES: Scene[] = [
  {
    id: 'chat-change-card',
    title: 'Change card',
    component: 'CliRunArtifactPanel (RunChangesHead, OpenChangesNotice, ReviewOnBaseOffer)',
    group: 'Chat',
    description:
      'The one card under a chat turn whose agent changed files: its head says whose changes they are, how many files and the branch of their own they wait on — never a process run’s sign-off. Once they wait past the limit, or no longer fit the checkout, the same card says so, with Discard there; no second card is posted.',
    states: [
      {
        id: 'fresh',
        title: 'Fresh',
        description: 'Just made: what was checked, the diff, and the decision.',
        render: () => <ChangeCard />,
      },
      {
        id: 'waiting-12h',
        title: 'Waiting 12 h',
        description:
          'Undecided past the limit: “Waiting for you · 12 h” on the card, with Discard. The chat’s badge counts it; nothing else is posted.',
        render: () => <ChangeCard openChanges={OPEN} />,
      },
      {
        id: 'no-longer-fits',
        title: 'No longer fits',
        description:
          'The checkout changed a file since: the card says so and offers Rebuild on current beside Discard.',
        render: () => (
          <ChangeCard
            openChanges={{
              ...OPEN,
              openSince: NOW - HOUR,
              changed: [{ path: 'index.html', reason: 'changed in the checkout' }],
            }}
          />
        ),
      },
      {
        id: 'already-on-base',
        title: 'Already on its base',
        description:
          'The base already holds the change: “Already on dev — close it” under the decision. Closing removes the branch, recorded for restore.',
        render: () => (
          <ChangeCard
            onBase={{ preview: { kind: 'held', branch: BRANCH, baseRef: 'dev', by: 'patch-id' } }}
          />
        ),
      },
      {
        id: 'replaced-on-base',
        title: 'Replaced on its base',
        description: 'A later commit on the base rewrote every file the change touched.',
        render: () => (
          <ChangeCard
            onBase={{
              preview: {
                kind: 'superseded',
                branch: BRANCH,
                baseRef: 'dev',
                supersededBy: '4f1c2a9e7b3d5c8a0e6f2b1d9c7a5e3f1b8d6c4a',
              },
            }}
          />
        ),
      },
      {
        id: 'close-anyway',
        title: 'Base lacks some of it',
        description:
          'The base lacks a file: a quieter “Close as already on dev…” that names it, and asks first.',
        render: () => <ChangeCard onBase={{ preview: LACKS }} />,
      },
      {
        id: 'close-anyway-confirm',
        title: 'Close anyway — confirm',
        description:
          'The confirm: nothing on disk is discarded; the review closes and its branch is removed, recorded for restore.',
        render: () => <ChangeCard onBase={{ preview: LACKS, confirming: true }} />,
      },
      {
        id: 'close-refused',
        title: 'Close refused',
        description: 'The base moved on before the close: nothing changed, and the card says why.',
        render: () => (
          <ChangeCard
            onBase={{
              preview: { kind: 'held', branch: BRANCH, baseRef: 'dev', by: 'tree' },
              error: 'dev does not hold all of this review yet — a file differs: index.html.',
            }}
          />
        ),
      },
    ],
  },
  {
    id: 'run-chat-proposal',
    title: 'Run chat — change proposed',
    component: 'MessageRow, ToolAskCard (proposeFeatureChange)',
    group: 'Chat',
    description:
      'A process run’s own chat only reads: asked for a change, its agent proposes it on the run — here a change to one of the run’s features — and the card asks the person. The run’s steps make the change and its sign-off covers it.',
    states: [
      {
        id: 'feature-change',
        title: 'Feature change proposed',
        description: 'The person asks for faction cards; the agent puts the change on the run.',
        render: () => <RunChatProposal />,
      },
    ],
  },
]
