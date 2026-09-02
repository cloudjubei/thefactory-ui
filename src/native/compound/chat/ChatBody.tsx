import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import Alert from '../../primitives/Alert'
import AgentQuestionCard from './AgentQuestionCard'
import ChatInput, { type ChatInputProps } from './ChatInput'
import CredentialCaptureCard from './CredentialCaptureCard'
import LaunchApprovalPanel from './LaunchApprovalPanel'
import MessageList from './MessageList'
import type { UikitFileMeta } from '../files/FileDisplay'
import type { ResourceLink } from 'thefactory-tools/types'
import { partitionGrants } from '../../../headless/utils/agentQuestions'
import { soleLaunchGrant } from '../../../headless/utils/launchGrant'
import { blockedOnFromGrants } from '../../../headless/utils/cliRunActivity'
import { bindCapturesToToolCalls } from '../../../headless/utils/credentialCaptures'
import type {
  ChatLiveStateLike,
  ChatMessageLike,
  PendingToolGrant,
  ToolCallLike,
  ToolResultTypeLike,
} from '../../../headless/utils/chatTypes'
import type {
  CredentialCapture,
  CredentialCaptureFields,
} from '../../../headless/utils/credentialCaptureTypes'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface ChatBodyProps {
  chatId?: string
  /** Caller-rendered header (typically `<ChatHeader />`). When omitted no
   * header section is rendered. */
  header?: ReactNode

  /** Optional banner for send-side errors. */
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

  /** Optional system prompt rendered above the message list. */
  systemPrompt?: string
  systemPromptTimestamp?: string

  /** Draws a context cut-off divider per the chat's `numberMessagesToSend`. */
  numberMessagesToSend?: number

  /** Last-read timestamp — opens the list at the first unread message. */
  lastReadIso?: string

  /** Host renderer for a tool call until `ToolCallCard`'s native peer lands. */
  renderToolCall?: (args: {
    toolCall: ToolCallLike
    result?: unknown
    resultType?: ToolResultTypeLike
    durationMs?: number
  }) => ReactNode

  onResolveFile?: (token: string) => UikitFileMeta | null
  renderDependency?: (dep: string) => ReactNode
  /** Route an in-app `overseer://…` resource link. Forwarded to MessageList (F.2). */
  onResourceLink?: (link: ResourceLink) => void
  /** Render the workspace-diff panel for a CLI-agent reply. Forwarded to MessageList. */
  renderCliRunArtifact?: (runId: string) => ReactNode

  /** Fired when the user taps the per-message `$` usage chip. Host opens
   *  a `MessageUsageSheet` with the full breakdown. */
  onShowUsage?: (msg: ChatMessageLike) => void

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
   * `liveState.cliRunId` only knows about a send this session made, so a reload —
   * or a second client — would otherwise show a multi-minute turn with no live
   * transcript at all. Used as the fallback for the live run view.
   */
  activeCliRunId?: string

  onDeleteLastMessage?: () => Promise<void> | void
  onRetry?: () => Promise<void> | void
  /**
   * Re-run the chat's trailing user message — the agent runs again on the
   * conversation as it stands, with no copy of the message appended. Omit it
   * and no row offers a restart (e.g. an agent-run chat, or one whose run is
   * live).
   */
  onRestartTurn?: () => Promise<void> | void

  canSend?: boolean

  onAtBottomChange?: (atBottom: boolean) => void
  /** Fired with the latest visible message's ISO when the list returns to
   * the bottom — host advances per-chat read cursors. Matches web. */
  onReadLatest?: (iso?: string) => void
  scrollToBottomSignal?: number

  /** Caller-rendered content shown when the message list is empty (e.g. a call-to-action panel). */
  emptyStateContent?: ReactNode

  /**
   * Unified tool-approval grants (API + CLI) from `usePendingToolGrants`. Only
   * the `askUser` question grants are consumed here — they render inline above
   * the composer as question cards. Permission grants stay with the host's
   * `ToolConfirmationModal`.
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

  /** Forwarded to the inner `ChatInput`. */
  inputProps?: Omit<
    ChatInputProps,
    'value' | 'onChange' | 'onSend' | 'onAbort' | 'isThinking' | 'isConfigured'
  >
  inputValue: string
  onInputChange: (value: string) => void
}

export default function ChatBody({
  chatId,
  header,
  sendError,
  inputOverride,
  hideInput,
  messages,
  liveState,
  systemPrompt,
  systemPromptTimestamp,
  numberMessagesToSend,
  lastReadIso,
  renderToolCall,
  onResolveFile,
  renderDependency,
  onResourceLink,
  renderCliRunArtifact,
  onShowUsage,
  emptyStateContent,
  grants,
  credentialCaptures,
  onSubmitCredentialCapture,
  onCancelCredentialCapture,
  onSend,
  onAbort,
  isBusy,
  activeCliRunId,
  onDeleteLastMessage,
  onRetry,
  onRestartTurn,
  canSend = true,
  onAtBottomChange,
  onReadLatest,
  scrollToBottomSignal,
  inputProps,
  inputValue,
  onInputChange,
}: ChatBodyProps) {
  const { theme } = useNativeTheme()
  const questionGrants = useMemo(() => partitionGrants(grants).questions, [grants])
  // A lone launch approval takes the composer's place — see the web ChatBody.
  const launchGrant = useMemo(() => soleLaunchGrant(grants), [grants])
  const [launchDismissedId, setLaunchDismissedId] = useState<string | null>(null)
  const showLaunchPanel = launchGrant !== null && launchGrant.id !== launchDismissedId
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
    (toolCall: ToolCallLike) => {
      const capture = captureBinding.byToolCallId[toolCall.toolCallId]
      return capture ? renderCaptureCard(capture) : undefined
    },
    [captureBinding, renderCaptureCard],
  )
  // While a CLI run streams, show the live Agent-run panel for its runId instead
  // of the raw-text pending bubble (which flashed into the final message). Falls
  // back to the run the SERVER reports for this chat, so a reload keeps watching
  // a turn this session never started.
  const cliRunId = liveState.cliRunId ?? activeCliRunId
  // Everything the active run is parked on — permission grants AND questions.
  // Both stop the agent dead, so both belong on the live activity line.
  const cliBlockedOn = useMemo(() => blockedOnFromGrants(grants), [grants])
  const pending =
    !cliRunId && liveState.pendingAssistant
      ? { role: 'assistant' as const, content: liveState.pendingAssistant.content }
      : null

  const handleSend: ChatInputProps['onSend'] = async (text, attachments) => {
    await onSend(text, attachments)
  }
  const handleAbort = onAbort
    ? () => {
        void onAbort()
      }
    : undefined

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface.base }}>
      {header}
      <View style={{ flex: 1 }}>
        <MessageList
          isBusy={isBusy}
          chatId={chatId}
          messages={messages}
          isThinking={liveState.isSending && !cliRunId}
          isSending={liveState.isSending}
          pending={pending}
          pendingCliRunId={cliRunId}
          pendingCliModel={liveState.cliModel ?? undefined}
          pendingCliStartedAt={liveState.cliStartedAt ?? undefined}
          cliBlockedOn={cliBlockedOn}
          systemPrompt={systemPrompt}
          systemPromptTimestamp={systemPromptTimestamp}
          numberMessagesToSend={numberMessagesToSend}
          lastReadIso={lastReadIso}
          renderToolCall={renderToolCall}
          renderToolRowOverride={renderToolRowOverride}
          onResolveFile={onResolveFile}
          renderDependency={renderDependency}
          onResourceLink={onResourceLink}
          renderCliRunArtifact={renderCliRunArtifact}
          onShowUsage={onShowUsage}
          emptyStateContent={emptyStateContent}
          onDeleteLastMessage={onDeleteLastMessage ? () => void onDeleteLastMessage() : undefined}
          onRetry={onRetry ? () => void onRetry() : undefined}
          onRestartTurn={onRestartTurn ? () => void onRestartTurn() : undefined}
          onAtBottomChange={onAtBottomChange}
          onReadLatest={onReadLatest}
          scrollToBottomSignal={scrollToBottomSignal}
        />
      </View>
      {sendError && (
        <View style={{ paddingHorizontal: nativeSpace[5], paddingTop: nativeSpace[3] }}>
          <Alert variant="error">{sendError.message}</Alert>
        </View>
      )}
      {questionGrants.length > 0 && (
        <View
          style={{
            paddingHorizontal: nativeSpace[5],
            paddingTop: nativeSpace[3],
            gap: nativeSpace[2],
          }}
        >
          {questionGrants.map((grant) => (
            <AgentQuestionCard key={grant.id} grant={grant} />
          ))}
        </View>
      )}
      {/* Captures with no tool row of their own here — most often one opened by
          a CLI run, whose transcript renders itself. They still have to be
          answerable, or the agent waits on a form nobody can see. */}
      {captureBinding.unbound.length > 0 && (
        <View
          style={{
            paddingHorizontal: nativeSpace[5],
            paddingTop: nativeSpace[3],
            gap: nativeSpace[2],
          }}
        >
          {captureBinding.unbound.map(renderCaptureCard)}
        </View>
      )}
      {hideInput ? null : showLaunchPanel ? (
        <LaunchApprovalPanel
          grant={launchGrant!}
          onDecideLater={() => setLaunchDismissedId(launchGrant!.id)}
        />
      ) : (
        (inputOverride ?? (
          <ChatInput
            {...(inputProps ?? {})}
            value={inputValue}
            onChange={onInputChange}
            onSend={handleSend}
            onAbort={handleAbort}
            isThinking={isBusy ?? liveState.isSending}
            isConfigured={canSend}
          />
        ))
      )}
    </View>
  )
}
