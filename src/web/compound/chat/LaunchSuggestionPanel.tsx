import type { LaunchSuggestionRow } from '../../../headless/utils/workLaunchViewTypes'
import {
  LAUNCH_SUGGEST_APPLY,
  LAUNCH_SUGGEST_BUSY,
  LAUNCH_SUGGEST_DISMISS,
  LAUNCH_SUGGEST_LABEL,
} from '../../../headless/utils/workLaunchViewConstants'
import { Button } from '../../primitives/Button'

export type LaunchSuggestionPanelProps = {
  /** What the agent suggested, one row per setting — empty until asked. */
  rows: LaunchSuggestionRow[]
  /** The model that suggested it. */
  answeredBy?: string
  busy?: boolean
  error?: string
  /** Ask an agent for the best setup — nothing launches. */
  onAsk: () => void
  /** Set the card's picks from the suggestion; the person still launches. */
  onApply: () => void
  onDismiss: () => void
  disabled?: boolean
}

/**
 * A launch card's "Suggest setup": the ask, then each setting the agent proposed with
 * why, to use or dismiss. Never launches. Purely presentational.
 */
export default function LaunchSuggestionPanel({
  rows,
  answeredBy,
  busy,
  error,
  onAsk,
  onApply,
  onDismiss,
  disabled,
}: LaunchSuggestionPanelProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onAsk} disabled={busy || disabled}>
          {busy ? LAUNCH_SUGGEST_BUSY : LAUNCH_SUGGEST_LABEL}
        </Button>
        {error ? <span className="text-[12px] text-(--status-stuck-fg)">{error}</span> : null}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-(--accent-soft-border) bg-(--accent-soft-bg) px-2.5 py-2">
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.key} className="text-[12.5px] leading-snug">
            <span className="font-semibold text-(--text-primary)">{row.label}:</span>{' '}
            <span className="text-(--text-primary)">{row.value}</span>
            <span className="text-(--text-secondary)"> — {row.reason}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" onClick={onApply} disabled={disabled}>
          {LAUNCH_SUGGEST_APPLY}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          {LAUNCH_SUGGEST_DISMISS}
        </Button>
        {answeredBy ? (
          <span className="ml-auto text-[11px] text-(--text-muted)">by {answeredBy}</span>
        ) : null}
      </div>
    </div>
  )
}
