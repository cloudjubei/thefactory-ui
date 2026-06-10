import { useMemo, type ReactNode } from 'react'
import Alert from '../../primitives/Alert'
import ChatInput, { type ChatInputProps } from './ChatInput'
import MessageList from './MessageList'
import ToolConfirmationModal from './ToolConfirmationModal'
import type { UikitFileMeta } from '../files/FileDisplay'
import type { ToolCall, ToolResultType } from './ToolCall'
import type {
  ChatLiveStateLike,
  ChatMessageLike,
  PendingToolConfirmationLike,
  PendingToolGrant,
} from '../../../headless/utils/chatTypes'

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
  /** Render the workspace-diff panel for a CLI-agent reply. Forwarded to MessageList. */
  renderCliRunArtifact?: (runId: string) => ReactNode

  // Send / abort / confirm — wired to the host's ChatsContext.
  onSend: (content: string, attachments?: string[]) => Promise<void> | void
  onAbort?: () => Promise<void> | void
  onConfirmTools: (grantedToolCallIds: string[]) => Promise<void> | void
  onCancelToolConfirmation: () => void
  /**
   * Unified tool-approval grants (API + CLI). When provided, the confirmation
   * modal renders these per-grant (with the CLI-only "allow permanently"
   * option) instead of the {@link onConfirmTools} batch path. Host computes them
   * via `usePendingToolGrants`.
   */
  grants?: PendingToolGrant[]

  onDeleteLastMessage?: () => Promise<void> | void
  onRetry?: () => Promise<void> | void

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
  messages,
  liveState,
  renderToolResult,
  getToolHeaderPath,
  onResolveFile,
  renderDependency,
  renderCliRunArtifact,
  onSend,
  onAbort,
  onConfirmTools,
  onCancelToolConfirmation,
  onDeleteLastMessage,
  onRetry,
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
  inputProps,
  inputValue,
  onInputChange,
}: ChatBodyProps) {
  const { isSending, pendingAssistant, pendingToolConfirmation } = liveState
  const pendingForList = useMemo(
    () =>
      pendingAssistant
        ? { role: 'assistant' as const, content: pendingAssistant.content || '…' }
        : null,
    [pendingAssistant],
  )

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-(--surface-base)">
      {header}

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <MessageList
          chatId={chatId}
          messages={messages}
          isThinking={isSending && !pendingAssistant}
          pending={pendingForList}
          renderToolResult={renderToolResult}
          getToolHeaderPath={getToolHeaderPath}
          onResolveFile={onResolveFile}
          renderDependency={renderDependency}
          renderCliRunArtifact={renderCliRunArtifact}
          numberMessagesToSend={numberMessagesToSend}
          lastReadIso={lastReadIso}
          onAtBottomChange={onAtBottomChange}
          onReadLatest={onReadLatest}
          scrollToBottomSignal={scrollToBottomSignal}
          onDeleteLastMessage={onDeleteLastMessage ? () => void onDeleteLastMessage() : undefined}
          onRetry={onRetry ? () => void onRetry() : undefined}
          previewTool={previewTool}
          onResumeTools={onResumeTools}
          emptyStateContent={emptyStateContent}
        />
      </div>

      {sendError ? (
        <div className="px-4 py-2 shrink-0">
          <Alert>{sendError.message}</Alert>
        </div>
      ) : null}

      {inputOverride ? (
        inputOverride
      ) : (
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSend={(content, attachments) => onSend(content, attachments)}
          onAbort={onAbort ? () => void onAbort() : undefined}
          isThinking={isSending}
          isConfigured={canSend}
          clearOnSend
          {...inputProps}
        />
      )}

      <ToolConfirmationModal
        pending={pendingToolConfirmation as PendingToolConfirmationLike | null}
        grants={grants}
        busy={isSending}
        onConfirm={onConfirmTools}
        onCancel={onCancelToolConfirmation}
      />
    </div>
  )
}
