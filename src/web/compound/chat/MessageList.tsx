import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type UIEventHandler,
} from 'react'
import SystemPromptBubble from './SystemPromptBubble'
import ThinkingRow from './ThinkingRow'
import MessageRow from './MessageRow'
import { Switch } from '../../primitives/Switch'
import type { UikitFileMeta } from '../files/FileDisplay'
import type { ToolCall, ToolResultType } from './ToolCall'
import type { ChatMessageLike } from '../../../headless/utils/chatTypes'

function isToolMessage(msg: ChatMessageLike): boolean {
  return msg.role === 'tool' || !!msg.toolCall
}

function isEmptyAssistantMessage(msg: ChatMessageLike): boolean {
  if (msg.role !== 'assistant') return false
  if (!msg.content) return true
  return msg.content.trim().length === 0
}

function messageIso(m: ChatMessageLike | undefined): string | undefined {
  if (!m) return undefined
  return m.completedAt ?? m.startedAt
}

function lastMessageIso(messages: ChatMessageLike[]): string | undefined {
  if (messages.length === 0) return undefined
  return messageIso(messages[messages.length - 1])
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remSec = Math.round(seconds % 60)
  return `${minutes}m ${remSec}s`
}

export type MessageListProps = {
  /** Stable identifier — when it changes, the list resets scroll/visibility. */
  chatId?: string
  messages: ChatMessageLike[]
  isThinking?: boolean
  /** Stub for a streaming-pending assistant turn rendered as the last bubble. */
  pending?: { role: 'user' | 'assistant'; content: string } | null
  /** When the last user message exceeds this offset from the top, the list
   * shows a "Context cut-off" divider — matches desktop's
   * `numberMessagesToSend` setting. */
  numberMessagesToSend?: number

  /** Most-recent ISO timestamp seen by the user. Used to position scroll on
   * first open of a chat with unread messages and to highlight the first
   * unread bubble. */
  lastReadIso?: string
  onAtBottomChange?: (atBottom: boolean) => void
  onReadLatest?: (iso?: string) => void
  /** Bump this number to force the list to scroll to the bottom (used right
   * after the user sends a message). */
  scrollToBottomSignal?: number

  onDeleteLastMessage?: () => void
  onRetry?: () => void

  renderToolResult?: (args: {
    toolCall: ToolCall
    result?: unknown
    resultType?: ToolResultType
    sideBySide?: boolean
  }) => ReactNode
  getToolHeaderPath?: (toolCall: ToolCall) => string | undefined

  /** Resolve an `@<path>` inline file mention to file metadata. Forwarded
   * to each MessageRow's RichText so user bubbles render file chips. */
  onResolveFile?: (token: string) => UikitFileMeta | null
  /** Render an inline `#<id>` reference (story / feature). Forwarded to
   * MessageRow's RichText. */
  renderDependency?: (dep: string) => ReactNode

  // ----- Inline tool-confirmation flow (desktop parity) -----
  /** Host-supplied tool-preview fetcher — called for each
   * `require_confirmation` tool in the trailing batch so the user sees the
   * proposed diff/patch inside the hover card before granting. Result is
   * cached internally per `toolCallId`. Omit to disable preview fetching. */
  previewTool?: (toolCallId: string, toolName: string, args: unknown) => Promise<unknown>
  /** When the user clicks "Resume X/Y Tools", this fires with the
   * `toolCallId`s the user approved. Host wires it to the chats
   * resume-completion call. */
  onResumeTools?: (toolCallIds: string[]) => Promise<void> | void

  /** Caller-rendered empty-state. When omitted the list shows the default
   * "Start chatting" hint matching desktop. */
  emptyStateContent?: ReactNode
}

const DEFAULT_VISIBLE = 50
const BATCH_SIZE = 50
const NEAR_BOTTOM_PX = 80

export default function MessageList({
  chatId,
  messages,
  isThinking = false,
  pending = null,
  numberMessagesToSend,
  lastReadIso,
  onAtBottomChange,
  onReadLatest,
  scrollToBottomSignal,
  onDeleteLastMessage,
  onRetry,
  renderToolResult,
  getToolHeaderPath,
  onResolveFile,
  renderDependency,
  previewTool,
  onResumeTools,
  emptyStateContent,
}: MessageListProps) {
  const messageListRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const lastMessageRef = useRef<HTMLDivElement | null>(null)

  const enhancedMessages = useMemo(() => {
    type Enhanced = ChatMessageLike & { showModel?: boolean; isFirstInGroup?: boolean }
    const out: Enhanced[] = []
    let lastAssistantModel: unknown
    let lastRole: string | undefined
    for (const m of messages) {
      const role = m.role
      let showModel = false
      const rawModel = m.usage?.model ?? m.model
      if (role === 'assistant' && rawModel) {
        showModel = !lastAssistantModel || lastAssistantModel !== rawModel
        lastAssistantModel = rawModel
      }
      const isFirstInGroup = !lastRole || lastRole !== role || role === 'system' || role === 'tool'
      lastRole = role
      out.push({ ...m, showModel, isFirstInGroup })
    }
    return out
  }, [messages])

  const systemPromptMessage =
    enhancedMessages.length === 1 && enhancedMessages[0].role === 'system'
      ? enhancedMessages[0]
      : undefined

  const messagesToDisplay = systemPromptMessage ? enhancedMessages.slice(1) : enhancedMessages

  const [visibleCount, setVisibleCount] = useState<number>(DEFAULT_VISIBLE)
  useEffect(() => {
    setVisibleCount(DEFAULT_VISIBLE)
  }, [chatId])

  const totalMessages = messagesToDisplay.length
  const startIndex = Math.max(0, totalMessages - visibleCount)
  const visibleMessages = useMemo(
    () => messagesToDisplay.slice(startIndex),
    [messagesToDisplay, startIndex],
  )
  const hiddenCountAbove = startIndex

  // User-bubble pop animation tracker.
  const prevUserMessagesLenRef = useRef<number>(messages.length)
  useEffect(() => {
    prevUserMessagesLenRef.current = messages.length
  }, [messages])

  // At-bottom tracking.
  const isAtBottomRef = useRef(true)
  const computeIsNearBottom = useCallback((): boolean => {
    const c = messageListRef.current
    if (!c) return true
    return c.scrollTop + c.clientHeight >= c.scrollHeight - NEAR_BOTTOM_PX
  }, [])

  // Track the last iso we already reported as read so we don't fire
  // `onReadLatest` repeatedly with the same value — that callback writes to
  // localStorage and broadcasts a CustomEvent that triggers re-renders in
  // every consumer of `useBadgeCounts`, which re-renders MessageList,
  // which re-runs this check, which fires onReadLatest again → infinite
  // loop ("Maximum update depth exceeded"). The previous transition-only
  // implementation accidentally avoided this; the fix is to advance the
  // marker on every new message while still being idempotent.
  const lastFiredReadIsoRef = useRef<string | undefined>(undefined)

  const updateAtBottomState = useCallback(() => {
    const nearBottom = computeIsNearBottom()
    if (nearBottom !== isAtBottomRef.current) {
      isAtBottomRef.current = nearBottom
      onAtBottomChange?.(nearBottom)
    }
    if (!nearBottom) return
    // Advance the last-read marker when at bottom AND the latest message
    // is actually newer than what we last reported. Streaming chats keep
    // the user pinned to the bottom (no transition fires), so this
    // catches every new message — but only once per iso.
    const latest = lastMessageIso(messages)
    if (!latest) return
    if (lastFiredReadIsoRef.current === latest) return
    lastFiredReadIsoRef.current = latest
    onReadLatest?.(latest)
  }, [computeIsNearBottom, messages, onAtBottomChange, onReadLatest])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const c = messageListRef.current
    if (!c) return
    c.scrollTo({ top: Math.max(0, c.scrollHeight - c.clientHeight), behavior })
  }, [])

  const handleScroll: UIEventHandler<HTMLDivElement> = () => {
    updateAtBottomState()
  }

  // Last-unread positioning on chat open.
  const lastMessageIsoMemo = useMemo(() => lastMessageIso(messagesToDisplay), [messagesToDisplay])
  const hasUnreadOnOpen = useMemo(() => {
    if (!lastReadIso || !lastMessageIsoMemo) return false
    return lastMessageIsoMemo.localeCompare(lastReadIso) > 0
  }, [lastReadIso, lastMessageIsoMemo])

  const lastUnreadIndex = useMemo(() => {
    if (!hasUnreadOnOpen || !lastReadIso) return null
    for (let i = messagesToDisplay.length - 1; i >= 0; i--) {
      const iso = messageIso(messagesToDisplay[i])
      if (iso && iso.localeCompare(lastReadIso) > 0) return i
    }
    return null
  }, [messagesToDisplay, hasUnreadOnOpen, lastReadIso])

  const positionedChatIdRef = useRef<string | undefined>(undefined)
  useLayoutEffect(() => {
    const container = messageListRef.current
    if (!container) return
    if (chatId && positionedChatIdRef.current === chatId) return
    positionedChatIdRef.current = chatId

    const openAtBottom = () => {
      scrollToBottom('auto')
      updateAtBottomState()
    }
    if (!messagesToDisplay.length) return openAtBottom()
    if (!lastReadIso || !hasUnreadOnOpen) return openAtBottom()

    if (typeof lastUnreadIndex === 'number') {
      const target = container.querySelector(
        `[data-msg-idx='${lastUnreadIndex}']`,
      ) as HTMLElement | null
      if (target) {
        const headroom = Math.floor(container.clientHeight * 0.3)
        const top = Math.max(0, target.offsetTop - headroom)
        container.scrollTo({ top, behavior: 'auto' })
        updateAtBottomState()
        return
      }
    }
    openAtBottom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId])

  // Auto-scroll only when near bottom (matches desktop's behavior).
  const prevLenForScrollRef = useRef<number>(messages.length)
  useEffect(() => {
    const prev = prevLenForScrollRef.current
    const increased = messages.length > prev
    prevLenForScrollRef.current = messages.length
    if (!increased) return

    if (!computeIsNearBottom()) {
      updateAtBottomState()
      return
    }
    if (isThinking) {
      requestAnimationFrame(() => {
        scrollToBottom('auto')
        updateAtBottomState()
      })
      return
    }
    const lastNow = messages[messages.length - 1]
    if (lastNow && lastNow.role === 'user') {
      requestAnimationFrame(() => {
        scrollToBottom('smooth')
        updateAtBottomState()
      })
      return
    }
    requestAnimationFrame(() => {
      const c = messageListRef.current
      if (!c) return
      if (!computeIsNearBottom()) {
        updateAtBottomState()
        return
      }
      const revealPadding = 24
      const lastEl = lastMessageRef.current
      let targetTop = c.scrollHeight - c.clientHeight - revealPadding
      if (lastEl) targetTop = lastEl.offsetTop - (c.clientHeight - revealPadding)
      if (targetTop < 0) targetTop = 0
      c.scrollTo({ top: targetTop, behavior: 'smooth' })
      updateAtBottomState()
    })
  }, [messages, isThinking, scrollToBottom, computeIsNearBottom, updateAtBottomState])

  // Explicit scroll-to-bottom signal (used after the user hits send).
  const prevSignalRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (typeof scrollToBottomSignal === 'undefined') return
    if (prevSignalRef.current === undefined) {
      prevSignalRef.current = scrollToBottomSignal
      return
    }
    if (scrollToBottomSignal !== prevSignalRef.current) {
      prevSignalRef.current = scrollToBottomSignal
      if (!computeIsNearBottom()) {
        updateAtBottomState()
        return
      }
      requestAnimationFrame(() => {
        scrollToBottom('smooth')
        updateAtBottomState()
      })
    }
  }, [scrollToBottomSignal, scrollToBottom, computeIsNearBottom, updateAtBottomState])

  // Content-resize → re-anchor to bottom when near-bottom.
  useEffect(() => {
    const container = messageListRef.current
    const content = contentRef.current
    if (!container || !content) return
    const ro = new ResizeObserver(() => {
      if (!computeIsNearBottom()) return
      scrollToBottom('auto')
      updateAtBottomState()
    })
    ro.observe(content)
    return () => ro.disconnect()
  }, [computeIsNearBottom, scrollToBottom, updateAtBottomState])

  // Limit system bubble to ~half the viewport so it never floods the canvas.
  const [systemMaxHeight, setSystemMaxHeight] = useState<number | undefined>(undefined)
  useEffect(() => {
    const container = messageListRef.current
    if (!container) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        setSystemMaxHeight(Math.max(0, Math.floor(h * 0.5)))
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Cutoff index for the context divider.
  const cutoffIndex = useMemo(() => {
    if (!numberMessagesToSend || numberMessagesToSend < 1) return null
    if (totalMessages <= numberMessagesToSend) return null
    let totalCount = 0
    let logicalCount = 0
    let isInGroup = false
    for (let i = totalMessages - 1; i > 0; i--) {
      const m = messagesToDisplay[i]
      if (!(isToolMessage(m) || isEmptyAssistantMessage(m))) {
        if (logicalCount >= numberMessagesToSend) break
        isInGroup = false
        logicalCount++
      } else {
        if (!isInGroup) {
          if (logicalCount >= numberMessagesToSend) break
          logicalCount++
        }
        isInGroup = true
      }
      totalCount++
    }
    return totalMessages - totalCount
  }, [messagesToDisplay, numberMessagesToSend, totalMessages])
  const cutoffIndexInWindow = useMemo(() => {
    if (cutoffIndex === null) return null
    const local = cutoffIndex - startIndex
    return local >= 0 && local < visibleMessages.length ? local : null
  }, [cutoffIndex, startIndex, visibleMessages.length])

  // ----- Inline tool-confirmation flow (desktop parity) -----
  // Identify the trailing contiguous batch of `tool` messages whose result
  // type is `require_confirmation` / `pending` / `running` — these are
  // the proposals the user can grant or deny inline.
  const pendingTail = useMemo(() => {
    const msgs = messagesToDisplay
    let end = msgs.length - 1
    while (end >= 0 && msgs[end].role !== 'tool') end--
    if (end < 0) return { start: -1, end: -1, ids: [] as string[] }
    let start = end
    while (
      start >= 0 &&
      msgs[start].role === 'tool' &&
      (msgs[start].toolResult?.type === 'require_confirmation' ||
        msgs[start].toolResult?.type === 'pending' ||
        msgs[start].toolResult?.type === 'running')
    ) {
      start--
    }
    start += 1
    if (start > end) return { start: -1, end: -1, ids: [] as string[] }
    const ids: string[] = []
    for (let i = start; i <= end; i++) {
      const id = String(msgs[i].toolCall?.toolCallId ?? '')
      if (id) ids.push(id)
    }
    return { start, end, ids }
  }, [messagesToDisplay])
  // Only `require_confirmation` / `not_allowed` tools in the tail are
  // grantable via checkbox; `pending` / `running` are read-only.
  const confirmableIds = useMemo(() => {
    const set = new Set<string>()
    for (let i = pendingTail.start; i >= 0 && i <= pendingTail.end; i++) {
      const m = messagesToDisplay[i]
      if (m.role !== 'tool') continue
      const type = m.toolResult?.type
      if (!(type === 'require_confirmation' || type === 'not_allowed')) continue
      const id = String(m.toolCall?.toolCallId ?? '')
      if (id) set.add(id)
    }
    return set
  }, [messagesToDisplay, pendingTail.start, pendingTail.end])

  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
  // Reset selection when the chat changes or the message list changes.
  useEffect(() => {
    setSelectedToolIds([])
  }, [chatId, messagesToDisplay.length])
  const toggleToolSelected = useCallback(
    (id: string) => {
      if (!id) return
      setSelectedToolIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      )
    },
    [],
  )

  // Pre-applied preview cache for `require_confirmation` tools.
  const [toolPreviewById, setToolPreviewById] = useState<Record<string, unknown>>({})
  const toolPreviewByIdRef = useRef<Record<string, unknown>>({})
  useEffect(() => {
    toolPreviewByIdRef.current = toolPreviewById
  }, [toolPreviewById])
  useEffect(() => {
    setToolPreviewById({})
    toolPreviewByIdRef.current = {}
  }, [chatId])
  useEffect(() => {
    if (!previewTool) return
    if (pendingTail.start < 0) return
    for (let i = pendingTail.start; i <= pendingTail.end; i++) {
      const m = messagesToDisplay[i]
      if (m.role !== 'tool') continue
      if (m.toolResult?.type !== 'require_confirmation') continue
      const toolCallId = String(m.toolCall?.toolCallId ?? '')
      const toolName = String(m.toolCall?.name ?? '')
      if (!toolCallId || !toolName) continue
      if (toolPreviewByIdRef.current[toolCallId] !== undefined) continue
      toolPreviewByIdRef.current = {
        ...toolPreviewByIdRef.current,
        [toolCallId]: { status: 'pending' },
      }
      setToolPreviewById((prev) => ({ ...prev, [toolCallId]: { status: 'pending' } }))
      ;(async () => {
        try {
          const res = await previewTool(toolCallId, toolName, m.toolCall?.arguments)
          if (res && typeof res === 'object' && (res as { type?: string }).type === 'not_supported') {
            return
          }
          const patch = typeof res === 'string' ? res : JSON.stringify(res, null, 2)
          const ready = { status: 'ready' as const, patch }
          toolPreviewByIdRef.current = { ...toolPreviewByIdRef.current, [toolCallId]: ready }
          setToolPreviewById((prev) => ({ ...prev, [toolCallId]: ready }))
        } catch (e) {
          const err = { status: 'error' as const, error: String((e as Error)?.message || e) }
          toolPreviewByIdRef.current = { ...toolPreviewByIdRef.current, [toolCallId]: err }
          setToolPreviewById((prev) => ({ ...prev, [toolCallId]: err }))
        }
      })()
    }
  }, [previewTool, messagesToDisplay, pendingTail.start, pendingTail.end])

  const selectedCount = selectedToolIds.filter((id) => confirmableIds.has(id)).length
  const allSelected =
    selectedCount > 0 && Array.from(confirmableIds).every((id) => selectedToolIds.includes(id))
  const toggleAllSelected = useCallback(
    (checked: boolean) => {
      setSelectedToolIds((prev) => {
        const confirmable = Array.from(confirmableIds)
        if (checked) return Array.from(new Set([...prev, ...confirmable]))
        return prev.filter((id) => !confirmable.includes(id))
      })
    },
    [confirmableIds],
  )

  return (
    <div
      ref={messageListRef}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4"
      onScroll={handleScroll}
    >
      {systemPromptMessage ? (
        <SystemPromptBubble
          content={systemPromptMessage.content}
          timestamp={systemPromptMessage.startedAt}
          maxHeight={systemMaxHeight}
        />
      ) : null}

      {(enhancedMessages.length === 0 || systemPromptMessage !== undefined) && !isThinking
        ? (emptyStateContent ?? (
            <div className="mt-10 mx-auto max-w-[720px] text-center text-(--text-secondary)">
              <div className="text-[18px] font-medium">Start chatting about the project</div>
              <div className="mt-4 inline-block rounded-lg border border-(--border-default) bg-(--surface-raised) px-4 py-3 text-[13px]">
                Attach text files to give context
                <br />
                Mention files with @<br />
                Reference stories/features with #
              </div>
            </div>
          ))
        : null}

      <div ref={contentRef} className="w-full space-y-3">
        {hiddenCountAbove > 0 && (
          <div className="relative my-2 flex items-center justify-center gap-2">
            <div className="text-xs text-(--text-secondary) bg-(--surface-overlay) border border-(--border-subtle) rounded-full px-3 py-1 shadow">
              {hiddenCountAbove} older message{hiddenCountAbove === 1 ? '' : 's'} hidden
            </div>
            <button
              type="button"
              className="text-[12px] rounded border border-(--border-subtle) bg-(--surface-raised) text-(--text-primary) px-3 py-1.5 hover:bg-(--surface-hover)"
              onClick={() => setVisibleCount((c) => Math.min(totalMessages, c + BATCH_SIZE))}
            >
              Load more
            </button>
          </div>
        )}

        {visibleMessages.map((msg, index) => {
          const globalIndex = startIndex + index
          const showCutoff = cutoffIndexInWindow !== null && index === cutoffIndexInWindow
          const isLast = globalIndex === messagesToDisplay.length - 1

          const prevIso =
            globalIndex > 0 ? messageIso(messagesToDisplay[globalIndex - 1]) : undefined
          const curIso = messageIso(msg)
          const thinkingLabel =
            msg.role === 'assistant' && prevIso && curIso
              ? formatDurationMs(new Date(curIso).getTime() - new Date(prevIso).getTime())
              : undefined

          return (
            <div key={globalIndex}>
              {showCutoff ? (
                <div
                  className="relative text-center my-4 group"
                  title={
                    numberMessagesToSend
                      ? `Context cut-off: messages below are included in the next request. With your settings, your new message and ${numberMessagesToSend - 1} previous messages will be sent.`
                      : ''
                  }
                >
                  <hr className="border-dashed border-(--border-subtle)" />
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 bg-(--surface-base) text-xs text-(--text-secondary) whitespace-nowrap">
                    Context from here on
                  </span>
                </div>
              ) : null}

              <MessageRow
                msg={msg}
                globalIndex={globalIndex}
                totalMessages={totalMessages}
                isThinking={isThinking}
                isLast={isLast}
                prevUserMessagesLen={prevUserMessagesLenRef.current}
                enhancedTotalLength={enhancedMessages.length}
                onDeleteLastMessage={onDeleteLastMessage}
                onRetry={onRetry}
                renderToolResult={renderToolResult}
                getToolHeaderPath={getToolHeaderPath}
                onResolveFile={onResolveFile}
                renderDependency={renderDependency}
                toolPreview={
                  msg.role === 'tool' && msg.toolCall?.toolCallId
                    ? toolPreviewById[String(msg.toolCall.toolCallId)]
                    : undefined
                }
                toolSelectable={
                  msg.role === 'tool' &&
                  !!msg.toolCall?.toolCallId &&
                  confirmableIds.has(String(msg.toolCall.toolCallId))
                }
                toolSelected={
                  msg.role === 'tool' &&
                  !!msg.toolCall?.toolCallId &&
                  selectedToolIds.includes(String(msg.toolCall.toolCallId))
                }
                toolDisabled={
                  msg.role === 'tool' &&
                  !!msg.toolCall?.toolCallId &&
                  !confirmableIds.has(String(msg.toolCall.toolCallId)) &&
                  pendingTail.ids.includes(String(msg.toolCall.toolCallId))
                }
                onToggleToolSelect={
                  msg.role === 'tool' && msg.toolCall?.toolCallId
                    ? () => toggleToolSelected(String(msg.toolCall!.toolCallId))
                    : undefined
                }
                thinkingLabel={thinkingLabel}
                setLastMessageRef={(el) => {
                  lastMessageRef.current = el
                }}
              />
            </div>
          )
        })}

        {/* Inline confirmation footer — desktop's "Toggle all + Resume X/Y Tools". */}
        {onResumeTools && pendingTail.ids.length > 0 && confirmableIds.size > 0 ? (
          <div className="pt-1 flex items-center justify-between">
            {confirmableIds.size > 1 ? (
              <div className="flex items-center gap-2 text-[12px] text-(--text-secondary)">
                <span>Toggle all</span>
                <Switch checked={allSelected} onCheckedChange={(c) => toggleAllSelected(c)} />
              </div>
            ) : (
              <div />
            )}
            <button
              type="button"
              className={
                selectedCount > 0
                  ? 'inline-flex items-center rounded-md px-3 py-1.5 text-[12px] font-medium bg-green-600 hover:bg-green-700 text-white'
                  : 'inline-flex items-center rounded-md px-3 py-1.5 text-[12px] font-medium border border-(--border-subtle) bg-(--surface-overlay) text-(--text-secondary) cursor-not-allowed opacity-70'
              }
              disabled={selectedCount === 0}
              onClick={() => {
                const ok = selectedToolIds.filter((id) => confirmableIds.has(id))
                void onResumeTools(ok)
              }}
            >
              {`Resume ${selectedCount}/${confirmableIds.size} Tools`}
            </button>
          </div>
        ) : null}

        {pending?.role === 'assistant' ? (
          <MessageRow
            msg={{ role: 'assistant', content: pending.content }}
            globalIndex={messagesToDisplay.length}
            totalMessages={totalMessages + 1}
            isThinking={isThinking}
            isLast
            prevUserMessagesLen={prevUserMessagesLenRef.current}
            enhancedTotalLength={enhancedMessages.length + 1}
            renderToolResult={renderToolResult}
            getToolHeaderPath={getToolHeaderPath}
            onResolveFile={onResolveFile}
            renderDependency={renderDependency}
          />
        ) : null}
        {isThinking && !pending ? <ThinkingRow /> : null}
      </div>
    </div>
  )
}
