import { useState, type ReactNode } from 'react'

import { RUN_STEPS_CARD_COPY } from '../../../headless'

export type RunStepsCardProps = {
  /** "10 of 11 done". */
  line: string
  total: number
  /** Open from the start — while the run works and nothing waits on the person. */
  defaultOpen: boolean
  /** The steps themselves. */
  children: ReactNode
  className?: string
}

/** A run's steps under one line of how far it got — folded while something else leads the page. */
export default function RunStepsCard({
  line,
  total,
  defaultOpen,
  children,
  className = 'mx-3 mt-3',
}: RunStepsCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section
      aria-label={RUN_STEPS_CARD_COPY.title}
      className={`flex flex-col rounded-xl border border-(--border-subtle) bg-(--surface-raised) ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-4 py-3 sm:px-5">
        <h3 className="m-0 text-[14px] font-semibold text-(--text-primary)">
          {RUN_STEPS_CARD_COPY.title}
        </h3>
        <span className="text-[12.5px] text-(--text-muted)">{line}</span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="ml-auto text-[12.5px] font-medium text-(--accent-primary) hover:underline"
        >
          {open ? RUN_STEPS_CARD_COPY.hide : RUN_STEPS_CARD_COPY.show(total)}
        </button>
      </div>
      {open ? <div className="border-t border-(--border-subtle) pb-1.5">{children}</div> : null}
    </section>
  )
}
