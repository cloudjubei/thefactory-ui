import type { ReviewTabId } from '../../../../headless'

/** One tab on the bar: a sign-off's evidence, or any other set of tabs. */
export type ReviewTabBarTab<Id extends string> = {
  id: Id
  label: string
  /** Shown as a count pill; `undefined` when the tab has nothing to count. */
  count: number | undefined
}

export type ReviewTabBarProps<Id extends string = ReviewTabId> = {
  tabs: readonly ReviewTabBarTab<Id>[]
  active: Id
  onChange: (tab: Id) => void
  /** Names the bar for a screen reader. */
  ariaLabel?: string
}

/**
 * The evidence tabs. A tab exists only when that kind of proof was filed, so
 * the bar itself says what the run produced — no empty galleries. Any other
 * set of tabs with counts, such as a group's ticket tabs, draws on it too.
 */
export default function ReviewTabBar<Id extends string = ReviewTabId>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: ReviewTabBarProps<Id>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="no-scrollbar flex gap-0.5 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--border-subtle)]"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
              selected
                ? 'border-(--accent-primary) text-(--text-primary)'
                : 'border-transparent text-(--text-muted) hover:text-(--text-primary)'
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span
                // A circle at one digit, a pill only once it needs the width:
                // `min-w` = the height, and the glyph is centred rather than
                // sitting on the text baseline.
                className={`inline-grid h-[16px] min-w-[16px] place-items-center rounded-full border px-1 text-[9.5px] font-semibold leading-none tabular-nums ${
                  selected
                    ? 'border-(--accent-primary)/40 bg-(--accent-primary)/15 text-(--text-primary)'
                    : 'border-(--border-subtle) bg-(--surface-base) text-(--text-muted)'
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
