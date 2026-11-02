import { useState, type ReactNode } from 'react'

import {
  PROCESS_MANAGER_PRE_READ_TITLE,
  PROCESS_MANAGER_RECOMMENDS_LABEL,
  RUN_DETAILS_COPY,
  processCleanupHeadline,
  type ProcessManagerPreReadView,
  type UseProcessCleanup,
} from '../../../headless'
import { PROCESS_CLEANUP_COPY } from '../../../headless/utils/processCleanupViewConstants'
import { IconChevronRight } from '../../icons'
import { ProcessCleanupBody } from './signoff/ProcessCleanupCard'

export type RunDetailsProps = {
  /** The manager's pre-read of the sign-off. */
  preRead?: ProcessManagerPreReadView
  /** What was added to the run after it started, a note each. */
  workAdded: readonly string[]
  /** The run's cleanup list, as `useProcessCleanup` keeps it. */
  cleanup?: UseProcessCleanup
  className?: string
}

/**
 * "More about this run": what matters less than the decision and the report,
 * each folded to one line until opened — the manager's pre-read, the work
 * added to the run, and its cleanup list. Nothing when there is none of it.
 */
export default function RunDetails({
  preRead,
  workAdded,
  cleanup,
  className = 'mx-3 mt-3',
}: RunDetailsProps) {
  const list = cleanup?.list
  const hasCleanup = !!list && (list.items.length > 0 || !!list.report)
  if (!preRead && workAdded.length === 0 && !hasCleanup) return null
  return (
    <section
      aria-label={RUN_DETAILS_COPY.title}
      className={`flex flex-col rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-4 py-2 sm:px-5 ${className}`}
    >
      <h3 className="m-0 py-2 text-[14px] font-semibold text-(--text-primary)">
        {RUN_DETAILS_COPY.title}
      </h3>
      {preRead ? (
        <Disclosure title={PROCESS_MANAGER_PRE_READ_TITLE} meta={RUN_DETAILS_COPY.preReadMeta}>
          <p className="m-0 text-[12.5px] leading-relaxed text-(--text-secondary)">
            {preRead.summary}
          </p>
          {preRead.items.map((item) => (
            <div key={item.itemId} className="flex flex-col text-[12.5px]">
              <span className="text-(--text-primary)">{item.finding}</span>
              <span className="text-(--text-secondary)">
                {PROCESS_MANAGER_RECOMMENDS_LABEL}: {item.recommendation}
              </span>
            </div>
          ))}
        </Disclosure>
      ) : null}
      {workAdded.length > 0 ? (
        <Disclosure
          title={RUN_DETAILS_COPY.workAdded}
          meta={RUN_DETAILS_COPY.additions(workAdded.length)}
        >
          {workAdded.map((note) => (
            <p key={note} className="m-0 text-[12.5px] leading-relaxed text-(--text-secondary)">
              {note}
            </p>
          ))}
        </Disclosure>
      ) : null}
      {hasCleanup && list && cleanup ? (
        <Disclosure title={PROCESS_CLEANUP_COPY.title} meta={processCleanupHeadline(list)}>
          <ProcessCleanupBody cleanup={cleanup} />
        </Disclosure>
      ) : null}
    </section>
  )
}

/** One folded line: its title and a few words of what is inside, opened in place. */
function Disclosure({
  title,
  meta,
  children,
}: {
  title: string
  meta: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-(--border-subtle)">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 w-full items-center gap-2 py-1.5 text-left"
      >
        <IconChevronRight
          className={`size-3.5 shrink-0 text-(--text-muted) transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <span className="text-[13px] font-semibold text-(--text-primary)">{title}</span>
        <span className="ml-auto min-w-0 truncate text-right text-[12px] text-(--text-muted)">
          {meta}
        </span>
      </button>
      {open ? <div className="flex flex-col gap-2 pb-3 pl-5.5">{children}</div> : null}
    </div>
  )
}
