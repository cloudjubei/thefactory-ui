import type { ReactNode } from 'react'

import {
  COMMIT_DETAILS_TEXT,
  commitChangesLabel,
  formatDateTime,
  formatFriendlyTimestamp,
  shortSha,
  type CommitDetails,
} from '../../../headless'
import Tooltip from '../../primitives/Tooltip'
import { IconCommit } from '../../icons'
import { CopyButton } from '../CopyButton'

export type CommitCardProps = {
  /** The commit's full sha. */
  sha: string
  details?: CommitDetails
  loading?: boolean
  /** Git does not have the commit here. */
  missing?: boolean
  /** Why the commit could not be read. */
  error?: string
  /** The chip opens the commit — the card says where. */
  openable?: boolean
}

export type CommitChipBaseProps = CommitCardProps & {
  /** Opens the commit. Omitted, the chip is not a button. */
  onOpen?: () => void
  /** Replaces the hover card's body — a host that reads the commit on hover passes its own. */
  renderTooltip?: () => ReactNode
  className?: string
}

/**
 * A commit's hover card: its sha with a copy, subject, author and date, and what
 * it changed — or that it is being read, is not here, or could not be read.
 */
export function CommitCard({ sha, details, loading, missing, error, openable }: CommitCardProps) {
  const fullSha = details?.sha ?? sha
  return (
    <div className="flex w-80 max-w-full flex-col gap-1.5 rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-3 text-[12px] text-(--text-primary) shadow-md">
      <div className="flex items-center gap-1.5">
        <IconCommit className="h-3.5 w-3.5 shrink-0 text-(--text-muted)" />
        <span className="font-mono text-[11.5px] text-(--text-secondary)">{shortSha(fullSha)}</span>
        <span className="grow" />
        <CopyButton text={fullSha} title={COMMIT_DETAILS_TEXT.copy} />
      </div>
      {details ? (
        <>
          <p className="m-0 text-[13px] font-semibold leading-snug">{details.subject}</p>
          <p className="m-0 text-(--text-secondary)">
            {details.authorName} ·{' '}
            <time
              dateTime={new Date(details.authorDate).toISOString()}
              title={formatDateTime(new Date(details.authorDate))}
            >
              {formatFriendlyTimestamp(new Date(details.authorDate).toISOString())}
            </time>
          </p>
          {details.changes ? (
            <p className="m-0 flex items-center gap-2 text-(--text-secondary)">
              <span>{commitChangesLabel(details.changes)}</span>
              <span className="font-mono tabular-nums text-(--status-done-soft-fg)">
                +{details.changes.insertions}
              </span>
              <span className="font-mono tabular-nums text-(--status-stuck-soft-fg)">
                −{details.changes.deletions}
              </span>
            </p>
          ) : null}
        </>
      ) : missing ? (
        <>
          <p className="m-0 font-semibold">{COMMIT_DETAILS_TEXT.missing}</p>
          <p className="m-0 text-(--text-secondary)">{COMMIT_DETAILS_TEXT.missingDetail}</p>
        </>
      ) : error ? (
        <p className="m-0 text-(--text-secondary)">{error}</p>
      ) : loading ? (
        <p className="m-0 text-(--text-muted)">{COMMIT_DETAILS_TEXT.loading}</p>
      ) : null}
      {openable && !missing ? (
        <p className="m-0 text-[11px] text-(--text-muted)">{COMMIT_DETAILS_TEXT.open} ↗</p>
      ) : null}
    </div>
  )
}

/**
 * A commit, as a chip in the ref-chip family: its short sha, its details on
 * hover, and a click that opens it. Pure rendering — the host reads the commit
 * and says where it opens.
 */
export default function CommitChipBase({
  sha,
  details,
  loading,
  missing,
  error,
  onOpen,
  renderTooltip,
  className,
}: CommitChipBaseProps) {
  const chipClassName = [
    'ref-chip',
    onOpen ? 'ref-chip--link' : '',
    missing ? 'ref-chip--missing' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  const body = (
    <>
      <IconCommit className="ref-chip__glyph" />
      {shortSha(sha)}
    </>
  )
  return (
    <Tooltip
      placement="bottom"
      allowedPlacements={['bottom', 'top']}
      zIndex={2000}
      variant="bare"
      content={
        renderTooltip ? (
          renderTooltip()
        ) : (
          <CommitCard
            sha={sha}
            {...(details ? { details } : {})}
            {...(loading ? { loading } : {})}
            {...(missing ? { missing } : {})}
            {...(error ? { error } : {})}
            openable={!!onOpen}
          />
        )
      }
    >
      {onOpen ? (
        <button
          type="button"
          className={chipClassName}
          aria-label={`Commit ${sha}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onOpen()
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            e.stopPropagation()
            onOpen()
          }}
        >
          {body}
        </button>
      ) : (
        <span className={chipClassName} aria-label={`Commit ${sha}`}>
          {body}
        </span>
      )}
    </Tooltip>
  )
}
