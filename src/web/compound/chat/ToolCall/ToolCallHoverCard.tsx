import { useState, type ReactNode } from 'react'
import { PathDisplay } from '../../PathDisplay'
import { isFilePathTool } from '../../../../headless/utils/toolPreview'
import StatusIcon from './StatusIcon'
import type { ToolCall, ToolResultType } from './types'

export type ToolCallHoverCardProps = {
  toolCall: ToolCall
  result?: unknown
  resultType?: ToolResultType
  /**
   * Pluggable renderer. When omitted the hover card just shows the tool
   * name + status — consumers (web / desktop) pass a registry that maps
   * the tool to a rich preview (file diff, story callout, etc.).
   *
   * Receives an internally-managed `sideBySide` flag so the consumer's
   * renderer can toggle between inline-unified and side-by-side views when
   * `splitToggle` is enabled below.
   */
  renderResult?: (args: {
    toolCall: ToolCall
    result?: unknown
    resultType?: ToolResultType
    sideBySide?: boolean
  }) => ReactNode
  /** When true the hover card shows an Inline / Split toggle next to the
   * tool name — typical for write/update tools where the user wants to
   * compare before/after. The current value is passed back through
   * `renderResult({sideBySide})`. */
  splitToggle?: boolean
  /** Optional headline path (e.g. file path) shown under the tool name. */
  headerPath?: string
  /** Render a small popup variant (used by `finishFeature` / `blockFeature`
   * callouts that don't need the wide 480px frame). */
  variant?: 'default' | 'small'
  /** Width / framing mode. `fixed` (default) draws the rounded popup chrome
   * at the canonical hover widths. `fluid` strips the outer chrome + width
   * cap so the body fills its container — used by the small-screen
   * tap-to-open bottom sheet where the sheet itself owns the framing. */
  widthMode?: 'fixed' | 'fluid'
}

/**
 * Hover card body shown over a `ToolCallCard`. Renderer-agnostic — the
 * consumer wires its own `renderResult` registry; the card just owns the
 * chrome (status icon + name + optional inline/split toggle + scroll
 * container).
 */
export default function ToolCallHoverCard({
  toolCall,
  result,
  resultType,
  renderResult,
  splitToggle = false,
  headerPath,
  variant = 'default',
  widthMode = 'fixed',
}: ToolCallHoverCardProps) {
  const [sideBySide, setSideBySide] = useState(false)
  const widthClass =
    widthMode === 'fluid'
      ? 'w-full'
      : variant === 'small'
        ? 'min-w-[120px] max-w-[70vw]'
        : 'w-[480px] max-w-[70vw]'
  const chromeClass =
    widthMode === 'fluid'
      ? ''
      : 'rounded-md border border-(--border-subtle) bg-(--surface-overlay) p-2 shadow-lg'

  return (
    <div className={`${widthClass} ${chromeClass}`.trim()}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon resultType={resultType} />
          <div className="text-sm font-semibold truncate">{toolCall.name}</div>
        </div>
        {splitToggle ? (
          <div className="flex bg-(--surface-base) rounded-md border border-(--border-subtle) p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setSideBySide(false)}
              className={[
                'px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
                !sideBySide
                  ? 'bg-(--surface-overlay) text-(--text-primary) shadow-sm'
                  : 'text-(--text-secondary) hover:text-(--text-primary)',
              ].join(' ')}
              title="Inline unified view"
            >
              Inline
            </button>
            <button
              type="button"
              onClick={() => setSideBySide(true)}
              className={[
                'px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
                sideBySide
                  ? 'bg-(--surface-overlay) text-(--text-primary) shadow-sm'
                  : 'text-(--text-secondary) hover:text-(--text-primary)',
              ].join(' ')}
              title="Split side-by-side view"
            >
              Split
            </button>
          </div>
        ) : null}
      </div>

      {headerPath ? (
        <div className="mt-1 mb-2" title={headerPath}>
          {isFilePathTool(toolCall.name) ? (
            <PathDisplay path={headerPath} />
          ) : (
            <div className="font-mono text-[11px] text-(--text-secondary) truncate">
              {headerPath}
            </div>
          )}
        </div>
      ) : null}

      {renderResult ? (
        <div className="max-h-[60vh] overflow-auto pr-1">
          {renderResult({ toolCall, result, resultType, sideBySide })}
        </div>
      ) : null}
    </div>
  )
}
