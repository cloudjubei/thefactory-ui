import {
  processRunClosureOptions,
  type ProcessFeatureClosureStatus,
  type ProcessRunClosureRow,
} from '../../../headless'
import { Button } from '../../primitives/Button'

export type FeatureClosureListProps = {
  rows: readonly ProcessRunClosureRow[]
  onPick: (
    featureId: string,
    pick: { status?: ProcessFeatureClosureStatus; reason?: string },
  ) => void
  disabled?: boolean
}

/**
 * The features of a run that ended without a sign-off, each with what it is now,
 * what the run did on it, and a pick of what it is left as — the same on the
 * run's page and on an agent's card.
 */
export function FeatureClosureList({ rows, onPick, disabled }: FeatureClosureListProps) {
  const options = processRunClosureOptions()
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.map((row) => (
        <li
          key={row.featureId}
          className="flex flex-col gap-1 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-(--text-primary)">{row.title}</span>
            <span className="text-[10px] text-(--text-tertiary)">now {row.currentStatus}</span>
          </div>
          {row.work.length > 0 ? (
            <span className="text-[11px] text-(--text-secondary)">{row.work.join(' ')}</span>
          ) : null}
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={row.title}>
            {options.map((o) => (
              <Button
                key={o.status}
                size="sm"
                variant={row.status === o.status ? 'primary' : 'secondary'}
                aria-pressed={row.status === o.status}
                title={o.label}
                disabled={disabled}
                onClick={() => onPick(row.featureId, { status: o.status })}
              >
                {o.status}
              </Button>
            ))}
          </div>
          {row.status === 'blocked' ? (
            <input
              type="text"
              value={row.reason}
              placeholder="Why is it blocked?"
              disabled={disabled}
              onChange={(e) => onPick(row.featureId, { reason: e.target.value })}
              className="rounded-md border border-(--border-subtle) bg-(--surface-overlay) px-2 py-1 text-[12px]"
            />
          ) : null}
          <span className="text-[10px] text-(--text-tertiary)">
            {row.status === row.suggested ? row.why : `Suggested: ${row.suggested} — ${row.why}`}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default FeatureClosureList
