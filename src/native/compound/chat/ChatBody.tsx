import type { ReactNode } from 'react'
import { View } from 'react-native'
import Alert from '../../primitives/Alert'
import ChatInput, { type ChatInputProps } from './ChatInput'
import MessageList from './MessageList'
import type { UikitFileMeta } from '../files/FileDisplay'
import type { ResourceLink } from 'thefactory-tools/types'
import type {
  ChatLiveStateLike,
  ChatMessageLike,
  ToolCallLike,
  ToolResultTypeLike,
} from '../../../headless/utils/chatTypes'
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

  onDeleteLastMessage?: () => Promise<void> | void
  onRetry?: () => Promise<void> | void

  canSend?: boolean

  onAtBottomChange?: (atBottom: boolean) => void
  /** Fired with the latest visible message's ISO when the list returns to
   * the bottom — host advances per-chat read cursors. Matches web. */
  onReadLatest?: (iso?: string) => void
  scrollToBottomSignal?: number

  /** Caller-rendered empty-state — currently unused on RN (MessageList is
   * always present); accepted for API parity. */
  emptyStateContent?: ReactNode

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
  onSend,
  onAbort,
  onDeleteLastMessage,
  onRetry,
  canSend = true,
  onAtBottomChange,
  onReadLatest,
  scrollToBottomSignal,
  inputProps,
  inputValue,
  onInputChange,
}: ChatBodyProps) {
  const { theme } = useNativeTheme()
  // While a CLI run streams, show the live Agent-run panel for its runId instead
  // of the raw-text pending bubble (which flashed into the final message).
  const cliRunId = liveState.cliRunId ?? undefined
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
          chatId={chatId}
          messages={messages}
          isThinking={liveState.isSending && !cliRunId}
          pending={pending}
          pendingCliRunId={cliRunId}
          pendingCliModel={liveState.cliModel ?? undefined}
          pendingCliStartedAt={liveState.cliStartedAt ?? undefined}
          systemPrompt={systemPrompt}
          systemPromptTimestamp={systemPromptTimestamp}
          numberMessagesToSend={numberMessagesToSend}
          lastReadIso={lastReadIso}
          renderToolCall={renderToolCall}
          onResolveFile={onResolveFile}
          renderDependency={renderDependency}
          onResourceLink={onResourceLink}
          renderCliRunArtifact={renderCliRunArtifact}
          onShowUsage={onShowUsage}
          onDeleteLastMessage={onDeleteLastMessage ? () => void onDeleteLastMessage() : undefined}
          onRetry={onRetry ? () => void onRetry() : undefined}
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
      {inputOverride ?? (
        <ChatInput
          {...(inputProps ?? {})}
          value={inputValue}
          onChange={onInputChange}
          onSend={handleSend}
          onAbort={handleAbort}
          isThinking={liveState.isSending}
          isConfigured={canSend}
        />
      )}
    </View>
  )
}
