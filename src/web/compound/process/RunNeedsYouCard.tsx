import { useState, type ReactNode } from 'react'

import {
  PARK_ANSWERS_COPY,
  PROCESS_MANAGER_FOUND_LABEL,
  PROCESS_MANAGER_TRIED_LABEL,
  type ProcessManagerEscalationView,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { IconChat } from '../../icons'

/** Where the "Needs you" card sits, for the steps that point up to it. */
export const RUN_NEEDS_YOU_CARD_ID = 'run-needs-you'

export type RunNeedsYouCardProps = {
  /** The step it stopped at, as chips — a feature's reference, then the step. */
  where: ReactNode
  /** On hold for a stop, in review for a decision at a gate. */
  tone: 'on_hold' | 'review'
  /** Open the run's chat to ask the manager about it. */
  onAskManager?: () => void
  children: ReactNode
  className?: string
}

/**
 * The one thing that needs the person, at the top of the run: where it
 * stopped, what happened, the manager's word on it and the answers to choose
 * from. Everything else on the page sits below it.
 */
export default function RunNeedsYouCard({
  where,
  tone,
  onAskManager,
  children,
  className = 'mx-3 mt-3',
}: RunNeedsYouCardProps) {
  return (
    <section
      id={RUN_NEEDS_YOU_CARD_ID}
      aria-label={PARK_ANSWERS_COPY.needsYou}
      className={`flex scroll-mt-3 flex-col gap-2.5 rounded-xl px-4 py-3.5 sm:px-5 ${className}`}
      style={{
        background: `color-mix(in srgb, var(--status-${tone}-soft-bg) 55%, var(--surface-raised))`,
        border: `1px solid var(--status-${tone}-soft-border)`,
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {where}
        <span className="text-[12px] font-semibold text-(--text-secondary)">
          {PARK_ANSWERS_COPY.needsYou}
        </span>
        {onAskManager ? (
          <Button size="sm" variant="ghost" className="ml-auto gap-1.5" onClick={onAskManager}>
            <IconChat className="size-3.5" />
            {PARK_ANSWERS_COPY.askManager}
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  )
}

/**
 * The manager's word on a stop in one line — what it recommends — with "Why"
 * opening what it found and what it tried. At a spent limit it leads with
 * whether more tries would help, and the evidence.
 */
export function ManagerLine({ view }: { view: ProcessManagerEscalationView }) {
  const [open, setOpen] = useState(false)
  const moreTries = view.moreTries
  const triesTone = moreTries?.verdict === 'helps' ? 'done' : 'stuck'
  return (
    <div className="flex flex-col gap-1.5 border-t border-(--border-subtle) pt-2.5">
      {moreTries ? (
        <div
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg px-3 py-2 text-[13px] leading-snug"
          style={{
            background: `var(--status-${triesTone}-soft-bg)`,
            border: `1px solid var(--status-${triesTone}-soft-border)`,
          }}
        >
          <span className="font-semibold" style={{ color: `var(--status-${triesTone}-soft-fg)` }}>
            {PARK_ANSWERS_COPY.moreTries[moreTries.verdict]}
          </span>
          <span className="min-w-0 flex-[1_1_260px] text-(--text-primary)">{moreTries.why}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] leading-snug">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)">
          {PARK_ANSWERS_COPY.manager}
        </span>
        <span className="min-w-0 flex-[1_1_320px] text-(--text-primary)">
          {view.recommendation}
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="text-[12.5px] font-medium text-(--accent-primary) hover:underline"
        >
          {open ? PARK_ANSWERS_COPY.hideWhy : PARK_ANSWERS_COPY.why}
        </button>
      </div>
      {open ? (
        <div className="flex max-w-[90ch] flex-col gap-1.5 rounded-lg border border-(--border-subtle) bg-(--surface-base) px-3 py-2.5 text-[12.5px] leading-relaxed text-(--text-secondary)">
          <span>
            <strong className="text-(--text-primary)">{PROCESS_MANAGER_FOUND_LABEL}: </strong>
            {view.found}
          </span>
          {view.tried.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              <strong className="text-(--text-primary)">{PROCESS_MANAGER_TRIED_LABEL}</strong>
              {view.tried.map((t) => (
                <span key={t}>• {t}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
