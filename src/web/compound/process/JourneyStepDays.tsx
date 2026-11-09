import { useState, type ReactNode } from 'react'

import {
  JOURNEY_DAYS_COPY,
  useReviewEvidenceImage,
  type EvidenceTile,
  type JourneyDayView,
  type JourneyStepView,
} from '../../../headless'
import { IconChevronRight } from '../../icons'
import WalkthroughTab from '../chat/signoff/WalkthroughTab'
import CostChip from '../chips/CostChip'
import ToneBadge from '../chips/ToneBadge'

export type JourneyStepDaysProps = {
  projectId: string
  view: JourneyStepView
}

const HEADING = 'text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)'
const LINE = 'text-[12.5px] leading-relaxed text-(--text-primary)'
const MUTED = 'text-[12px] text-(--text-secondary)'

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={HEADING}>{title}</span>
      {children}
    </div>
  )
}

function Goals({ goals }: { goals: readonly string[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {goals.map((goal, at) => (
        <li key={`${at}-${goal}`} className={LINE}>
          {goal}
        </li>
      ))}
    </ul>
  )
}

function DayBody({ day }: { day: JourneyDayView }) {
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      {day.offered.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.offered}>
          <Goals goals={day.offered} />
        </Part>
      ) : null}
      {day.removed.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.removed}>
          {day.removed.map((one) => (
            <span key={one.key} className={LINE}>
              {one.goal}
              {one.reason ? <span className={`ml-1.5 ${MUTED}`}>{one.reason}</span> : null}
            </span>
          ))}
        </Part>
      ) : null}
      {day.replaced.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.replaced}>
          {day.replaced.map((one) => (
            <span key={one.key} className="flex flex-col gap-0.5">
              <span className={LINE}>
                {one.from}
                <span className="mx-1.5 text-(--text-muted)">→</span>
                {one.to}
              </span>
              {one.reason ? <span className={MUTED}>{one.reason}</span> : null}
            </span>
          ))}
        </Part>
      ) : null}
      {day.accepted.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.accepted}>
          <Goals goals={day.accepted} />
        </Part>
      ) : null}
      {day.statuses.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.statuses}>
          {day.statuses.map((one) => (
            <span key={one.key} className="flex min-w-0 items-center gap-2">
              <span className={`min-w-0 flex-1 ${LINE}`}>{one.goal}</span>
              <ToneBadge tone={one.status.tone}>{one.status.label}</ToneBadge>
            </span>
          ))}
        </Part>
      ) : null}
      {day.journal ? (
        <Part title={JOURNEY_DAYS_COPY.journal}>
          <span className={LINE}>{day.journal}</span>
        </Part>
      ) : null}
      {day.probes.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.probe}>
          {day.probes.map((one) => (
            <span key={one.key} className="flex flex-col gap-0.5">
              <span className={MUTED}>{one.question}</span>
              <span className={LINE}>
                {one.choice ?? JOURNEY_DAYS_COPY.noPick}
                {one.note ? <span className={`ml-1.5 ${MUTED}`}>{one.note}</span> : null}
              </span>
            </span>
          ))}
        </Part>
      ) : null}
      {day.cards.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.cards}>
          {day.cards.map((one) => (
            <span key={one.key} className={LINE}>
              {one.card}
              <span className="mx-1.5 text-(--text-muted)">→</span>
              {one.reaction ?? JOURNEY_DAYS_COPY.noPick}
            </span>
          ))}
        </Part>
      ) : null}
      {day.takeOvers.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.takeOversHeading}>
          {day.takeOvers.map((one) => (
            <div
              key={one.key}
              className="flex flex-col gap-1 rounded-md border border-(--border-subtle) bg-(--surface-muted) px-3 py-2"
            >
              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className={`min-w-0 flex-1 font-medium ${LINE}`}>{one.goal}</span>
                <ToneBadge tone={one.badge.tone}>{one.badge.label}</ToneBadge>
                {one.turns ? <span className={MUTED}>{one.turns}</span> : null}
                {one.cost ? <CostChip label={one.cost} /> : null}
              </span>
              <span className={MUTED}>
                {JOURNEY_DAYS_COPY.saw}: {one.saw}
              </span>
            </div>
          ))}
        </Part>
      ) : null}
      {day.decisions.length > 0 ? (
        <Part title={JOURNEY_DAYS_COPY.decisionsHeading}>
          {day.decisions.map((one) => (
            <span key={one.key} className="flex min-w-0 items-center gap-1.5">
              <span className={`min-w-0 flex-1 ${LINE}`}>{one.label}</span>
              {one.model ? <span className={MUTED}>{one.model}</span> : null}
              {one.cost ? <CostChip label={one.cost} /> : null}
              <ToneBadge tone={one.badge.tone}>{one.badge.label}</ToneBadge>
            </span>
          ))}
        </Part>
      ) : null}
    </div>
  )
}

function DayRow({ day, defaultOpen }: { day: JourneyDayView; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-(--border-subtle) first:border-t-0">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={day.title}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v)
        }}
        className="flex w-full min-w-0 cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-(--surface-hover)"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13.5px] font-semibold text-(--text-primary)">
              {day.title}
            </span>
            {day.takeOverBadge ? (
              <ToneBadge tone={day.takeOverBadge.tone}>{day.takeOverBadge.label}</ToneBadge>
            ) : null}
          </span>
          <span className="truncate text-[12px] text-(--text-secondary)">{day.line}</span>
        </span>
        {day.cost ? <CostChip label={day.cost} nested /> : null}
        <IconChevronRight
          className={`size-3.5 shrink-0 text-(--text-secondary) transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </div>
      {open ? <DayBody day={day} /> : null}
    </div>
  )
}

function StoppedAt({ projectId, tile }: { projectId: string; tile: EvidenceTile }) {
  const { dataUri } = useReviewEvidenceImage(projectId, tile.ref.id, tile.ref.mediaType)
  return (
    <Part title={JOURNEY_DAYS_COPY.stoppedAt}>
      {dataUri ? (
        <img
          src={dataUri}
          alt={tile.caption}
          className="block w-full rounded-md border border-(--border-subtle)"
        />
      ) : (
        <div className="h-40 w-full animate-pulse rounded-md bg-(--surface-muted)" />
      )}
    </Part>
  )
}

/**
 * The days a script step lived, from its day log: a total line, the recording
 * that plays them, then a row per day that opens on a click to what it offered,
 * what was kept, replaced and removed, the evening, every decision marked plan
 * or live, and each take-over with how it ended. The last day starts open.
 */
export default function JourneyStepDays({ projectId, view }: JourneyStepDaysProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {view.totalLine ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 text-[12.5px] text-(--text-secondary)">
            {view.totalLine}
          </span>
          {view.totalCost ? <CostChip label={view.totalCost} /> : null}
        </div>
      ) : null}
      {view.empty ? (
        <span className="text-[13px] text-(--text-secondary)">{view.empty}</span>
      ) : null}
      {view.unread ? <span className="text-[12px] text-(--text-muted)">{view.unread}</span> : null}
      {view.recording ? (
        <WalkthroughTab projectId={projectId} recordings={[view.recording]} />
      ) : null}
      {view.stoppedAt ? <StoppedAt projectId={projectId} tile={view.stoppedAt} /> : null}
      {view.days.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-raised)">
          {view.days.map((day) => (
            <DayRow key={day.day} day={day} defaultOpen={day.day === view.openDay} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
