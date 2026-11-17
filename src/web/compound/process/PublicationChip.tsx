import type { ProcessPublicationView } from '../../../headless'
import ToneBadge from '../chips/ToneBadge'

export interface PublicationChipProps {
  view: ProcessPublicationView
  /** Show the published branch's name beside it. */
  withBranch?: boolean
}

/**
 * A run's published work: "In review" while its pull request is open, then
 * merged or closed, with the pull request one click away. Native peer:
 * `native/compound/process/PublicationChip`.
 */
export default function PublicationChip({ view, withBranch = false }: PublicationChipProps) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
      <ToneBadge tone={view.badge.tone} title={view.branch}>
        {view.badge.label}
      </ToneBadge>
      {view.link ? (
        <a
          href={view.link.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-[12px] font-medium text-(--accent-primary) underline"
        >
          {view.link.label} ↗
        </a>
      ) : null}
      {withBranch ? (
        <code className="min-w-0 truncate font-mono text-[11px] text-(--text-muted)">
          {view.branch}
        </code>
      ) : null}
    </span>
  )
}
