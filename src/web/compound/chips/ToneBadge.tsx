import type { ProcessStatusTone } from '../../../headless'

export type ToneBadgeProps = {
  tone: ProcessStatusTone
  children: string
}

/** A soft status pill in the package's own semantic palette — a run's, story's or feature's status. */
export default function ToneBadge({ tone, children }: ToneBadgeProps) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-px text-[11px]"
      style={{
        background: `var(--status-${tone}-soft-bg)`,
        color: `var(--status-${tone}-soft-fg)`,
        border: `1px solid var(--status-${tone}-soft-border)`,
      }}
    >
      {children}
    </span>
  )
}
