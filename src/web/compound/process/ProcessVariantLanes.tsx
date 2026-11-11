import {
  PROCESS_VARIANT_COPY,
  processVariantChildView,
  useProcessRun,
  type ProcessVariantLane,
  type ProcessVariantLanesView,
} from '../../../headless'
import CostChip from '../chips/CostChip'
import DurationChip from '../chips/DurationChip'
import ToneBadge from '../chips/ToneBadge'
import StepsStrip from './StepsStrip'

export type ProcessVariantLanesProps = {
  view: ProcessVariantLanesView
  /** Open a variant's own page. */
  onOpen: (lane: ProcessVariantLane) => void
  /** Open the report, from the card's head. */
  onOpenReport?: () => void
  className?: string
}

const NO_TILES = [] as const

/** The steps of the run fanned out for a lane, once it is read. */
function LaneSteps({ runId }: { runId: string | undefined }) {
  const { run } = useProcessRun(runId)
  const { steps } = processVariantChildView(run, NO_TILES)
  if (steps.length === 0) return <span className="@max-lg:hidden" />
  return (
    <span
      className="min-w-0 @max-lg:order-3 @max-lg:col-span-2"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) e.stopPropagation()
      }}
    >
      <StepsStrip bare model={{ label: PROCESS_VARIANT_COPY.steps, entries: [...steps] }} />
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
      <LaneSteps runId={lane.runId} />
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

/**
 * A lane per variant: its name and what it last filed or came to, the steps of
 * the run fanned out for it, its status, time and cost. Variants run at once,
 * so a lane is one row, opened on click: the variant's own page holds what it
 * filed and any decision it stopped on.
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
      {view.lanes.map((lane) => (
        <Lane key={lane.id} lane={lane} onOpen={() => onOpen(lane)} />
      ))}
    </section>
  )
}
