import type { ReactNode } from 'react'
import { View } from 'react-native'
import Alert from '../../primitives/Alert'
import ChatInput, { type ChatInputProps } from './ChatInput'
import MessageList from './MessageList'
import type { UikitFileMeta } from '../files/FileDisplay'
import type {
  ChatLiveStateLike,
  ChatMessageLike,
  ToolCallLike,
  ToolResultTypeLike,
} from '../../../headless/utils/chatTypes'
import { nativeLightTheme, nativeSpace } from '../../../tokens/native'

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

  /** Host renderer for a tool call until `ToolCallCard`'s native peer lands. */
  renderToolCall?: (args: {
    toolCall: ToolCallLike
    result?: unknown
    resultType?: ToolResultTypeLike
    durationMs?: number
  }) => ReactNode

  onResolveFile?: (token: string) => UikitFileMeta | null
  renderDependency?: (dep: string) => ReactNode

  onSend: (content: string, attachments?: string[]) => Promise<void> | void
  onAbort?: () => Promise<void> | void
  /** Tool-confirmation hooks are accepted for API parity with web; the
   * inline confirmation modal isn't shipped on RN yet. */
  onConfirmTools?: (grantedToolCallIds: string[]) => Promise<void> | void
  onCancelToolConfirmation?: () => void

  onDeleteLastMessage?: () => Promise<void> | void
  onRetry?: () => Promise<void> | void

  canSend?: boolean

  onAtBottomChange?: (atBottom: boolean) => void
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
  renderToolCall,
  onResolveFile,
  renderDependency,
  onSend,
  onAbort,
  onDeleteLastMessage,
  onRetry,
  canSend = true,
  onAtBottomChange,
  scrollToBottomSignal,
  inputProps,
  inputValue,
  onInputChange,
}: ChatBodyProps) {
  const pending = liveState.pendingAssistant
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
    <View style={{ flex: 1, backgroundColor: nativeLightTheme.surface.base }}>
      {header}
      <View style={{ flex: 1 }}>
        <MessageList
          chatId={chatId}
          messages={messages}
          isThinking={liveState.isSending}
          pending={pending}
          systemPrompt={systemPrompt}
          systemPromptTimestamp={systemPromptTimestamp}
          renderToolCall={renderToolCall}
          onResolveFile={onResolveFile}
          renderDependency={renderDependency}
          onDeleteLastMessage={onDeleteLastMessage ? () => void onDeleteLastMessage() : undefined}
          onRetry={onRetry ? () => void onRetry() : undefined}
          onAtBottomChange={onAtBottomChange}
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
