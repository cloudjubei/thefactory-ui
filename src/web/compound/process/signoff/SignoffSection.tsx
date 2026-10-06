import type { ReactNode } from 'react'

import { IconChevronDown } from '../../../icons'

export type SignoffSectionProps = {
  title: string
  /** What the header says while folded — one line. */
  summary?: ReactNode
  defaultOpen?: boolean
  /** The title in the attention tone — something here waits on the reader. */
  attention?: boolean
  children: ReactNode
}

/**
 * One collapsible section of the code review or the report: the same header
 * layout everywhere — title, a one-line summary, the chevron — so the fixed
 * sections read as one document.
 */
export default function SignoffSection({
  title,
  summary,
  defaultOpen = false,
  attention = false,
  children,
}: SignoffSectionProps) {
  return (
    <details className="group border-t border-(--border-subtle)" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-2.5 py-3 [&::-webkit-details-marker]:hidden">
        <span
          className={`w-40 shrink-0 text-[13px] font-semibold ${attention ? 'text-(--status-working-soft-fg)' : 'text-(--text-primary)'}`}
        >
          {title}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-(--text-secondary)">
          {summary}
        </span>
        <IconChevronDown className="size-3.5 shrink-0 text-(--text-muted) transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-3.5 sm:pl-42.5">{children}</div>
    </details>
  )
}
