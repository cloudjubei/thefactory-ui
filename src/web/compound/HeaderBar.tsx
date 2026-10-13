import type { ReactNode } from 'react'

export type HeaderBarProps = {
  /** What sits before the title — the "i" button, the kind tile, a breadcrumb. */
  leading?: ReactNode
  /**
   * The title text; long ones truncate with the whole title on hover. Absent
   * where the surrounding chrome already shows it — the pill then leads the meta line.
   */
  title?: string
  /** The status pill beside the title. */
  pill?: ReactNode
  /** The line under the title — where it sits, its time and cost. */
  meta?: ReactNode
  /** The controls on the right. */
  trailing?: ReactNode
  /** Rendered inside the header, after its row — a dropdown anchored below it. */
  children?: ReactNode
  /** Stays at the top of a scrolling page. */
  sticky?: boolean
}

/**
 * The one header layout the chat and the process run share: leading tile, the
 * title with its status pill over a meta line of context, time and cost, and
 * the controls on the right.
 */
export default function HeaderBar({
  leading,
  title,
  pill,
  meta,
  trailing,
  children,
  sticky = false,
}: HeaderBarProps) {
  return (
    <header
      className={`${sticky ? 'sticky top-0 z-10' : 'relative'} flex shrink-0 flex-wrap items-center gap-2.5 border-b border-(--border-subtle) bg-(--surface-raised) px-3.5 py-2.5`}
    >
      {leading}
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
        {title ? (
          <div className="flex min-w-0 items-center gap-2">
            <h1
              className="m-0 min-w-0 truncate text-[15px] font-semibold leading-snug text-(--text-primary)"
              title={title}
            >
              {title}
            </h1>
            {pill}
          </div>
        ) : null}
        {meta || (!title && pill) ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[12px] text-(--text-secondary)">
            {title ? null : pill}
            {meta}
          </div>
        ) : null}
      </div>
      {trailing ? (
        <div className="relative ml-auto flex shrink-0 flex-wrap items-center gap-1.5">
          {trailing}
        </div>
      ) : null}
      {children}
    </header>
  )
}
