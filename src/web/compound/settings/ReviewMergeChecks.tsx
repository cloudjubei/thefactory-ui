import {
  REVIEW_MERGE_CHECKS_TEXT as TEXT,
  type ReviewMergeChecksRepositoryView,
  type ReviewMergeChecksView,
} from '../../../headless'
import Alert from '../../primitives/Alert'

export type ReviewMergeChecksPanelProps = {
  view: ReviewMergeChecksView
  onRequired: (repository: string, check: string, required: boolean) => void
}

const MUTED = 'm-0 text-[12px] text-(--text-muted)'

/**
 * The checks the group's approve-and-merge waits for: per repository, each
 * check seen on its recent pull requests with a "Required to merge" tick box,
 * ticked unless the group lets it go. Each tick saves at once.
 */
export function ReviewMergeChecksPanel({ view, onRequired }: ReviewMergeChecksPanelProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">{TEXT.heading}</span>
        <span className="text-xs opacity-60">{TEXT.hint}</span>
      </div>
      {view.readError ? <Alert>{view.readError}</Alert> : null}
      {view.actionError ? <Alert>{view.actionError}</Alert> : null}
      {view.loading ? <p className={MUTED}>{TEXT.loading}</p> : null}
      {view.empty ? <p className={MUTED}>{TEXT.none}</p> : null}
      {view.repositories.map((repo) => (
        <RepositoryChecks key={repo.repository} repo={repo} onRequired={onRequired} />
      ))}
    </div>
  )
}

function RepositoryChecks({
  repo,
  onRequired,
}: {
  repo: ReviewMergeChecksRepositoryView
  onRequired: ReviewMergeChecksPanelProps['onRequired']
}) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-md border border-(--border-subtle)">
      <div className="flex min-w-0 items-center gap-2 bg-(--surface-muted) px-3 py-1.5">
        <span
          className="min-w-0 flex-1 truncate font-mono text-[12px] font-medium"
          title={repo.repository}
        >
          {repo.repository}
        </span>
        {repo.checks.length > 0 ? (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {TEXT.required}
          </span>
        ) : null}
      </div>
      {repo.error ? (
        <p className="m-0 break-words px-3 py-1.5 text-[12px] text-(--text-muted)">{repo.error}</p>
      ) : null}
      <ul className="m-0 flex list-none flex-col divide-y divide-(--border-subtle) p-0">
        {repo.checks.map((check) => (
          <li key={check.name}>
            <label
              className={`flex min-w-0 cursor-pointer items-center gap-2 px-3 py-1.5 text-[12.5px] ${
                check.saving ? 'opacity-70' : ''
              }`}
            >
              <span
                className={`min-w-0 flex-1 truncate ${
                  check.required ? 'text-(--text-primary)' : 'text-(--text-muted)'
                }`}
                title={check.name}
              >
                {check.name}
              </span>
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-(--accent-primary)"
                checked={check.required}
                aria-label={TEXT.requiredOf(check.name)}
                onChange={(e) => onRequired(check.repository, check.name, e.target.checked)}
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
