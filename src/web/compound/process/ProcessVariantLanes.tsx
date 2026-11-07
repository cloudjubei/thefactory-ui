import type { CSSProperties } from 'react'

import {
  PROCESS_VARIANT_COPY,
  type ProcessVariantDayCell,
  type ProcessVariantLane,
  type ProcessVariantLanesView,
  type ProcessVariantReviewLook,
  type ProcessVariantWeek,
} from '../../../headless'
import CostChip from '../chips/CostChip'
import DurationChip from '../chips/DurationChip'
import ToneBadge from '../chips/ToneBadge'

export type ProcessVariantLanesProps = {
  view: ProcessVariantLanesView
  /** Open a variant's own page. */
  onOpen: (lane: ProcessVariantLane) => void
  /** Open the report, from the card's head. */
  onOpenReport?: () => void
  className?: string
}

const CELL_LOOK: Record<ProcessVariantDayCell['look'], CSSProperties> = {
  lived: {
    background: 'var(--status-done-soft-bg)',
    border: '1px solid var(--status-done-soft-border)',
    color: 'var(--status-done-soft-fg)',
  },
  today: {
    background: 'var(--status-running-soft-bg)',
    border: '1.5px solid var(--status-running-bg)',
    color: 'var(--status-running-soft-fg)',
  },
  parked: {
    background: 'var(--status-on_hold-bg)',
    border: '1px solid var(--status-on_hold-bg)',
    color: 'var(--status-on_hold-fg)',
  },
  'to-come': {
    border: '1px dashed var(--border-default)',
    color: 'var(--text-muted)',
  },
}

const REVIEW_LOOK: Record<ProcessVariantReviewLook, CSSProperties> = {
  done: { background: 'var(--status-done-bg)' },
  now: { background: 'var(--status-running-bg)' },
  wait: { border: '1px dashed var(--border-strong)' },
}

function Review({ look, label }: { look: ProcessVariantReviewLook; label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="size-2.5 shrink-0 rotate-45 rounded-[2px]"
      style={REVIEW_LOOK[look]}
    />
  )
}

function Week({ week }: { week: ProcessVariantWeek }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1">
      {week.cells.map((cell) => (
        <span
          key={cell.day}
          className="grid h-5 min-w-0 flex-1 place-items-center rounded-[4px] text-[10px] font-semibold tabular-nums"
          style={CELL_LOOK[cell.look]}
        >
          <span className="@max-lg:hidden">{cell.day}</span>
        </span>
      ))}
      {week.review ? <Review look={week.review} label={PROCESS_VARIANT_COPY.review} /> : null}
    </span>
  )
}

function Lane({ lane, onOpen }: { lane: ProcessVariantLane; onOpen: () => void }) {
  const parked = lane.status === 'parked'
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={lane.label}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen()
      }}
      className="grid w-full cursor-pointer grid-cols-[200px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-t border-(--border-subtle) px-4 py-2.5 text-left hover:bg-(--surface-hover) @max-lg:grid-cols-[minmax(0,1fr)_auto] sm:px-5"
      style={
        parked
          ? { background: 'color-mix(in srgb, var(--status-on_hold-soft-bg) 40%, transparent)' }
          : undefined
      }
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[13.5px] font-semibold text-(--text-primary)">
          {lane.label}
        </span>
        <span className="truncate text-[12px] text-(--text-secondary)" title={lane.line}>
          {lane.line}
        </span>
      </span>
      {lane.weeks.length > 0 ? (
        <span className="flex min-w-0 items-center gap-2 @max-lg:order-3 @max-lg:col-span-2">
          {lane.weeks.map((week) => (
            <Week key={week.label} week={week} />
          ))}
        </span>
      ) : (
        <span className="@max-lg:hidden" />
      )}
      <span className="flex flex-col items-end gap-1">
        <ToneBadge tone={lane.badge.tone}>{lane.badge.label}</ToneBadge>
        <span className="flex items-center gap-1.5">
          {lane.time ? <DurationChip label={lane.time} nested /> : null}
          {lane.cost ? <CostChip label={lane.cost} nested /> : null}
        </span>
      </span>
    </div>
  )
}

function LegendSwatch({ style, label }: { style: CSSProperties; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-[3px]" style={style} />
      {label}
    </span>
  )
}

/**
 * A lane per variant with a cell per day, so a glance says who got how far.
 * Variants run at once, so a lane is one row, opened on click: the variant's
 * own page holds what it filed and any decision it stopped on. Without a number
 * of days from the launch a lane is its name and status alone.
 */
export default function ProcessVariantLanes({
  view,
  onOpen,
  onOpenReport,
  className = 'mx-3 mt-3',
}: ProcessVariantLanesProps) {
  return (
    <section
      aria-label={view.heading}
      className={`@container flex flex-col overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-raised) ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-4 py-3 sm:px-5">
        <h3 className="m-0 text-[14px] font-semibold text-(--text-primary)">{view.heading}</h3>
        <span className="text-[12.5px] text-(--text-muted)">{view.sub}</span>
        {onOpenReport ? (
          <button
            type="button"
            onClick={onOpenReport}
            className="ml-auto text-[12.5px] font-medium text-(--accent-primary) hover:underline"
          >
            {PROCESS_VARIANT_COPY.report}
          </button>
        ) : null}
      </div>
      {view.weekLabels.length > 0 ? (
        <div className="grid grid-cols-[200px_minmax(0,1fr)_auto] gap-x-4 border-t border-(--border-subtle) px-4 py-1.5 text-[11.5px] text-(--text-muted) @max-lg:hidden sm:px-5">
          <span>{PROCESS_VARIANT_COPY.variantHead}</span>
          <span className="flex gap-2">
            {view.weekLabels.map((label) => (
              <span key={label} className="flex-1">
                {label}
              </span>
            ))}
          </span>
          <span className="w-[120px]" />
        </div>
      ) : null}
      {view.lanes.map((lane) => (
        <Lane key={lane.id} lane={lane} onOpen={() => onOpen(lane)} />
      ))}
      {view.days !== undefined ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-(--border-subtle) px-4 py-2 text-[11.5px] text-(--text-secondary) sm:px-5">
          <LegendSwatch style={CELL_LOOK.lived} label={PROCESS_VARIANT_COPY.legendLived} />
          <LegendSwatch style={CELL_LOOK.today} label={PROCESS_VARIANT_COPY.legendToday} />
          <LegendSwatch
            style={{ background: 'var(--status-on_hold-bg)' }}
            label={PROCESS_VARIANT_COPY.legendNeedsYou}
          />
          <LegendSwatch style={CELL_LOOK['to-come']} label={PROCESS_VARIANT_COPY.legendToCome} />
          <span className="inline-flex items-center gap-1.5">
            <Review look="done" label={PROCESS_VARIANT_COPY.legendReviewed} />
            {PROCESS_VARIANT_COPY.legendReviewed}
          </span>
        </div>
      ) : null}
    </section>
  )
}
