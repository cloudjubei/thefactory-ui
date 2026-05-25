import { type ReactNode, type RefObject } from 'react'
import { Button } from '../../primitives/Button'
import {
  IconCalculator,
  IconChevron,
  IconCode,
  IconMaximize,
  IconRefreshChat,
  IconScroll,
  IconSettings,
} from '../../icons'

export type ChatHeaderProps = {
  /** When set, shows a collapse chevron on the left. */
  isCollapsible?: boolean
  onCollapse?: () => void
  /** When set (sidebar panel case), shows a maximize button that opens the
   * chat in its own route. */
  onMaximize?: () => void

  /** Total cost across the chat — used for the calculator tooltip text. */
  totalCostUSD?: number

  /** Caller-rendered "i" button (or any other entity context display) that
   * sits between the collapse chevron and the buttons. Host wires its own
   * ContextInfoButton — this component is renderer-agnostic. Always shown
   * (no fallback) to match desktop. */
  contextInfoSlot?: ReactNode

  /** Visible chat title (e.g. `Story #5`, `Feature #5.2`). Rendered next to
   * `contextInfoSlot` and truncates when the header gets tight, so the
   * surface matches mobile's `ScreenShell` title for the same chat. */
  title?: string

  onOpenPrompt: () => void
  onOpenCosts: () => void
  onOpenDynamicContext?: () => void
  /** Clear / refresh chat. When set, a red refresh button sits to the left
   * of the model chip. */
  onRefresh?: () => void
  onOpenSettings: () => void

  settingsBtnRef?: RefObject<HTMLButtonElement | null>
  isSettingsOpen?: boolean

  /** When the chat is an agent run, the right-side action buttons collapse. */
  isRunningAgent?: boolean

  /** Optional model-chip element (host provides — usually a connected
   * `<ModelChip>` wrapper from the host). Sits to the right of the refresh
   * button. */
  modelChip?: ReactNode

  /** Settings dropdown rendered inside the relative header so its
   * `position: absolute; top: 100%` anchors below the icon row. Host owns
   * the dropdown state. */
  settingsDropdown?: ReactNode

  /** Optional slot rendered to the far right (after settings) — used by
   * hosts that want extra controls without forking the header. */
  extraRight?: ReactNode
}

function formatUSD(n?: number) {
  if (n == null || Number.isNaN(n)) return '—'
  return `$${n.toFixed(4)}`
}

/**
 * Compact icon-row chat header. Mirrors `overseer-local`'s
 * `ChatSidebarHeader` 1:1 — collapse chevron + context-info "i" + system-
 * prompt + costs + dynamic-context buttons on the left; maximize + refresh
 * + model chip + settings on the right.
 *
 * The header has `position: relative` so the consumer-provided
 * `settingsDropdown` slot (typically `<ChatSettingsDropdown>`) can anchor
 * with `top: 100%`. The host owns the dropdown's open state.
 */
export default function ChatHeader({
  isCollapsible,
  onCollapse,
  onMaximize,
  totalCostUSD,
  contextInfoSlot,
  title,
  onOpenPrompt,
  onOpenCosts,
  onOpenDynamicContext,
  onRefresh,
  onOpenSettings,
  settingsBtnRef,
  isSettingsOpen,
  isRunningAgent,
  modelChip,
  settingsDropdown,
  extraRight,
}: ChatHeaderProps) {
  return (
    <header className="relative shrink-0 px-3 py-2 border-b border-(--border-subtle) bg-(--surface-raised) flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {isCollapsible ? (
          <button
            type="button"
            onClick={onCollapse}
            className="inline-flex items-center justify-center w-8 h-8 rounded border border-(--border-subtle) bg-(--surface-overlay) text-(--text-secondary) hover:bg-(--surface-hover)"
            aria-label="Collapse chat sidebar"
            title="Collapse chat sidebar"
          >
            <IconChevron className="w-4 h-4" style={{ transform: 'rotate(90deg)' }} />
          </button>
        ) : null}

        {contextInfoSlot}

        {title ? (
          <span
            className="min-w-0 truncate text-sm font-semibold text-(--text-primary)"
            title={title}
          >
            {title}
          </span>
        ) : null}

        <button
          type="button"
          onClick={onOpenPrompt}
          className="inline-flex items-center justify-center w-8 h-8 rounded border border-(--border-subtle) bg-(--surface-overlay) text-(--text-secondary) hover:bg-(--surface-hover)"
          aria-label="View system prompt"
          title="View System Prompt"
        >
          <IconScroll className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenCosts}
          className="inline-flex items-center justify-center w-8 h-8 rounded border border-(--border-subtle) bg-(--surface-overlay) text-(--text-secondary) hover:bg-(--surface-hover)"
          aria-label="View usage costs"
          title={
            typeof totalCostUSD === 'number' && totalCostUSD > 0
              ? `Total cost: ${formatUSD(totalCostUSD)}`
              : 'Usage costs'
          }
        >
          <IconCalculator className="w-4 h-4" />
        </button>

        {onOpenDynamicContext ? (
          <button
            type="button"
            onClick={onOpenDynamicContext}
            className="inline-flex items-center justify-center w-8 h-8 rounded border border-(--border-subtle) bg-(--surface-overlay) text-(--text-secondary) hover:bg-(--surface-hover)"
            aria-label="View dynamic context"
            title="Dynamic context"
          >
            <IconCode className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onMaximize ? (
          <button
            type="button"
            onClick={onMaximize}
            className="inline-flex items-center justify-center w-8 h-8 rounded border border-(--border-subtle) bg-(--surface-overlay) text-(--text-secondary) hover:bg-(--surface-hover)"
            aria-label="Open chat in its own view"
            title="Open chat in its own view"
          >
            <IconMaximize className="w-4 h-4" />
          </button>
        ) : null}

        {!isRunningAgent && onRefresh ? (
          <Button
            variant="danger"
            className="w-[34px]"
            aria-label="Clear chat"
            title="Clear chat"
            onClick={onRefresh}
          >
            <IconRefreshChat className="w-4 h-4" />
          </Button>
        ) : null}

        {modelChip}

        {!isRunningAgent ? (
          <button
            ref={settingsBtnRef}
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center justify-center w-8 h-8 rounded border border-(--border-subtle) bg-(--surface-overlay) text-(--text-secondary) hover:bg-(--surface-hover)"
            aria-haspopup="menu"
            aria-expanded={isSettingsOpen}
            aria-label="Open chat settings"
            title="Chat settings"
          >
            <IconSettings className="w-4 h-4" />
          </button>
        ) : null}

        {extraRight}
      </div>

      {settingsDropdown}
    </header>
  )
}
