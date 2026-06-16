import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import Markdown from '../Markdown'
import RichText from '../files/RichText'
import FileDisplay, { type UikitFileMeta } from '../files/FileDisplay'
import Tooltip from '../../primitives/Tooltip'
import { IconDelete, IconRefresh, IconToolbox } from '../../icons'
import { ToolCallCard, type ToolCall, type ToolResultType } from './ToolCall'
import type { ChatMessageLike } from '../../../headless/utils/chatTypes'
import {
  cliDotColor,
  cliLabel,
  parseCliAgentModelTag,
  shortCliModelLabel,
} from '../../../headless/utils/cliRunner'

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

function formatFriendlyTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

function messageIso(m: ChatMessageLike | undefined): string | undefined {
  if (!m) return undefined
  return m.completedAt ?? m.startedAt
}

function CollapsibleContent({
  children,
  maxHeight = 600,
}: {
  children: ReactNode
  maxHeight?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [needsCollapse, setNeedsCollapse] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (!el) return
      setNeedsCollapse(el.scrollHeight > maxHeight + 8)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxHeight])

  return (
    <div className="flex flex-col">
      <div
        ref={containerRef}
        style={{
          maxHeight: expanded ? 'none' : `${maxHeight}px`,
          overflow: expanded ? 'auto' : 'hidden',
        }}
      >
        {children}
      </div>
      {needsCollapse ? (
        <button
          type="button"
          className="self-end mt-2 inline-flex items-center justify-center rounded border border-(--border-subtle) bg-(--surface-overlay) text-(--text-secondary) hover:bg-(--surface-raised) text-[12px] px-3 py-1.5"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  )
}

function safeNumber(n: unknown): number {
  return typeof n === 'number' && isFinite(n) ? n : 0
}

function UsageChip({ message }: { message: ChatMessageLike }) {
  const usage = message.usage
  if (!usage) return null
  const cost = typeof usage.cost === 'number' ? usage.cost : undefined
  const promptTokens = safeNumber(usage.promptTokens)
  const completionTokens = safeNumber(usage.completionTokens)
  const cachedReadInputTokens = safeNumber(
    (usage as unknown as { cachedReadInputTokens?: number }).cachedReadInputTokens,
  )
  const cacheRatio = cachedReadInputTokens / Math.max(1, promptTokens + cachedReadInputTokens)

  const tooltipContent = (
    <div className="min-w-[220px] text-xs text-(--text-primary)">
      <div className="font-semibold mb-2">Message usage</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-(--text-secondary)">Cost</span>
          <span>{cost != null ? USD.format(cost) : '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-(--text-secondary)">Input</span>
          <span>{Math.round(promptTokens).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-(--text-secondary)">Output</span>
          <span>{Math.round(completionTokens).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-(--text-secondary)">Cached read</span>
          <span>{Math.round(cachedReadInputTokens).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-(--text-secondary)">Cache ratio</span>
          <span>{Math.round(cacheRatio * 100).toLocaleString()}%</span>
        </div>
      </div>
    </div>
  )

  return (
    <Tooltip content={tooltipContent} placement="top" delayMs={150}>
      <button
        type="button"
        className="text-[11px] text-(--text-secondary) inline-flex items-center gap-1 border border-(--border-subtle) bg-(--surface-overlay) rounded-full px-2 py-[2px] hover:bg-(--surface-raised) transition-colors"
        aria-label="Show message usage"
      >
        <span className="font-medium">$</span>
      </button>
    </Tooltip>
  )
}

export type MessageRowProps = {
  msg: ChatMessageLike & { showModel?: boolean; isFirstInGroup?: boolean }
  globalIndex: number
  totalMessages: number
  isThinking: boolean
  isLast: boolean
  prevUserMessagesLen: number
  enhancedTotalLength: number

  renderToolResult?: (args: {
    toolCall: ToolCall
    result?: unknown
    resultType?: ToolResultType
    sideBySide?: boolean
  }) => ReactNode
  getToolHeaderPath?: (toolCall: ToolCall) => string | undefined

  onDeleteLastMessage?: () => void
  onRetry?: () => void

  /** Resolve an `@<path>` inline file mention to file metadata. Host wires
   * this against its FilesContext-equivalent so user bubbles render the
   * referenced file chip instead of a "not found" placeholder. */
  onResolveFile?: (token: string) => UikitFileMeta | null
  /** Render an inline `#<id>` reference. Host wires this against its
   * StoriesContext-equivalent. */
  renderDependency?: (dep: string) => ReactNode
  /** Render the workspace-diff panel for a CLI-agent reply (`msg.cliRunId`).
   * Host binds it to the chat's project (e.g. `CliRunArtifactPanel`). */
  renderCliRunArtifact?: (runId: string) => ReactNode

  // ----- Inline tool-confirmation flow (forwarded to ToolCallCard) -----
  /** Pre-applied preview (if any) for `require_confirmation` write tools. */
  toolPreview?: unknown
  /** When true, the tool card shows a checkbox in an active confirmation batch. */
  toolSelectable?: boolean
  /** When true, the checkbox is checked. */
  toolSelected?: boolean
  /** When true, the checkbox is shown but disabled. */
  toolDisabled?: boolean
  onToggleToolSelect?: () => void

  thinkingLabel?: string
  setLastMessageRef?: (el: HTMLDivElement | null) => void
}

function MessageRow({
  msg,
  globalIndex,
  isThinking,
  isLast,
  prevUserMessagesLen,
  enhancedTotalLength,
  renderToolResult,
  getToolHeaderPath,
  onDeleteLastMessage,
  onRetry,
  onResolveFile,
  renderDependency,
  renderCliRunArtifact,
  toolPreview,
  toolSelectable,
  toolSelected,
  toolDisabled,
  onToggleToolSelect,
  thinkingLabel,
  setLastMessageRef,
}: MessageRowProps) {
  const role = msg.role

  if (msg.error) {
    const showRetry = !!onRetry && isLast
    return (
      <div data-msg-idx={globalIndex} className="flex items-start gap-2">
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold bg-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)] text-(--text-primary) border border-(--border-subtle)"
          aria-hidden
        >
          AI
        </div>
        <div className="flex-1 max-w-[72%] min-w-[80px]">
          <div className="rounded-md border border-(--color-red-500) bg-(--color-red-50) dark:bg-(--color-red-900)/20 px-3 py-2 text-sm text-(--color-red-700) dark:text-(--color-red-300)">
            {String(msg.error)}
          </div>
        </div>
        {showRetry ? (
          <button
            type="button"
            onClick={() => onRetry?.()}
            disabled={isThinking}
            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-(--surface-hover)"
            aria-label="Retry the last action"
            title={isThinking ? 'Please wait…' : 'Retry the last action'}
          >
            <IconRefresh className="w-5 h-5 mt-4" />
          </button>
        ) : null}
      </div>
    )
  }

  const isSystem = role === 'system'
  const isUser = role === 'user'
  const isAssistant = role === 'assistant'
  const isTool = role === 'tool' || !!msg.toolCall

  const isNewUserBubble =
    isUser && globalIndex === enhancedTotalLength - 1 && globalIndex >= prevUserMessagesLen

  const shouldShowDelete = !!onDeleteLastMessage && isLast
  const iso = messageIso(msg)
  const ts = iso ? formatFriendlyTimestamp(iso) : ''
  const rawModel = msg.usage?.model ?? msg.model
  const rawModelStr = typeof rawModel === 'string' ? rawModel : rawModel?.model
  // CLI-agent messages persist their model as `cli-agent/<cli>/<modelId>`; show
  // the CLI brand dot + the model name (matching the model chip) rather than the
  // raw tag. API messages keep the accent dot + raw model id.
  const cliTag = parseCliAgentModelTag(rawModelStr)
  // Legacy tags (pre-model-id) put the auth mode in the last segment; treat
  // those as "no model" so old messages show the CLI label, not "auth-cache".
  const cliModelId =
    cliTag?.modelId && cliTag.modelId !== 'auth-cache' && cliTag.modelId !== 'api-key'
      ? cliTag.modelId
      : undefined
  const modelLabel = cliTag
    ? cliModelId
      ? shortCliModelLabel(cliModelId)
      : cliLabel(cliTag.cli)
    : rawModelStr
  const modelDotColor = cliTag ? cliDotColor(cliTag.cli) : undefined

  return (
    <div
      data-msg-idx={globalIndex}
      data-msg-role={role}
      data-msg-iso={iso || ''}
      ref={isLast ? setLastMessageRef : undefined}
    >
      <div
        className={['flex items-start gap-2', isUser ? 'flex-row-reverse' : 'flex-row'].join(' ')}
      >
        <div className="flex flex-col items-center group">
          <div
            className={[
              'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold',
              isUser
                ? 'bg-(--accent-primary) text-(--text-inverted)'
                : isSystem || isTool
                  ? 'bg-(--surface-overlay) text-(--text-primary) border border-(--border-subtle)'
                  : 'bg-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)] text-(--text-primary) border border-(--border-subtle)',
            ].join(' ')}
            aria-hidden
          >
            {isUser ? 'You' : isSystem || isTool ? <IconToolbox className="w-3.5 h-3.5" /> : 'AI'}
          </div>

          {shouldShowDelete ? (
            <button
              type="button"
              title="Delete last message"
              aria-label="Delete last message"
              className="mt-1 transition-opacity opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-6 h-6 rounded border border-(--border-subtle) bg-(--surface-raised) hover:bg-(--surface-hover)"
              onClick={() => onDeleteLastMessage?.()}
              disabled={isThinking}
            >
              <IconDelete className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <div
          className={[
            'min-w-0 flex flex-col',
            isUser ? 'max-w-[85%] items-end' : 'w-full items-start',
          ].join(' ')}
        >
          {isAssistant ? (
            <div className="w-full flex justify-between items-baseline gap-2 mb-1.5">
              <div className="inline-flex items-center gap-1 min-w-0">
                {msg.showModel && modelLabel ? (
                  <div className="text-[11px] text-(--text-secondary) inline-flex items-center gap-1 border border-(--border-subtle) bg-(--surface-overlay) rounded-full px-2 py-[2px] min-w-0">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full${modelDotColor ? '' : ' bg-(--accent-primary)'}`}
                      style={modelDotColor ? { backgroundColor: modelDotColor } : undefined}
                    />
                    <span className="truncate">{modelLabel}</span>
                  </div>
                ) : null}
                {msg.usage ? <UsageChip message={msg} /> : null}
              </div>
              {ts || thinkingLabel ? (
                <div className="text-[10px] leading-4 text-(--text-secondary) opacity-80 select-none flex items-baseline gap-1 whitespace-nowrap">
                  {thinkingLabel ? <span>{`+${thinkingLabel}`}</span> : null}
                  {thinkingLabel && ts ? <span>·</span> : null}
                  {ts ? <span>{ts}</span> : null}
                </div>
              ) : null}
            </div>
          ) : !isTool && ts ? (
            <div className="text-[10px] leading-4 text-(--text-secondary) opacity-80 select-none mb-1">
              {ts}
            </div>
          ) : null}

          {/* For a CLI agent message the run transcript renders ABOVE the prose:
              the tool steps are the work, and the assistant's reply is the
              conclusion at the end of the agent-run view. */}
          {isAssistant && msg.cliRunId && renderCliRunArtifact ? (
            <div className="w-full">{renderCliRunArtifact(msg.cliRunId)}</div>
          ) : null}

          {msg.content && !isTool ? (
            <div
              className={[
                isUser ? 'overflow-x-auto max-w-full' : 'w-full overflow-x-auto max-w-full',
                'px-3 py-1.5 rounded-2xl whitespace-pre-wrap break-words shadow',
                isUser
                  ? 'bg-(--accent-primary) text-(--text-inverted) rounded-br-md'
                  : isSystem
                    ? 'border bg-(--surface-overlay) text-(--text-primary) border-(--border-subtle)'
                    : 'bg-(--surface-raised) text-(--text-primary) border border-(--border-subtle) rounded-bl-md',
                msg.isFirstInGroup ? '' : isUser ? 'rounded-tr-md' : 'rounded-tl-md',
                isNewUserBubble ? 'animate-fade-in' : '',
                msg.cliRunId ? 'mt-2' : '',
              ].join(' ')}
            >
              {isUser ? (
                <CollapsibleContent maxHeight={600}>
                  <RichText
                    text={msg.content}
                    onResolveFile={onResolveFile}
                    renderDependency={renderDependency}
                  />
                </CollapsibleContent>
              ) : (
                <CollapsibleContent maxHeight={600}>
                  <Markdown text={msg.content} />
                </CollapsibleContent>
              )}
            </div>
          ) : null}

          {isTool && msg.toolCall ? (
            <div className="w-full">
              <ToolCallCard
                toolCall={msg.toolCall}
                result={msg.toolResult?.result}
                resultType={msg.toolResult?.type ?? (msg.error ? 'errored' : undefined)}
                durationMs={msg.toolResult?.durationMs ?? msg.durationMs}
                renderResult={renderToolResult}
                headerPath={getToolHeaderPath?.(msg.toolCall)}
                previewResult={toolPreview}
                selectable={toolSelectable}
                selected={toolSelected}
                onToggleSelect={onToggleToolSelect}
                disabled={toolDisabled}
              />
            </div>
          ) : null}

          {isUser &&
          Array.isArray((msg as unknown as { files?: string[] }).files) &&
          (msg as unknown as { files: string[] }).files.length > 0 ? (
            <div
              className={[
                'mt-1 flex flex-wrap gap-1',
                isUser ? 'justify-end' : 'justify-start',
              ].join(' ')}
            >
              {(msg as unknown as { files: string[] }).files.map((path, i) => {
                const name = path.split('/').pop() || path
                return (
                  <FileDisplay
                    key={`${globalIndex}-att-${i}-${path}`}
                    file={{ name, absolutePath: path, relativePath: path }}
                    density="compact"
                  />
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default memo(MessageRow)
