import type { ChatContextFillView } from '../../../headless'
import { CHAT_CONTEXT_FILL_COPY } from '../../../headless'
import Tooltip from '../../primitives/Tooltip'
import ContextFillPanel, { CONTEXT_FILL_LEVEL_BAR } from './ContextFillPanel'
import { CHIP_PILL_NEUTRAL } from './pillStyles'

/** `meter` — a small bar and the share; `ring` — a small ring and the share; `words` — "Context" and the share. */
export type ContextFillChipAppearance = 'meter' | 'ring' | 'words'

export type ContextFillChipProps = {
  /** The fill and Compact now, from `useChatHeaderView`. */
  view: ChatContextFillView
  appearance?: ContextFillChipAppearance
}

const RING_LEVEL_STROKE = {
  roomy: 'var(--accent-primary)',
  filling: 'var(--status-working-bg)',
  'nearly-full': 'var(--status-stuck-bg)',
} as const

function Ring({ view }: { view: ChatContextFillView }) {
  const radius = 5
  const round = 2 * Math.PI * radius
  return (
    <svg viewBox="0 0 14 14" className="size-3.5 -rotate-90" aria-hidden>
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        strokeWidth="2.5"
        stroke="var(--border-default)"
      />
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        strokeWidth="2.5"
        stroke={RING_LEVEL_STROKE[view.level]}
        strokeDasharray={`${(round * (view.percent ?? 0)) / 100} ${round}`}
      />
    </svg>
  )
}

function Meter({ view }: { view: ChatContextFillView }) {
  return (
    <span
      className="h-1.5 w-6 overflow-hidden rounded-full bg-(--surface-overlay) outline outline-1 outline-(--border-subtle)"
      aria-hidden
    >
      <span
        className={`block h-full rounded-full ${CONTEXT_FILL_LEVEL_BAR[view.level]}`}
        style={{ width: `${view.percent ?? 0}%` }}
      />
    </span>
  )
}

/**
 * How full a chat's working context is, as a chip in its header, the same on
 * every model. Hover or focus shows the fill, a click or Enter pins it with
 * Compact now on it, like the cost and time chips beside it.
 */
export default function ContextFillChip({ view, appearance = 'meter' }: ContextFillChipProps) {
  const shared = view.percent !== undefined
  return (
    <span className="inline-flex" aria-label={CHAT_CONTEXT_FILL_COPY.chipLabel(view.label)}>
      <Tooltip
        content={<ContextFillPanel view={view} />}
        placement="bottom"
        allowedPlacements={['bottom', 'top']}
        sideAlign="end"
        anchorTabIndex={0}
        anchorClassName="inline-flex cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
      >
        <span className={`inline-flex items-center gap-1 ${CHIP_PILL_NEUTRAL}`}>
          {appearance === 'meter' && shared ? <Meter view={view} /> : null}
          {appearance === 'ring' && shared ? <Ring view={view} /> : null}
          {appearance === 'words' && shared ? (
            <span className="text-(--text-muted)">{CHAT_CONTEXT_FILL_COPY.title}</span>
          ) : null}
          <span className="tabular-nums">{view.label}</span>
        </span>
      </Tooltip>
    </span>
  )
}
