import { useState, type ReactNode } from 'react'

import {
  PROCESS_MANAGER_PRE_READ_TITLE,
  PROCESS_MANAGER_RECOMMENDS_LABEL,
  RUN_DETAILS_COPY,
  processCleanupHeadline,
  type AccessRecordSectionView,
  type ProcessBaseMovedView,
  type ProcessManagerPreReadView,
  type ProcessResumeChoice,
  type UseProcessCleanup,
} from '../../../headless'
import { PROCESS_CLEANUP_COPY } from '../../../headless/utils/processCleanupViewConstants'
import { IconChevronRight } from '../../icons'
import { Button } from '../../primitives/Button'
import { AccessRecordList } from './AccessRecordList'
import { ProcessCleanupBody } from './signoff/ProcessCleanupCard'

export type RunDetailsProps = {
  /** The manager's pre-read of the sign-off. */
  preRead?: ProcessManagerPreReadView
  /** What was added to the run after it started, a note each. */
  workAdded: readonly string[]
  /** The run's cleanup list, as `useProcessCleanup` keeps it. */
  cleanup?: UseProcessCleanup
  /** What the run says about its base branch, as `processBaseMovedView` lays it out. */
  base?: ProcessBaseMovedView
  /** Cross-project access and automatic actions recorded on this run. */
  access?: AccessRecordSectionView
  /** Open the access trail on first draw — the showcase's opened state. */
  accessOpen?: boolean
  /** Takes the base section's choice — bringing the base in and re-checking. */
  onChooseBase?: (choice: ProcessResumeChoice) => void
  className?: string
}

/**
 * "More about this run": what matters less than the decision and the report,
 * each folded to one line until opened — its base branch once that moved on,
 * the manager's pre-read, the work added to the run, its access trail, and
 * its cleanup list. Nothing when there is none of it.
 */
export default function RunDetails({
  preRead,
  workAdded,
  cleanup,
  base,
  access,
  accessOpen = false,
  onChooseBase,
  className = 'mx-3 mt-3',
}: RunDetailsProps) {
  const list = cleanup?.list
  const hasCleanup = !!list && (list.items.length > 0 || !!list.report)
  if (!base && !preRead && workAdded.length === 0 && !hasCleanup && !access) return null
  const baseChoice = onChooseBase ? base?.choice : undefined
  return (
    <section
      aria-label={RUN_DETAILS_COPY.title}
      className={`flex flex-col rounded-xl border border-(--border-subtle) bg-(--surface-raised) px-4 py-2 sm:px-5 ${className}`}
    >
      <h3 className="m-0 py-2 text-[14px] font-semibold text-(--text-primary)">
        {RUN_DETAILS_COPY.title}
      </h3>
      {base ? (
        <Disclosure title={RUN_DETAILS_COPY.baseBranch} meta={base.headline}>
          {base.meaning ? (
            <p className="m-0 text-[12.5px] leading-relaxed text-(--text-secondary)">
              {base.meaning}
            </p>
          ) : null}
          {base.lastUpdate ? (
            <p className="m-0 text-[12.5px] leading-relaxed text-(--text-secondary)">
              {base.lastUpdate}
            </p>
          ) : null}
          {baseChoice && onChooseBase ? (
            <div className="flex flex-col items-start gap-1">
              <Button
                size="sm"
                variant={baseChoice.primary ? 'primary' : 'secondary'}
                onClick={() => onChooseBase(baseChoice.choice)}
              >
                {baseChoice.label}
              </Button>
              <span className="text-[11px] text-(--text-secondary)">{baseChoice.detail}</span>
            </div>
          ) : null}
        </Disclosure>
      ) : null}
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
      {access ? (
        <Disclosure title={access.title} meta={access.summary} startOpen={accessOpen}>
          <AccessRecordList rows={access.rows} />
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
  startOpen = false,
}: {
  title: string
  meta: string
  children: ReactNode
  startOpen?: boolean
}) {
  const [open, setOpen] = useState(startOpen)
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
        <span className="shrink-0 text-[13px] font-semibold text-(--text-primary)">{title}</span>
        <span className="ml-auto min-w-0 truncate text-right text-[12px] text-(--text-muted)">
          {meta}
        </span>
      </button>
      {open ? <div className="flex flex-col gap-2 pb-3 pl-5.5">{children}</div> : null}
    </div>
  )
}
