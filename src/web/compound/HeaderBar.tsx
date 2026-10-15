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
  /**
   * A narrow host — a docked panel or a sheet: two rows. The first keeps the
   * leading tile, the title (truncating, but always given the room left) and
   * the controls; the second the pill, the meta line and `secondary`, wrapping
   * as needed. Untitled, the pill and meta take the title's place; with nothing
   * left for it, there is no second row.
   */
  narrow?: boolean
  /** Narrow only: what follows the meta line on the second row — a model chip. */
  secondary?: ReactNode
}

/**
 * The one header layout the chat and the process run share: leading tile, the
 * title with its status pill over a meta line of context, time and cost, and
 * the controls on the right — on two rows in a narrow host.
 */
export default function HeaderBar({
  leading,
  title,
  pill,
  meta,
  trailing,
  children,
  sticky = false,
  narrow = false,
  secondary,
}: HeaderBarProps) {
  const position = sticky ? 'sticky top-0 z-10' : 'relative'
  if (narrow) {
    return (
      <header
        className={`${position} flex shrink-0 flex-col gap-1.5 border-b border-(--border-subtle) bg-(--surface-raised) px-3.5 py-2.5`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {leading}
          {title ? (
            <h1
              className="m-0 min-w-0 flex-1 truncate text-[15px] font-semibold leading-snug text-(--text-primary)"
              title={title}
            >
              {title}
            </h1>
          ) : (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-[12px] text-(--text-secondary)">
              {pill}
              {meta}
            </div>
          )}
          {trailing ? (
            <div className="relative flex shrink-0 items-center gap-1.5">{trailing}</div>
          ) : null}
        </div>
        {(title && (pill || meta)) || secondary ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[12px] text-(--text-secondary)">
            {title ? pill : null}
            {title ? meta : null}
            {secondary}
          </div>
        ) : null}
        {children}
      </header>
    )
  }
  return (
    <header
      className={`${position} flex shrink-0 flex-wrap items-center gap-2.5 border-b border-(--border-subtle) bg-(--surface-raised) px-3.5 py-2.5`}
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
