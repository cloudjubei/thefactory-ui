import type { ReferenceTarget } from 'thefactory-tools/types'
import { useMemo, useState, type ReactNode } from 'react'
import Alert from '../../primitives/Alert'
import { IconChevronLeft, IconChevronRight } from '../../icons'
import AgentQuestionCard from './AgentQuestionCard'
import RemedyCard from './RemedyCard'
import ChatInput, { type ChatInputProps } from './ChatInput'
import CredentialCaptureCard from './CredentialCaptureCard'
import ApprovalPanel from './ApprovalPanel'
import MessageList from './MessageList'
import PendingMessagesStack from './PendingMessagesStack'
import HeldAgentMessagesStack from './HeldAgentMessagesStack'
import type { ChatPendingQueue } from '../../../headless/hooks/useChatComposer'
import { usePendingAutoDispatch } from '../../../headless/hooks/usePendingAutoDispatch'
import {
  partitionGrants,
  shownQuestionId,
  splitParkedAsks,
  userAsks,
} from '../../../headless/utils/agentQuestions'
import { QUESTION_PAGER } from '../../../headless/utils/agentQuestionConstants'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import StillWaitingRow from './StillWaitingRow'
import { ToolAskDecidedRow } from './ToolAskCard'
import { panelApprovalGrants } from '../../../headless/utils/approvalGrant'
import { useClaimedAsks } from '../../../headless/hooks/useInlineApprovals'
import { useHeldAgentMessages } from '../../../headless/hooks/useHeldAgentMessages'
import { useShownLiveRun } from '../../../headless/hooks/useShownLiveRun'
import { useChatDecidedAsks } from '../../../headless/hooks/useChatDecidedAsks'
import { blockedOnFromGrants } from '../../../headless/utils/cliRunActivity'
import { capturesBlockedOn } from '../../../headless/utils/credentialCaptures'
import type { UikitFileMeta } from '../files/FileDisplay'
import type { ResourceLink } from 'thefactory-tools/types'
import type { ToolCall, ToolResultType } from './ToolCall'
import type {
  ChatLiveStateLike,
  ChatMessageLike,
  PendingToolGrant,
} from '../../../headless/utils/chatTypes'
import type {
  CredentialCapture,
  CredentialCaptureFields,
} from '../../../headless/utils/credentialCaptureTypes'

export type ChatBodyProps = {
  /** Stable id for the chat — drives MessageList scroll/visibility resets. */
  chatId?: string
  /** The chat's project, forwarded to the launch approval so it can resolve the
   * process proposal a user reads before approving. */
  projectId?: string
  /** The chat's group, forwarded to a launch across the group's projects. */
  groupId?: string
  /**
   * The app's own model chip for THIS chat, rendered inside a launch approval so
   * the model can be picked before the work starts. A host slot because the
   * connected chip lives in the app, not in this library.
   */
  renderApprovalModelChip?: (picked: {
    /** The model chosen for the run, or `undefined` while it is the chat's. */
    model: string | undefined
    onPick: (modelId: string) => void
    /** The CLI chosen for the run, or `undefined` while it is the chat's. */
    cli: string | undefined
    onPickCli: (cli: string, credentialId: string | undefined, model: string | undefined) => void
  }) => ReactNode
  /** Caller-rendered header. Title, icons, etc. — ChatBody only provides the
   * vertical layout. When omitted the header section is not rendered. */
  header?: ReactNode

  /** Optional message-side error banner (e.g. "Failed to send"). */
  sendError?: { message: string } | null

  /** When provided, replaces the standard chat input (e.g. for read-only
   * agent-run chats). */
  inputOverride?: ReactNode

  /**
   * True when this chat's history is closed and deliberately kept (archived /
   * consolidated). Rows then show their delete control as LOCKED rather than
   * hiding it — the record of how the work happened is the point of keeping it,
   * and a missing button reads as a bug rather than a decision.
   */
  historyLocked?: boolean

  messages: ChatMessageLike[]
  /**
   * The chat's messages are still loading. Ordinary tool asks then wait for the
   * rows that will show them instead of flashing up on the approval panel.
   */
  messagesLoading?: boolean
  /** The chat's metadata — where the agent messages held for it until it is free are kept. */
  chatMetadata?: Record<string, unknown>
  liveState: ChatLiveStateLike

  /** Pluggable tool-call result renderer — forwarded to every message. */
  renderToolResult?: (args: {
    toolCall: ToolCall
    result?: unknown
    resultType?: ToolResultType
    sideBySide?: boolean
  }) => ReactNode
  /** Header-path computer — see `MessageList.getToolHeaderPath`. */
  getToolHeaderPath?: (toolCall: ToolCall) => string | undefined

  /** Resolve `@<path>` inline file mentions. Forwarded to MessageList. */
  onResolveFile?: (token: string) => UikitFileMeta | null
  /** Render `#<id>` inline references. Forwarded to MessageList. */
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  /** Route an in-app `overseer://…` resource link the assistant emitted. Forwarded to MessageList (F.2). */
  onResourceLink?: (link: ResourceLink) => void
  /** Render the workspace-diff panel for a CLI-agent reply. Forwarded to MessageList. */
  renderCliRunArtifact?: (runId: string) => ReactNode
  /** Forwarded to the message list: the live process run an announcement message launched. */
  renderProcessRun?: (processRunId: string) => ReactNode
  /** Forwarded to the message list: the live group run an announcement launched. */
  renderProcessGroupRun?: (groupRunId: string) => ReactNode

  // Send / abort / confirm — wired to the host's ChatsContext.
  onSend: (content: string, attachments?: string[]) => Promise<void> | void
  onAbort?: () => Promise<void> | void
  /**
   * Whether a turn is still running, according to the SERVER. `liveState.isSending`
   * only knows about a send this browser session made, so after a reload — or on a
   * second client — a multi-minute CLI turn shows an idle composer with no way to
   * stop it. Hosts pass the run id they resolved from the backend here.
   */
  isBusy?: boolean
  /**
   * The CLI run the SERVER says this chat has active, from `usePendingToolGrants`.
   * `liveState.cliRunId` only knows about a send this browser session made, so a
   * reload — or a second client — would otherwise show a multi-minute turn with
   * no live transcript at all. Used as the fallback for the live run view.
   */
  activeCliRunId?: string
  /**
   * The chat's asks — an API turn's and a CLI run's alike — from
   * `usePendingToolGrants`. An ordinary tool ask is decided on the row that
   * shows its call; the rest take the composer's place in the approval panel.
   * `askUser` question grants are split out of this feed and take the
   * composer's place as question cards.
   */
  grants?: PendingToolGrant[]

  /**
   * In-chat credential captures for this chat, from `useCredentialCaptures`.
   * Only the ones still awaiting the user render, and each takes the composer's
   * place exactly as an `askUser` question does — paged with the questions — so
   * the agent parked on it is answered before anything else is typed. The typed
   * fields go from the card straight to the credentials API via
   * {@link onSubmitCredentialCapture} — never through chat state and never into
   * the transcript.
   */
  credentialCaptures?: CredentialCapture[]
  onSubmitCredentialCapture?: (id: string, fields: CredentialCaptureFields) => Promise<void>
  onCancelCredentialCapture?: (id: string) => Promise<void>

  onDeleteLastMessage?: () => Promise<void> | void
  onRetry?: () => Promise<void> | void
  /**
   * Re-run the chat's trailing user message — the agent runs again on the
   * conversation as it stands, with no copy of the message appended. Omit it
   * and no row offers a restart (e.g. an agent-run chat, or one whose run is
   * live).
   */
  onRestartTurn?: () => Promise<void> | void

  /**
   * When false, the input is disabled (e.g. no LLM configured). The
   * placeholder swaps to a hint about it.
   */
  canSend?: boolean

  /** Forwarded to MessageList — controls the context-cutoff divider. */
  numberMessagesToSend?: number

  /** Most-recent ISO timestamp the user has seen — drives MessageList's
   * first-unread positioning. */
  lastReadIso?: string
  onAtBottomChange?: (atBottom: boolean) => void
  onReadLatest?: (iso?: string) => void
  /** Bumped on send to scroll to the bottom. */
  scrollToBottomSignal?: number

  /** Caller-rendered empty-state for the MessageList. */
  emptyStateContent?: ReactNode
  /** Forwarded to the MessageList: the conversation's opening, above every message. */
  leadingContent?: ReactNode

  /** Host-supplied tool-preview fetcher — see `MessageList.previewTool`. */
  previewTool?: (toolCallId: string, toolName: string, args: unknown) => Promise<unknown>

  /** Forwarded to the lifted `ChatInput`. */
  inputProps?: Omit<
    ChatInputProps,
    'value' | 'onChange' | 'onSend' | 'onAbort' | 'isThinking' | 'isConfigured'
  >
  /** Input value (controlled). */
  inputValue: string
  onInputChange: (value: string) => void
  /**
   * The chat's pending queue, from `useChatComposer`. When given, a send while
   * the agent is busy is queued (shown above the composer) instead of refused,
   * and the queue goes out as one message once the turn ends.
   */
  pendingQueue?: ChatPendingQueue
}

const NO_IDS: ReadonlySet<string> = new Set()

/**
 * The single canonical chat canvas — header slot, message list, optional
 * error banner, input, and the approval panel. Used by both the full
 * Chat screen and the in-place `ChatSidebarPanel` body.
 *
 * Presentational: all state comes from `messages` + `liveState` props,
 * and side effects fire through `onSend` / `onAbort` and the grants' own `decide`.
 */
export default function ChatBody({
  chatId,
  renderApprovalModelChip,
  header,
  sendError,
  inputOverride,
  historyLocked,
  messages,
  messagesLoading = false,
  chatMetadata,
  liveState,
  renderToolResult,
  getToolHeaderPath,
  onResolveFile,
  renderReference,
  onResourceLink,
  renderCliRunArtifact,
  renderProcessRun,
  renderProcessGroupRun,
  projectId,
  groupId,
  onSend,
  onAbort,
  isBusy,
  activeCliRunId,
  onDeleteLastMessage,
  onRetry,
  onRestartTurn,
  canSend = true,
  numberMessagesToSend,
  lastReadIso,
  onAtBottomChange,
  onReadLatest,
  scrollToBottomSignal,
  emptyStateContent,
  leadingContent,
  previewTool,
  grants,
  credentialCaptures,
  onSubmitCredentialCapture,
  onCancelCredentialCapture,
  inputProps,
  inputValue,
  onInputChange,
  pendingQueue,
}: ChatBodyProps) {
  const { isSending, pendingAssistant } = liveState
  // While a CLI run streams, show the live Agent-run panel for its runId rather
  // than the raw-text pending bubble (which popped in blocks and then flashed
  // into the final message). The panel renders the streaming transcript with the
  // current operation expanded. Falls back to the run the SERVER reports for this
  // chat, so a reload keeps watching a turn this session never started.
  // Held past the run's end until the persisted reply carries it — see
  // `useShownLiveRun`.
  const cliRunId = useShownLiveRun(chatId, liveState.cliRunId ?? activeCliRunId, messages)
  // A capture is only actionable when the host wired both resolutions, so an
  // unwired ChatBody shows no form rather than one that cannot be answered.
  const answerableCaptures = useMemo(
    () =>
      onSubmitCredentialCapture && onCancelCredentialCapture ? (credentialCaptures ?? []) : [],
    [credentialCaptures, onSubmitCredentialCapture, onCancelCredentialCapture],
  )
  const asks = useMemo(
    () => userAsks(partitionGrants(grants).questions, answerableCaptures),
    [grants, answerableCaptures],
  )
  // "Not now" sets a question aside, still waiting: it gives the composer back
  // and stays as a slim row in the conversation — this chat's own, forgotten
  // when another chat opens.
  const [parked, setParked] = useState<{ chatId?: string; ids: ReadonlySet<string> }>({
    ids: new Set(),
  })
  const parkedIds = parked.chatId === chatId ? parked.ids : NO_IDS
  const setAskParked = (id: string, on: boolean) => {
    const next = new Set(parkedIds)
    if (on) next.add(id)
    else next.delete(id)
    setParked({ ...(chatId !== undefined ? { chatId } : {}), ids: next })
  }
  const { open: openAsks, parked: parkedAsks } = splitParkedAsks(asks, parkedIds)
  const [chosenAskId, setChosenAskId] = useState<string>()
  const shownAskKey = shownQuestionId(
    openAsks.map((a) => a.id),
    chosenAskId,
  )
  const shownIndex = openAsks.findIndex((a) => a.id === shownAskKey)
  const shownAsk = shownIndex >= 0 ? openAsks[shownIndex] : undefined
  // A card decided here folds to one line in the conversation.
  const [decided, setDecided] = useState<{
    chatId?: string
    lines: { id: string; line: ToolAskDecidedLine }[]
  }>({ lines: [] })
  const decidedLines = decided.chatId === chatId ? decided.lines : []
  const addDecidedLine = (id: string, line: ToolAskDecidedLine) =>
    setDecided({
      ...(chatId !== undefined ? { chatId } : {}),
      lines: [...decidedLines.filter((l) => l.id !== id), { id, line }],
    })
  const remedyGrants = useMemo(() => partitionGrants(grants).remedies, [grants])
  // EVERY pending approval takes the composer's place so the asks are unmissable
  // while the conversation stays visible. They stack: an ask outlives the turn
  // that raised it, so a later turn's ask can arrive on top of an unanswered one
  // — that pile-up used to fall back to a modal covering the chat. `Decide later`
  // dismisses the current set back to the composer WITHOUT deciding; a NEW ask
  // (changing the id set) re-shows it, because the dismissed key no longer matches.
  // Ordinary tool asks are decided on the rows that show them — a CLI turn's
  // and an API turn's alike; each reports which asks it shows, and the panel
  // keeps only the rest.
  const { claimedAskIds, unsettledRunIds, onClaimAsks } = useClaimedAsks()
  const held = useHeldAgentMessages(chatId, chatMetadata)
  const pendingAskIds = useMemo(() => (grants ?? []).map((g) => g.id), [grants])
  const decidedAsks = useChatDecidedAsks(chatId, pendingAskIds)
  const approvalGrants = useMemo(
    () => panelApprovalGrants(grants, claimedAskIds, { loading: messagesLoading, unsettledRunIds }),
    [grants, claimedAskIds, messagesLoading, unsettledRunIds],
  )
  const approvalKey = approvalGrants.map((g) => g.id).join('|')
  const [approvalDismissedKey, setApprovalDismissedKey] = useState<string | null>(null)
  const showApprovalPanel = approvalGrants.length > 0 && approvalKey !== approvalDismissedKey
  // Everything the active run is parked on — permission grants AND questions.
  // Both stop the agent dead, so both belong on the live activity line.
  const cliBlockedOn = useMemo(
    () => [...blockedOnFromGrants(grants), ...capturesBlockedOn(answerableCaptures)],
    [grants, answerableCaptures],
  )
  const busy = isBusy ?? isSending
  const composerBlockers = useMemo(
    () => ({
      askShown: !!shownAsk,
      approvalShown: showApprovalPanel,
      historyLocked: !!historyLocked,
      inputOverridden: !!inputOverride,
    }),
    [shownAsk, showApprovalPanel, historyLocked, inputOverride],
  )
  usePendingAutoDispatch({
    chatId,
    queue: pendingQueue,
    busy,
    failed: !!liveState.sendError,
    blockers: composerBlockers,
  })
  const pendingForList = useMemo(
    () =>
      !cliRunId && pendingAssistant
        ? { role: 'assistant' as const, content: pendingAssistant.content || '…' }
        : null,
    [cliRunId, pendingAssistant],
  )

  const askPager = (
    <span className="flex items-center gap-1.5 text-xs font-normal">
      <button
        type="button"
        aria-label="Previous"
        className="rounded p-0.5 hover:bg-(--surface-hover) disabled:opacity-40"
        onClick={() => setChosenAskId(openAsks[shownIndex - 1]?.id)}
        disabled={shownIndex <= 0}
      >
        <IconChevronLeft className="w-4 h-4" />
      </button>
      <span className="tabular-nums">{QUESTION_PAGER(shownIndex + 1, openAsks.length)}</span>
      <button
        type="button"
        aria-label="Next"
        className="rounded p-0.5 hover:bg-(--surface-hover) disabled:opacity-40"
        onClick={() => setChosenAskId(openAsks[shownIndex + 1]?.id)}
        disabled={shownIndex >= openAsks.length - 1}
      >
        <IconChevronRight className="w-4 h-4" />
      </button>
    </span>
  )

  return (
    <div
      data-chat-panel=""
      className="flex flex-col w-full h-full overflow-hidden bg-(--surface-base)"
    >
      {header}

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <MessageList
          isBusy={isBusy}
          chatId={chatId}
          messages={messages}
          isThinking={isSending && !pendingAssistant && !cliRunId}
          pending={pendingForList}
          pendingCliRunId={cliRunId}
          pendingCliModel={liveState.cliModel ?? undefined}
          pendingCliStartedAt={liveState.cliStartedAt ?? undefined}
          cliBlockedOn={cliBlockedOn}
          cliAsks={grants}
          decidedAsks={decidedAsks}
          onClaimAsks={onClaimAsks}
          renderToolResult={renderToolResult}
          getToolHeaderPath={getToolHeaderPath}
          onResolveFile={onResolveFile}
          renderReference={renderReference}
          onResourceLink={onResourceLink}
          renderCliRunArtifact={renderCliRunArtifact}
          renderProcessRun={renderProcessRun}
          renderProcessGroupRun={renderProcessGroupRun}
          numberMessagesToSend={numberMessagesToSend}
          lastReadIso={lastReadIso}
          onAtBottomChange={onAtBottomChange}
          onReadLatest={onReadLatest}
          scrollToBottomSignal={scrollToBottomSignal}
          historyLocked={historyLocked}
          onDeleteLastMessage={onDeleteLastMessage ? () => void onDeleteLastMessage() : undefined}
          onRetry={onRetry ? () => void onRetry() : undefined}
          onRestartTurn={onRestartTurn ? () => void onRestartTurn() : undefined}
          previewTool={previewTool}
          isSending={isSending}
          isDeleting={liveState.isDeleting === true}
          emptyStateContent={emptyStateContent}
          leadingContent={leadingContent}
          tailContent={
            decidedLines.length > 0 || parkedAsks.length > 0 ? (
              // Settled and set-aside asks no longer hold the agent up on the
              // person, so they read in the conversation rather than in the way.
              <div className="flex flex-col gap-2">
                {decidedLines.map(({ id, line }) => (
                  <ToolAskDecidedRow key={id} line={line} />
                ))}
                {parkedAsks.map((ask) =>
                  ask.kind === 'question' ? (
                    <StillWaitingRow
                      key={ask.id}
                      question={ask.grant.question.question}
                      onReopen={() => {
                        setAskParked(ask.id, false)
                        setChosenAskId(ask.id)
                      }}
                    />
                  ) : null,
                )}
              </div>
            ) : null
          }
        />
      </div>

      {sendError ? (
        <div className="px-4 py-2 shrink-0">
          <Alert>{sendError.message}</Alert>
        </div>
      ) : null}

      {remedyGrants.length > 0 ? (
        <div className="px-4 py-2 shrink-0 flex flex-col gap-2">
          {remedyGrants.map((grant) => (
            <RemedyCard key={grant.id} grant={grant} />
          ))}
        </div>
      ) : null}

      <HeldAgentMessagesStack held={held} />
      {/* A question or a credential form TAKES the composer rather than sitting
          above a live one: the agent's next step depends on the answer, so a
          free-text message sent past it would be typed into a conversation that
          is not listening. Answering, cancelling or "Not now" is the way back to
          typing. One ask at a time, paged, so several never read as the same
          question asked twice. Capped and scrollable, so a tall card never
          pushes its own decision off-screen. */}
      {shownAsk ? (
        <div className="flex max-h-[65%] min-h-0 shrink flex-col gap-2 overflow-y-auto border-t border-(--border-default) bg-(--surface-raised) px-3 py-3">
          {shownAsk.kind === 'question' ? (
            <AgentQuestionCard
              key={shownAsk.id}
              grant={shownAsk.grant}
              onPark={() => setAskParked(shownAsk.id, true)}
              {...(openAsks.length > 1 ? { pager: askPager } : {})}
            />
          ) : (
            <>
              {openAsks.length > 1 ? (
                <div className="flex justify-end text-(--text-secondary)">{askPager}</div>
              ) : null}
              <CredentialCaptureCard
                key={shownAsk.id}
                capture={shownAsk.capture}
                onSubmit={(fields) => onSubmitCredentialCapture!(shownAsk.id, fields)}
                onCancel={() => onCancelCredentialCapture!(shownAsk.id)}
              />
            </>
          )}
        </div>
      ) : showApprovalPanel ? (
        // Shrinkable and capped, so a tall card scrolls inside itself and the
        // messages above stay in reach — never pushes its own decision off-screen.
        <div className="flex max-h-[65%] min-h-0 shrink flex-col overflow-y-auto">
          {approvalGrants.map((grant) => (
            <ApprovalPanel
              key={grant.id}
              grant={grant}
              {...(projectId ? { projectId } : {})}
              {...(groupId ? { groupId } : {})}
              onDecideLater={() => setApprovalDismissedKey(approvalKey)}
              onDecided={(line) => addDecidedLine(grant.id, line)}
              {...(renderApprovalModelChip ? { renderModelChip: renderApprovalModelChip } : {})}
            />
          ))}
        </div>
      ) : historyLocked ? (
        // A closed chat keeps its history and takes no new work. Archiving is
        // one-way by design — reopening would contradict the very locking that
        // preserves the record — so the composer is replaced with the reason
        // rather than left to fail on send.
        <div className="px-3 py-2 text-[12px] text-(--text-secondary) border-t border-(--border-subtle)">
          <span aria-hidden>🔒 </span>
          This chat is closed. Its history is kept as the record of how the work was done — start a
          new chat to carry on from here.
        </div>
      ) : inputOverride ? (
        inputOverride
      ) : (
        <>
          {pendingQueue ? <PendingMessagesStack queue={pendingQueue} busy={busy} /> : null}
          <ChatInput
            value={inputValue}
            onChange={onInputChange}
            onSend={(content, attachments) =>
              busy && pendingQueue
                ? pendingQueue.enqueue({ text: content, attachments })
                : onSend(content, attachments)
            }
            onAbort={
              onAbort
                ? () => {
                    pendingQueue?.pause()
                    void onAbort()
                  }
                : undefined
            }
            isThinking={busy}
            isConfigured={canSend}
            queueWhileThinking={!!pendingQueue}
            clearOnSend
            {...inputProps}
          />
        </>
      )}
    </div>
  )
}
