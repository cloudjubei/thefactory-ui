import { memo, useMemo, useState, type ReactNode } from 'react'
import Code from '../../Code'
import Tooltip from '../../../primitives/Tooltip'
import { IconChevron } from '../../../icons'
import StatusIcon, { StatusPill } from './StatusIcon'
import ToolCallHoverCard from './ToolCallHoverCard'
import type { ToolCall, ToolResultType } from './types'

export type ToolCallCardProps = {
  toolCall: ToolCall
  result?: unknown
  resultType?: ToolResultType
  durationMs?: number
  /**
   * Optional pluggable result renderer. The card itself stays renderer-
   * agnostic; consumers (web, desktop) pass a registry that maps the
   * tool name to a custom React node. When omitted, the card falls back
   * to a JSON dump of the result inside `<Code>`.
   *
   * Same signature is forwarded to the hover card so the rich preview
   * uses the same registry.
   */
  renderResult?: (args: {
    toolCall: ToolCall
    result?: unknown
    resultType?: ToolResultType
  }) => ReactNode
  /**
   * Optional path/headline shown under the tool name (e.g. the file the
   * tool operates on). Renderers in web compute this from arguments via
   * `getToolHeaderPath`; the card itself doesn't know the schema.
   */
  headerPath?: string

  // ----- Inline tool-confirmation flow (mirrors desktop) -----

  /** Pre-applied preview for `require_confirmation` write tools — host
   * supplies it via `MessageList.previewTool`. When `selectable` is true
   * and a preview is available it's forwarded to the hover card so the
   * user sees what the tool will do before granting it. */
  previewResult?: unknown
  /** When true, the card shows a checkbox the user can toggle to grant /
   * deny this specific tool inside an inline confirmation batch. */
  selectable?: boolean
  /** Whether the checkbox is checked. */
  selected?: boolean
  onToggleSelect?: () => void
  /** When true (typically for non-confirmable tools in a confirmation
   * batch), the checkbox is shown but disabled. */
  disabled?: boolean
}

function jsonString(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2)
  } catch {
    return String(v)
  }
}

function ToolCallCardInner({
  toolCall,
  result,
  resultType,
  durationMs,
  renderResult,
  headerPath,
  previewResult,
  selectable = false,
  selected = false,
  onToggleSelect,
  disabled = false,
}: ToolCallCardProps) {
  const [argsOpen, setArgsOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)

  const hasArgs = useMemo(() => {
    const a = toolCall.arguments
    if (!a) return false
    if (typeof a !== 'object') return true
    return Object.keys(a as object).length > 0
  }, [toolCall.arguments])

  const hasPopup = resultType !== 'aborted'
  const isRequireConfirm = resultType === 'require_confirmation'
  const detail =
    resultType === 'errored'
      ? { code: jsonString(result), language: 'text' as const, label: 'View error' }
      : resultType === 'success'
        ? { code: jsonString(result), language: 'json' as const, label: 'View result' }
        : null

  const anchorClassName = [
    'block w-full rounded-md border text-sm text-(--text-primary)',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/40',
    isRequireConfirm
      ? 'bg-teal-500/15 border-teal-500/60'
      : 'border-(--border-subtle) bg-(--surface-overlay)',
  ].join(' ')

  const body = (
    <>
      <div className="flex items-center justify-between px-3 pt-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon resultType={resultType} />
          <span className="font-semibold truncate">{toolCall.name}</span>
          {durationMs ? (
            <span className="text-xs text-(--text-secondary)">{durationMs}ms</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectable || disabled ? (
            <label
              className={`inline-flex items-center gap-1 text-[11px] ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect?.()}
                disabled={disabled}
                aria-label="Select this tool"
              />
            </label>
          ) : null}
          {hasArgs ? (
            <button
              type="button"
              className="p-1 rounded hover:bg-(--surface-raised)"
              onClick={(e) => {
                e.stopPropagation()
                setArgsOpen((v) => !v)
              }}
              aria-expanded={argsOpen}
              aria-label="Toggle arguments"
            >
              <IconChevron
                className="w-4 h-4 transition-transform"
                style={{ transform: `rotate(${argsOpen ? 90 : 0}deg)` }}
              />
            </button>
          ) : null}
        </div>
      </div>

      {headerPath ? (
        <div
          className="px-3 mt-0.5 font-mono text-[11px] text-(--text-secondary) truncate"
          title={headerPath}
        >
          {headerPath}
        </div>
      ) : null}

      {resultType ? (
        <div className="flex items-center gap-2 px-3 py-2">
          <StatusPill resultType={resultType} />
          {resultType === 'pending' ? (
            <span className="text-[11px] text-blue-600 dark:text-blue-400">Queued</span>
          ) : null}
        </div>
      ) : null}

      {argsOpen && hasArgs ? (
        <div className="px-3 pb-2">
          <Code language="json" code={jsonString(toolCall.arguments)} />
        </div>
      ) : null}

      {detail ? (
        <div className="border-t border-(--border-subtle)">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-(--surface-raised)"
            onClick={(e) => {
              e.stopPropagation()
              setResultOpen((v) => !v)
            }}
            aria-expanded={resultOpen}
          >
            <span className="font-medium">{detail.label}</span>
            <span className="text-(--text-secondary)">{resultOpen ? '−' : '+'}</span>
          </button>
          {resultOpen ? (
            <div className="border-t border-(--border-subtle) p-2 max-h-72 overflow-auto bg-(--surface-raised)">
              <Code language={detail.language} code={detail.code} />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )

  if (!hasPopup) {
    return <div className={anchorClassName}>{body}</div>
  }

  // When the tool is awaiting confirmation and the host supplied a preview,
  // forward it to the hover card as the `result` so the rich preview can
  // render the proposed diff/patch.
  const hoverResult = previewResult ?? result

  const isSmall = toolCall.name === 'finishFeature' || toolCall.name === 'blockFeature'
  const canShowSplitToggle =
    (toolCall.name === 'writeFile' && resultType !== undefined && resultType !== 'errored') ||
    ((toolCall.name === 'updateStory' || toolCall.name === 'updateFeature') &&
      (resultType === 'require_confirmation' ||
        resultType === 'pending' ||
        resultType === 'running'))

  return (
    <Tooltip
      variant="bare"
      sideAlign="start"
      placement="right"
      delayMs={150}
      content={
        <ToolCallHoverCard
          toolCall={toolCall}
          result={hoverResult}
          resultType={resultType}
          renderResult={renderResult}
          splitToggle={canShowSplitToggle}
          headerPath={headerPath}
          variant={isSmall ? 'small' : 'default'}
        />
      }
      anchorAs="div"
      anchorClassName={anchorClassName}
      anchorTabIndex={0}
    >
      {body}
    </Tooltip>
  )
}

export default memo(ToolCallCardInner)
