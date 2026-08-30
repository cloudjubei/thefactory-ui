import { useCallback, useMemo, type ReactNode } from 'react'
import Alert from '../../primitives/Alert'
import AgentQuestionCard from './AgentQuestionCard'
import ChatInput, { type ChatInputProps } from './ChatInput'
import CredentialCaptureCard from './CredentialCaptureCard'
import MessageList from './MessageList'
import ToolConfirmationModal from './ToolConfirmationModal'
import { partitionGrants } from '../../../headless/utils/agentQuestions'
import { blockedOnFromGrants } from '../../../headless/utils/cliRunActivity'
import { bindCapturesToToolCalls } from '../../../headless/utils/credentialCaptures'
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
  /** Caller-rendered header. Title, icons, etc. — ChatBody only provides the
   * vertical layout. When omitted the header section is not rendered. */
  header?: ReactNode

  /** Optional message-side error banner (e.g. "Failed to send"). */
  sendError?: { message: string } | null

  /** When provided, replaces the standard chat input (e.g. for read-only
   * agent-run chats). */
  inputOverride?: ReactNode

  /** When true, the composer (and any `inputOverride`) is not rendered at all —
   * the canvas is action-only (e.g. a pending feature-request chat whose only
   * actions live in the centered `emptyStateContent`). */
  hideInput?: boolean

  messages: ChatMessageLike[]
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
  renderDependency?: (dep: string) => ReactNode
  /** Route an in-app `overseer://…` resource link the assistant emitted. Forwarded to MessageList (F.2). */
  onResourceLink?: (link: ResourceLink) => void
  /** Render the workspace-diff panel for a CLI-agent reply. Forwarded to MessageList. */
  renderCliRunArtifact?: (runId: string) => ReactNode

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
  onConfirmTools: (grantedToolCallIds: string[]) => Promise<void> | void
  onCancelToolConfirmation: () => void
  /**
   * Unified tool-approval grants (API + CLI). When provided, the confirmation
   * modal renders these per-grant (with the CLI-only "allow permanently"
   * option) instead of the {@link onConfirmTools} batch path. Host computes them
   * via `usePendingToolGrants`. `askUser` question grants are split out of this
   * feed and render inline above the composer as question cards.
   */
  grants?: PendingToolGrant[]

  /**
   * In-chat credential captures for this chat, from `useCredentialCaptures`.
   * Only the ones still awaiting the user render, and each renders IN the
   * transcript, in place of the tool row that opened it — an answered capture
   * has a tool result of its own to speak for it. The typed fields go from the
   * card straight to the credentials API via {@link onSubmitCredentialCapture} —
   * never through chat state and never into the transcript.
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

  // ----- Inline tool-confirmation flow (desktop parity) -----
  /** Host-supplied tool-preview fetcher — see `MessageList.previewTool`. */
  previewTool?: (toolCallId: string, toolName: string, args: unknown) => Promise<unknown>
  /** Inline batch resume callback — see `MessageList.onResumeTools`. */
  onResumeTools?: (toolCallIds: string[]) => Promise<void> | void

  /** Forwarded to the lifted `ChatInput`. */
  inputProps?: Omit<
    ChatInputProps,
    'value' | 'onChange' | 'onSend' | 'onAbort' | 'isThinking' | 'isConfigured'
  >
  /** Input value (controlled). */
  inputValue: string
  onInputChange: (value: string) => void
}

/**
 * The single canonical chat canvas — header slot, message list, optional
 * error banner, input, and tool-confirmation modal. Used by both the full
 * Chat screen and the in-place `ChatSidebarPanel` body.
 *
 * Presentational: all state comes from `messages` + `liveState` props,
 * and side effects fire through `onSend` / `onAbort` / `onConfirmTools`.
 */
export default function ChatBody({
  chatId,
  header,
  sendError,
  inputOverride,
  hideInput,
  messages,
  liveState,
  renderToolResult,
  getToolHeaderPath,
  onResolveFile,
  renderDependency,
  onResourceLink,
  renderCliRunArtifact,
  onSend,
  onAbort,
  isBusy,
  activeCliRunId,
  onConfirmTools,
  onCancelToolConfirmation,
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
  previewTool,
  onResumeTools,
  grants,
  credentialCaptures,
  onSubmitCredentialCapture,
  onCancelCredentialCapture,
  inputProps,
  inputValue,
  onInputChange,
}: ChatBodyProps) {
  const { isSending, pendingAssistant } = liveState
  // While a CLI run streams, show the live Agent-run panel for its runId rather
  // than the raw-text pending bubble (which popped in blocks and then flashed
  // into the final message). The panel renders the streaming transcript with the
  // current operation expanded. Falls back to the run the SERVER reports for this
  // chat, so a reload keeps watching a turn this session never started.
  const cliRunId = liveState.cliRunId ?? activeCliRunId
  const questionGrants = useMemo(() => partitionGrants(grants).questions, [grants])
  // Everything the active run is parked on — permission grants AND questions.
  // Both stop the agent dead, so both belong on the live activity line.
  const cliBlockedOn = useMemo(() => blockedOnFromGrants(grants), [grants])
  // A capture is only actionable when the host wired both resolutions, so an
  // unwired ChatBody shows no form rather than one that cannot be answered.
  const captureBinding = useMemo(() => {
    if (!onSubmitCredentialCapture || !onCancelCredentialCapture) {
      return { byToolCallId: {}, unbound: [] }
    }
    return bindCapturesToToolCalls(messages, credentialCaptures ?? [])
  }, [messages, credentialCaptures, onSubmitCredentialCapture, onCancelCredentialCapture])

  const renderCaptureCard = useCallback(
    (capture: CredentialCapture) => (
      <CredentialCaptureCard
        key={capture.id}
        capture={capture}
        onSubmit={(fields) => onSubmitCredentialCapture!(capture.id, fields)}
        onCancel={() => onCancelCredentialCapture!(capture.id)}
      />
    ),
    [onSubmitCredentialCapture, onCancelCredentialCapture],
  )

  const renderToolRowOverride = useCallback(
    (toolCall: ToolCall) => {
      const capture = captureBinding.byToolCallId[toolCall.toolCallId]
      return capture ? renderCaptureCard(capture) : undefined
    },
    [captureBinding, renderCaptureCard],
  )
  const pendingForList = useMemo(
    () =>
      !cliRunId && pendingAssistant
        ? { role: 'assistant' as const, content: pendingAssistant.content || '…' }
        : null,
    [cliRunId, pendingAssistant],
  )

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-(--surface-base)">
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
          renderToolResult={renderToolResult}
          getToolHeaderPath={getToolHeaderPath}
          renderToolRowOverride={renderToolRowOverride}
          onResolveFile={onResolveFile}
          renderDependency={renderDependency}
          onResourceLink={onResourceLink}
          renderCliRunArtifact={renderCliRunArtifact}
          numberMessagesToSend={numberMessagesToSend}
          lastReadIso={lastReadIso}
          onAtBottomChange={onAtBottomChange}
          onReadLatest={onReadLatest}
          scrollToBottomSignal={scrollToBottomSignal}
          onDeleteLastMessage={onDeleteLastMessage ? () => void onDeleteLastMessage() : undefined}
          onRetry={onRetry ? () => void onRetry() : undefined}
          onRestartTurn={onRestartTurn ? () => void onRestartTurn() : undefined}
          previewTool={previewTool}
          onResumeTools={onResumeTools ?? onConfirmTools}
          isSending={isSending}
          emptyStateContent={emptyStateContent}
        />
      </div>

      {sendError ? (
        <div className="px-4 py-2 shrink-0">
          <Alert>{sendError.message}</Alert>
        </div>
      ) : null}

      {questionGrants.length > 0 ? (
        <div className="px-4 py-2 shrink-0 flex flex-col gap-2">
          {questionGrants.map((grant) => (
            <AgentQuestionCard key={grant.id} grant={grant} />
          ))}
        </div>
      ) : null}

      {/* Captures with no tool row of their own here — most often one opened by
          a CLI run, whose transcript renders itself. They still have to be
          answerable, or the agent waits on a form nobody can see. */}
      {captureBinding.unbound.length > 0 ? (
        <div className="px-4 py-2 shrink-0 flex flex-col gap-2">
          {captureBinding.unbound.map(renderCaptureCard)}
        </div>
      ) : null}

      {hideInput ? null : inputOverride ? (
        inputOverride
      ) : (
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSend={(content, attachments) => onSend(content, attachments)}
          onAbort={onAbort ? () => void onAbort() : undefined}
          isThinking={isBusy ?? isSending}
          isConfigured={canSend}
          clearOnSend
          {...inputProps}
        />
      )}

      <ToolConfirmationModal grants={grants} busy={isSending} onCancel={onCancelToolConfirmation} />
    </div>
  )
}
