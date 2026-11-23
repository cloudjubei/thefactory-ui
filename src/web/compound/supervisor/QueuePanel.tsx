import { useState } from 'react'
import { workQueueEntryKey } from 'thefactory-tools/utils'

import type { UseWorkQueue } from '../../../headless/hooks/useWorkQueue'
import { WORK_QUEUE_COPY } from '../../../headless/utils/workQueueConstants'
import type { WorkQueueCandidate, WorkQueueRowView } from '../../../headless/utils/workQueueTypes'
import { IconArrowDown, IconArrowUp, IconClose, IconPlus } from '../../icons'

export type QueuePanelProps = {
  queue: Pick<UseWorkQueue, 'view' | 'loading' | 'error' | 'moveUp' | 'moveDown' | 'remove' | 'add'>
  /** Stories and group stories the person may queue; those queued already are left out. */
  candidates?: readonly WorkQueueCandidate[]
  /** Open an entry's story or group story. */
  onOpen?: (row: WorkQueueRowView) => void
}

const CAPTION = 'text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)'
const ICON_BUTTON =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-(--text-secondary) enabled:hover:bg-(--surface-hover) disabled:opacity-40'

function StateChip({ row }: { row: WorkQueueRowView }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border px-2 text-[11px] font-semibold leading-[18px] whitespace-nowrap"
      style={{
        background: `var(--status-${row.tone}-soft-bg)`,
        color: `var(--status-${row.tone}-soft-fg)`,
        borderColor: `var(--status-${row.tone}-soft-border)`,
      }}
    >
      {row.stateLabel}
    </span>
  )
}

/**
 * The ordered queue of a project, a group or the whole Overseer: each entry
 * with where it stands, moved up and down, removed, and added from the stories
 * the host offers; the cap in use above it. A row opens its story. Native
 * peer: `native/compound/supervisor/QueuePanel`.
 */
export default function QueuePanel({ queue, candidates = [], onOpen }: QueuePanelProps) {
  const [adding, setAdding] = useState(false)
  const view = queue.view
  const queued = new Set(view?.rows.map((r) => r.key) ?? [])
  const addable = candidates.filter((c) => !queued.has(workQueueEntryKey(c.entry)))
  return (
    <section className="flex flex-col gap-2" aria-label={WORK_QUEUE_COPY.title}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={CAPTION}>{WORK_QUEUE_COPY.title}</h3>
        {view?.capLine ? (
          <span className="text-[12px] text-(--text-secondary)">{view.capLine}</span>
        ) : null}
        {view?.waitingLine ? (
          <span className="text-[12px] text-(--text-secondary)">· {view.waitingLine}</span>
        ) : null}
        {candidates.length > 0 ? (
          <button
            type="button"
            aria-expanded={adding}
            onClick={() => setAdding((open) => !open)}
            className="ml-auto inline-flex h-7 items-center gap-1 rounded-md border border-(--border-subtle) px-2 text-[12px] text-(--text-primary) hover:bg-(--surface-hover)"
          >
            <IconPlus className="h-3.5 w-3.5" />
            {WORK_QUEUE_COPY.add}
          </button>
        ) : null}
      </div>
      {view?.capReached ? (
        <div className="text-[12px] text-(--status-on_hold-soft-fg)">
          {WORK_QUEUE_COPY.capReached}
        </div>
      ) : null}
      {queue.error ? (
        <div className="text-[12px] text-(--status-stuck-fg)">{queue.error}</div>
      ) : null}
      {adding ? (
        <div
          className="flex flex-col overflow-hidden rounded-lg border border-(--border-subtle)"
          aria-label={WORK_QUEUE_COPY.addPick}
        >
          {addable.map((candidate) => (
            <button
              key={workQueueEntryKey(candidate.entry)}
              type="button"
              className="px-3 py-2 text-left text-[13px] text-(--text-primary) hover:bg-(--surface-hover)"
              onClick={() => {
                queue.add(candidate.entry)
                setAdding(false)
              }}
            >
              {candidate.title}
            </button>
          ))}
        </div>
      ) : null}
      {view && view.rows.length === 0 ? (
        <div className="text-[13px] text-(--text-secondary)">{WORK_QUEUE_COPY.empty}</div>
      ) : null}
      {view && view.rows.length > 0 ? (
        <ol className="m-0 flex list-none flex-col overflow-hidden rounded-xl border border-(--border-subtle) p-0">
          {view.rows.map((row) => (
            <li
              key={row.key}
              data-queue-row
              onClick={() => onOpen?.(row)}
              className={`flex items-center gap-2.5 border-b border-(--border-subtle) bg-(--surface-raised) px-3 py-2 last:border-b-0 ${onOpen ? 'cursor-pointer hover:bg-(--surface-hover)' : ''}`}
            >
              <span className="w-5 shrink-0 text-right text-[12px] text-(--text-muted)">
                {row.index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13.5px] font-medium text-(--text-primary)">
                  {row.title}
                </span>
                <span className="truncate text-[12px] text-(--text-secondary)">
                  {row.where}
                  {row.skipsPlanning ? ` · ${WORK_QUEUE_COPY.skipsPlanning}` : ''}
                </span>
                {row.detail ? (
                  <span className="truncate text-[12px] text-(--text-secondary)">{row.detail}</span>
                ) : null}
              </div>
              <StateChip row={row} />
              <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  aria-label={WORK_QUEUE_COPY.moveUp}
                  disabled={!row.canMoveUp}
                  onClick={() => queue.moveUp(row.entry)}
                  className={ICON_BUTTON}
                >
                  <IconArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={WORK_QUEUE_COPY.moveDown}
                  disabled={!row.canMoveDown}
                  onClick={() => queue.moveDown(row.entry)}
                  className={ICON_BUTTON}
                >
                  <IconArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={WORK_QUEUE_COPY.remove}
                  onClick={() => queue.remove(row.entry)}
                  className={ICON_BUTTON}
                >
                  <IconClose className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}
