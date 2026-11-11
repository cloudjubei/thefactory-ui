import { useState, type ReactNode } from 'react'

import {
  SCRIPT_STEP_LOG_COPY,
  useReviewEvidenceImage,
  type EvidenceTile,
  type ScriptLogRowView,
  type ScriptLogSectionView,
  type ScriptStepLogView,
} from '../../../headless'
import { IconChevronRight } from '../../icons'
import WalkthroughTab from '../chat/signoff/WalkthroughTab'
import CostChip from '../chips/CostChip'
import ToneBadge from '../chips/ToneBadge'

export type ScriptStepLogProps = {
  projectId: string
  view: ScriptStepLogView
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

function LogRow({ row }: { row: ScriptLogRowView }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <ToneBadge tone={row.kindBadge.tone}>{row.kindBadge.label}</ToneBadge>
        <span className={`min-w-0 flex-1 ${LINE}`}>{row.title}</span>
        {row.sourceBadge ? (
          <ToneBadge tone={row.sourceBadge.tone}>{row.sourceBadge.label}</ToneBadge>
        ) : null}
        {row.cost ? <CostChip label={row.cost} /> : null}
      </span>
      {row.detail ? <span className={MUTED}>{row.detail}</span> : null}
      {row.items.length > 0 ? (
        <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">
          {row.items.map((item, at) => (
            <li key={`${at}-${item}`} className={MUTED}>
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function SectionRow({
  section,
  defaultOpen,
}: {
  section: ScriptLogSectionView
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-(--border-subtle) first:border-t-0">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={section.title}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v)
        }}
        className="flex w-full min-w-0 cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-(--surface-hover)"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13.5px] font-semibold text-(--text-primary)">
              {section.title}
            </span>
            {section.takeOverBadge ? (
              <ToneBadge tone={section.takeOverBadge.tone}>{section.takeOverBadge.label}</ToneBadge>
            ) : null}
          </span>
          <span className="truncate text-[12px] text-(--text-secondary)">{section.line}</span>
        </span>
        {section.cost ? <CostChip label={section.cost} nested /> : null}
        <IconChevronRight
          className={`size-3.5 shrink-0 text-(--text-secondary) transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </div>
      {open ? (
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          {section.rows.map((row) => (
            <LogRow key={row.key} row={row} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function StoppedAt({ projectId, tile }: { projectId: string; tile: EvidenceTile }) {
  const { dataUri } = useReviewEvidenceImage(projectId, tile.ref.id, tile.ref.mediaType)
  return (
    <Part title={SCRIPT_STEP_LOG_COPY.stoppedAt}>
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
 * What a script step did, from its step log: a summary line and cost, the
 * recording of the run, where it stopped when it stopped short, then a row
 * per section that opens on a click to its lines — each by its kind, title,
 * detail and items, an ask marked Pinned or Live, and what it cost. The last
 * section starts open.
 */
export default function ScriptStepLog({ projectId, view }: ScriptStepLogProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {view.summaryLine ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 text-[12.5px] text-(--text-secondary)">
            {view.summaryLine}
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
      {view.sections.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-raised)">
          {view.sections.map((section) => (
            <SectionRow
              key={section.key}
              section={section}
              defaultOpen={section.key === view.openSection}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
