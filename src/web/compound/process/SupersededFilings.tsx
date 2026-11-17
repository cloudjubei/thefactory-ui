import {
  SUPERSEDED_FILINGS_LABEL,
  SUPERSEDED_FILINGS_NOTE,
  supersededFilingsSummary,
  type EvidenceTile,
} from '../../../headless'
import { IconChevronDown } from '../../icons'
import Markdown from '../Markdown'

export type SupersededFilingsProps = {
  filings: readonly EvidenceTile[]
  /** Start open. The product starts closed; a showcase state opens it. */
  defaultOpen?: boolean
}

/**
 * Filings a later try replaced. Closed, they are one labelled row under the
 * current filings. Open, each stays labelled and its text can be read.
 */
export default function SupersededFilings({
  filings,
  defaultOpen = false,
}: SupersededFilingsProps) {
  if (filings.length === 0) return null
  return (
    <details
      className="group rounded-lg border border-(--border-subtle) bg-(--surface-base)"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="badge badge--soft badge--empty badge--sm">{SUPERSEDED_FILINGS_LABEL}</span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-(--text-secondary)">
          {supersededFilingsSummary(filings)}
        </span>
        <IconChevronDown className="size-3.5 shrink-0 text-(--text-muted) transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-2 border-t border-(--border-subtle) px-3 py-2.5">
        <p className="m-0 text-[12px] text-(--text-muted)">{SUPERSEDED_FILINGS_NOTE}</p>
        {filings.map((filing) => (
          <article
            key={filing.ref.id}
            className="flex flex-col gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-raised) px-2.5 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="badge badge--soft badge--empty badge--sm">
                {SUPERSEDED_FILINGS_LABEL}
              </span>
              <span className="min-w-0 truncate text-[13px] font-medium text-(--text-primary)">
                {filing.caption}
              </span>
            </div>
            {filing.text ? (
              <div className="markdown-content text-[12.5px] leading-relaxed text-(--text-secondary)">
                <Markdown text={filing.text} />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </details>
  )
}
