import type { LiveCheckWatchView } from '../../../headless'
import RichText from '../files/RichText'

const BADGE_TONES: Record<LiveCheckWatchView['state'], string> = {
  ready: 'done',
  problem: 'stuck',
  unprepared: 'on_hold',
}

export type LiveCheckWatchHeaderProps = {
  view: LiveCheckWatchView
  /** On a run's own page the card is the page's heading. */
  embedded?: boolean
}

/**
 * The top of a "Watch it live" stop: its name and whether the device is set
 * up, the host's own line, what to walk, and when no pass is left to send it
 * back. Its answers are the stop's own buttons below — never a sign-off.
 * Native peer: `native/compound/process/LiveCheckWatchHeader`.
 */
export default function LiveCheckWatchHeader({
  view,
  embedded = false,
}: LiveCheckWatchHeaderProps) {
  const tone = BADGE_TONES[view.state]
  return (
    <div className="flex flex-col gap-1.5" data-live-check-watch={view.state}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            embedded
              ? 'text-[17px] font-semibold leading-snug text-(--text-primary)'
              : 'text-[13px] font-semibold text-(--text-primary)'
          }
        >
          {view.title}
        </span>
        {view.badge ? (
          <span
            className="rounded-full px-2 py-px text-[11px] font-medium"
            style={{
              background: `var(--status-${tone}-soft-bg)`,
              color: `var(--status-${tone}-soft-fg)`,
              border: `1px solid var(--status-${tone}-soft-border)`,
            }}
          >
            {view.badge}
          </span>
        ) : null}
      </div>
      <div className="text-[12.5px] text-(--text-primary)">
        <RichText text={view.line} />
      </div>
      <span className="text-[11.5px] text-(--text-secondary)">{view.walk}</span>
      {view.noPassesLine ? (
        <span className="text-[11.5px] text-(--text-muted)">{view.noPassesLine}</span>
      ) : null}
    </div>
  )
}
