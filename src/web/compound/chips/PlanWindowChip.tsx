import {
  PLAN_WINDOW_COPY,
  type PlanWindowChipView,
  type PlanWindowChipWindow,
  type PlanWindowStatus,
} from '../../../headless'
import Tooltip from '../../primitives/Tooltip'
import { CHIP_PILL_NEUTRAL } from './pillStyles'

export type PlanWindowChipProps = {
  /** The run's plan windows, from `planWindowChip`. */
  view: PlanWindowChipView
}

const STATUS_FILL: Record<PlanWindowStatus, string> = {
  ok: 'var(--accent-primary)',
  'near-limit': 'var(--status-working-bg)',
  'limit-reached': 'var(--status-stuck-bg)',
}

const STATUS_TEXT: Record<PlanWindowStatus, string> = {
  ok: 'var(--text-primary)',
  'near-limit': 'var(--status-working-soft-fg)',
  'limit-reached': 'var(--status-stuck-soft-fg)',
}

function Ring({ window }: { window: PlanWindowChipWindow }) {
  const radius = 5
  const round = 2 * Math.PI * radius
  return (
    <svg viewBox="0 0 14 14" className="size-3.5 shrink-0 -rotate-90" aria-hidden>
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        strokeWidth="2.5"
        stroke="var(--border-default)"
      />
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        strokeWidth="2.5"
        stroke={STATUS_FILL[window.status]}
        strokeDasharray={`${(round * (window.percent ?? 0)) / 100} ${round}`}
      />
    </svg>
  )
}

function Dot({ window }: { window: PlanWindowChipWindow }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ background: STATUS_FILL[window.status] }}
      aria-hidden
    />
  )
}

function Mark({ window }: { window: PlanWindowChipWindow }) {
  return window.percent === undefined ? <Dot window={window} /> : <Ring window={window} />
}

function WindowPill({ window }: { window: PlanWindowChipWindow }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${CHIP_PILL_NEUTRAL}`}>
      <span className="text-(--text-muted)">{window.window}</span>
      <Mark window={window} />
      {window.value ? (
        <span className="tabular-nums" style={{ color: STATUS_TEXT[window.status] }}>
          {window.value}
        </span>
      ) : null}
      <span className="text-(--text-muted)">· {window.reset}</span>
    </span>
  )
}

function Details({ view }: { view: PlanWindowChipView }) {
  return (
    <div className="flex max-w-[280px] flex-col gap-0.5 text-xs">
      <b className="font-semibold">{view.title}</b>
      {view.windows.map((w) => (
        <span key={w.window}>{w.detail}</span>
      ))}
      {view.notReported ? <span>{view.notReported}</span> : null}
    </div>
  )
}

/**
 * How much of its CLI plan's rate-limit windows a run has used, as a chip beside the run's
 * model: one pill per window with a ring and its share (a dot and its status when the CLI gives no share) and when it resets, and a muted pill
 * when the CLI reports nothing. Hover or focus shows each window in words.
 */
export default function PlanWindowChip({ view }: PlanWindowChipProps) {
  return (
    <span className="inline-flex" aria-label={PLAN_WINDOW_COPY.chipLabel(view.title)}>
      <Tooltip
        content={<Details view={view} />}
        placement="bottom"
        allowedPlacements={['bottom', 'top']}
        sideAlign="end"
        anchorTabIndex={0}
        anchorClassName="inline-flex cursor-default rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
      >
        <span className="inline-flex flex-wrap items-center gap-1">
          {view.notReported ? (
            <span
              className={`inline-flex items-center whitespace-nowrap ${CHIP_PILL_NEUTRAL} text-(--text-muted)`}
            >
              {view.notReported}
            </span>
          ) : (
            view.windows.map((w) => <WindowPill key={w.window} window={w} />)
          )}
        </span>
      </Tooltip>
    </span>
  )
}
