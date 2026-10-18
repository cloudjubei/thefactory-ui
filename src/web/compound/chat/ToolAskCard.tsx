import type { ComponentType, ReactNode } from 'react'
import { Button } from '../../primitives/Button'
import {
  IconBranch,
  IconChat,
  IconDelete,
  IconDownload,
  IconFile,
  IconGlobe,
  IconMerge,
  IconPackage,
  IconPlay,
  IconUpload,
  IconWrench,
} from '../../icons'
import RichText from '../files/RichText'
import { TOOL_ASK_COPY } from '../../../headless/utils/toolAskCardConstants'
import type {
  ToolAskCardView,
  ToolAskDecidedLine,
  ToolAskIcon,
  ToolAskScopeOption,
} from '../../../headless/utils/toolAskCardTypes'
import type { PendingToolGrantDecision } from '../../../headless/utils/chatTypes'

const ICONS: Record<ToolAskIcon, ComponentType<{ className?: string }>> = {
  git: IconBranch,
  merge: IconMerge,
  push: IconUpload,
  package: IconPackage,
  network: IconGlobe,
  fetch: IconDownload,
  message: IconChat,
  file: IconFile,
  delete: IconDelete,
  run: IconPlay,
  tool: IconWrench,
}

export type ToolAskCardProps = {
  view: ToolAskCardView
  /** The thing itself — the package, the message, the branches — shown, and pickable where it can change. */
  children?: ReactNode
  busy: boolean
  /** Why the last decision did not go through. */
  error?: string | null
  /** Why the card cannot be approved as it stands. */
  problem?: string
  /** False while what it acts on is still being read: the verb waits, with no problem to name. */
  ready?: boolean
  /** A control at the header's end, such as opening the card larger. */
  headerAction?: ReactNode
  onApprove: () => void
  onDeny: () => void
  /** Leave it waiting and get on with the chat. Omitted where waiting means nothing. */
  onLater?: () => void
}

/**
 * The one card every tool that waits on the person shares: the host's plain
 * sentence of what it wants under a tool tile, the headline, the agent's
 * reason, the thing itself, the consequence, and [verb] [Not now] [Decide
 * later]. A destructive ask gets a red header and a danger button.
 */
export default function ToolAskCard({
  view,
  children,
  busy,
  error,
  problem,
  ready = true,
  headerAction,
  onApprove,
  onDeny,
  onLater,
}: ToolAskCardProps) {
  const Icon = ICONS[view.icon]
  const danger = view.tone === 'danger'
  return (
    <div
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border-[1.5px] bg-(--surface-raised) shadow-sm"
      style={{ borderColor: danger ? 'var(--status-blocked-soft-fg)' : 'var(--accent-primary)' }}
    >
      <div
        className={`flex shrink-0 items-center gap-2.5 px-3.5 py-2 ${
          danger
            ? 'bg-(--status-blocked-soft-bg) text-(--status-blocked-soft-fg)'
            : 'bg-(--accent-soft-bg) text-(--accent-soft-fg)'
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-(--surface-raised)">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{view.ask}</span>
        {view.tag ? <span className="shrink-0 text-[11.5px]">{view.tag}</span> : null}
        {headerAction}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
        <div className="text-[16px] font-semibold leading-snug text-(--text-primary)">
          {view.headline}
        </div>
        {view.why ? (
          <div className="text-[13px] leading-relaxed text-(--text-secondary)">
            <b className="font-semibold text-(--text-primary)">{TOOL_ASK_COPY.why}</b>{' '}
            <RichText text={view.why} />
          </div>
        ) : null}
        {children}
        {view.consequence ? (
          <div
            className={`text-[12.5px] ${danger ? 'font-semibold text-(--status-blocked-soft-fg)' : 'text-(--text-secondary)'}`}
          >
            <RichText text={view.consequence} />
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 border-t border-(--border-subtle) px-3.5 py-2.5">
        {problem ? (
          <div className="text-[12px] text-(--status-stuck-soft-fg)">{problem}</div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) px-2.5 py-1.5 text-[12px] text-(--status-stuck-soft-fg)">
            {error}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={danger ? 'danger' : 'primary'}
            onClick={onApprove}
            loading={busy}
            disabled={busy || !ready || problem !== undefined}
          >
            {view.verb}
          </Button>
          <Button size="sm" variant="secondary" onClick={onDeny} disabled={busy}>
            {TOOL_ASK_COPY.notNow}
          </Button>
          {onLater ? (
            <Button size="sm" variant="ghost" className="ml-auto" onClick={onLater} disabled={busy}>
              {TOOL_ASK_COPY.later}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** How far an approval reaches: just this once, or always in a place — a radio. */
export function ToolAskScopeChoice({
  options,
  value,
  onChange,
  disabled,
}: {
  options: readonly ToolAskScopeOption[]
  value: PendingToolGrantDecision
  onChange: (decision: PendingToolGrantDecision) => void
  disabled?: boolean
}) {
  if (options.length === 0) return null
  return (
    <div
      role="radiogroup"
      aria-label={TOOL_ASK_COPY.howLong}
      className="overflow-hidden rounded-lg border border-(--border-default)"
    >
      {options.map((option, i) => {
        const on = option.decision === value
        return (
          <button
            key={option.decision}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(option.decision)}
            className={`grid w-full grid-cols-[18px_minmax(0,1fr)] items-center gap-2.5 px-3 py-2 text-left ${
              i > 0 ? 'border-t border-(--border-subtle)' : ''
            } ${on ? 'bg-(--accent-soft-bg)' : 'bg-(--surface-raised) hover:bg-(--surface-hover)'}`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] ${
                on ? 'border-(--accent-primary)' : 'border-(--border-strong)'
              }`}
            >
              {on ? <span className="h-2 w-2 rounded-full bg-(--accent-primary)" /> : null}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[13px] font-semibold text-(--text-primary)">
                {option.label}
              </span>
              <span className="text-[12px] text-(--text-secondary)">{option.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** A decided card, folded to one line. */
export function ToolAskDecidedRow({ line }: { line: ToolAskDecidedLine }) {
  const done = line.tone === 'done'
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-(--border-subtle) bg-(--surface-raised) px-3 py-2 text-[13px] text-(--text-secondary)">
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
          done
            ? 'bg-(--status-done-soft-bg) text-(--status-done-soft-fg)'
            : 'bg-(--surface-overlay) text-(--text-secondary)'
        }`}
      >
        {done ? '✓' : '–'}
      </span>
      <span className="min-w-0 flex-1">{line.text}</span>
    </div>
  )
}
