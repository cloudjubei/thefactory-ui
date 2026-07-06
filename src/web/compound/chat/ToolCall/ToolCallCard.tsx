import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import Code from '../../Code'
import { BottomSheet } from '../../../primitives/BottomSheet'
import { Switch } from '../../../primitives/Switch'
import Tooltip from '../../../primitives/Tooltip'
import { IconChevron } from '../../../icons'
import { safePreviewString, toolArgDisplay } from '../../../../headless/utils/toolPreview'
import { formatDurationMs } from '../../../../headless/utils/time'
import StatusIcon, { StatusChip } from './StatusIcon'
import ToolArgInline from './ToolArgInline'
import ToolCallHoverCard from './ToolCallHoverCard'
import ToolOriginBadge from './ToolOriginBadge'
import type { ToolCall, ToolResultType } from './types'

// Web small-screen breakpoint mirrors the rest of the package
// (`FileSelector`, `CollapsibleSidebar`) so a single CSS-media-query value
// drives every "switch to tap/bottom-sheet UI" rule across the app.
const SMALL_SCREEN_MEDIA_QUERY = '(max-width: 767px)'

function useIsSmallScreen(): boolean {
  const [isSmall, setIsSmall] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(SMALL_SCREEN_MEDIA_QUERY).matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(SMALL_SCREEN_MEDIA_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsSmall(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isSmall
}

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
}

function jsonString(v: unknown): string {
  return safePreviewString(v).text
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
}: ToolCallCardProps) {
  const [argsOpen, setArgsOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const isSmallScreen = useIsSmallScreen()

  const hasArgs = useMemo(() => {
    const a = toolCall.arguments
    if (!a) return false
    if (typeof a !== 'object') return true
    return Object.keys(a as object).length > 0
  }, [toolCall.arguments])

  // Compact one-line view of the args, shown inline next to the tool name (paths
  // render with the nice dir+filename display, a command/pattern as a code
  // snippet); the full args expand under the chevron. Falls back to a JSON
  // one-liner when no single field stands in for the call.
  const argDisplay = useMemo(() => {
    if (!hasArgs) return null
    return toolArgDisplay(toolCall) ?? { kind: 'text' as const, text: jsonString(toolCall.arguments) }
  }, [hasArgs, toolCall])
  const timeLabel = durationMs ? formatDurationMs(durationMs) : ''

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
      {/* Row 1: status icon · tool name · compact input · time chip · chevron.
          The status icon (left) conveys outcome, so no separate status pill. */}
      <div className="flex items-center gap-2 px-3 py-2 min-w-0">
        <StatusIcon resultType={resultType} />
        <span className="font-semibold shrink-0">{toolCall.name}</span>
        <ToolOriginBadge origin={toolCall.origin} />
        <ToolArgInline display={argDisplay} />
        <StatusChip resultType={resultType} timeLabel={timeLabel} />
        {/* The grant toggle shows ONLY for genuinely confirmable tools awaiting
            the user's approval — never for auto-call / already-running tools. */}
        {selectable ? (
          <span onClick={(e) => e.stopPropagation()}>
            <Switch checked={!!selected} onCheckedChange={() => onToggleSelect?.()} />
          </span>
        ) : null}
        {hasArgs ? (
          <button
            type="button"
            className="p-1 rounded hover:bg-(--surface-raised) shrink-0"
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

  const isSmall = toolCall.name === 'completeAssignment' || toolCall.name === 'blockFeature'
  const canShowSplitToggle =
    (toolCall.name === 'writeFile' && resultType !== undefined && resultType !== 'errored') ||
    ((toolCall.name === 'updateStory' || toolCall.name === 'updateFeature') &&
      (resultType === 'require_confirmation' ||
        resultType === 'pending' ||
        resultType === 'running'))

  // Small-screen viewports get a tap-to-open bottom sheet instead of the
  // hover-driven tooltip. Touch devices either can't trigger `:hover` at
  // all, or fire it as a sticky single-tap, so the tooltip path is
  // unreliable there. This mirrors the native mobile pattern in
  // `ToolPreviewSheet` so the rich preview reads the same on both.
  if (isSmallScreen) {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          className={`${anchorClassName} cursor-pointer`}
          onClick={() => setSheetOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSheetOpen(true)
            }
          }}
        >
          {body}
        </div>
        <BottomSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          ariaLabel={`Tool call: ${toolCall.name}`}
          minHeightFraction={0.2}
          maxHeightFraction={0.8}
        >
          <div className="overflow-auto p-3">
            <ToolCallHoverCard
              toolCall={toolCall}
              result={hoverResult}
              resultType={resultType}
              renderResult={renderResult}
              splitToggle={canShowSplitToggle}
              headerPath={headerPath}
              variant={isSmall ? 'small' : 'default'}
              widthMode="fluid"
            />
          </div>
        </BottomSheet>
      </>
    )
  }

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
