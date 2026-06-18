import {
  IconCheckmarkCircle,
  IconError,
  IconHourglass,
  IconStopCircle,
  IconXCircle,
} from '../../../icons'
import type { ToolResultType } from './types'

/**
 * The single lifecycle status chip shown at the right of a tool card's first
 * row — identical for CLI and API tools. Exactly one of: "Queued" (pending, not
 * yet executing), a spinner (running), or the elapsed time (terminal). Nothing
 * for require_confirmation/aborted/not_allowed (the left icon / Switch convey
 * those). The blue pill style is shared so the three states read the same.
 */
export function StatusChip({
  resultType,
  timeLabel,
}: {
  resultType?: ToolResultType
  timeLabel?: string
}) {
  const chip =
    'inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded-full px-1.5 py-0.5 shrink-0 tabular-nums'
  if (resultType === 'pending') return <span className={chip}>Queued</span>
  if (resultType === 'running') {
    return (
      <span className={`${chip} px-2`} aria-label="Running">
        <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
      </span>
    )
  }
  if ((resultType === 'success' || resultType === 'errored') && timeLabel) {
    return <span className={chip}>{timeLabel}</span>
  }
  return null
}

export default function StatusIcon({ resultType }: { resultType?: ToolResultType }) {
  const cls = 'w-4 h-4'
  switch (resultType) {
    case 'errored':
      return <IconError className={`${cls} text-red-500`} />
    case 'aborted':
      return <IconStopCircle className={`${cls} text-orange-500`} />
    case 'not_allowed':
      return <IconXCircle className={`${cls} text-neutral-500`} />
    case 'pending':
    case 'running':
      return <IconHourglass className={`${cls} text-blue-500`} />
    case 'require_confirmation':
      return <IconHourglass className={`${cls} text-teal-500`} />
    default:
      return <IconCheckmarkCircle className={`${cls} text-green-500`} />
  }
}

export function StatusPill({ resultType }: { resultType?: ToolResultType }) {
  if (!resultType) return null
  const base =
    'text-[10px] text-center uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full'
  const colors = (() => {
    switch (resultType) {
      case 'success':
        return 'bg-green-500/20 text-green-600 dark:text-green-400'
      case 'errored':
        return 'bg-red-500/20 text-red-600 dark:text-red-400'
      case 'aborted':
        return 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
      case 'not_allowed':
        return 'bg-neutral-500/20 text-neutral-600 dark:text-neutral-400'
      case 'require_confirmation':
        return 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
      case 'pending':
      case 'running':
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
      default:
        return 'bg-neutral-500/20 text-neutral-600 dark:text-neutral-400'
    }
  })()
  const label = resultType === 'require_confirmation' ? 'needs confirmation' : resultType
  return <div className={`${base} ${colors}`}>{label.replace(/_/g, ' ')}</div>
}
