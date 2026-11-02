import {
  PARK_ANSWERS_COPY,
  PROCESS_MANAGER_OPEN_CHAT_LABEL,
  type ProcessRunManagerView,
} from '../../../headless'
import { Button } from '../../primitives/Button'

export type RunManagerBarProps = {
  status: NonNullable<ProcessRunManagerView['status']>
  /** What the run stopped on, as its stop says it. */
  headline?: string
  /** Open the run's chat, where the manager works — offered while it waits on a card there. */
  onOpenChat?: () => void
}

/**
 * The slim line at the top of a run while its manager has the stop: looking
 * into it, holding it until something is done, or waiting on a card it raised.
 * Nothing is asked of the person until the manager hands the stop over with
 * its answers.
 */
export default function RunManagerBar({ status, headline, onOpenChat }: RunManagerBarProps) {
  const waiting = status.state === 'waiting'
  const tone = waiting ? 'on_hold' : 'working'
  return (
    <div
      role="status"
      className="mx-3 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-4 py-3"
      style={{
        background: `color-mix(in srgb, var(--status-${tone}-soft-bg) 45%, var(--surface-raised))`,
        border: `1px solid var(--status-${tone}-soft-border)`,
      }}
    >
      <span
        aria-hidden
        className="size-2.5 shrink-0 animate-pulse rounded-full"
        style={{ background: `var(--status-${tone}-fg)` }}
      />
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-0.5">
        {headline ? (
          <span className="text-[13.5px] font-semibold text-(--text-primary)">{headline}</span>
        ) : null}
        <span className="text-[12.5px] text-(--text-secondary)">{status.text}</span>
        {status.state === 'looking' ? (
          <span className="text-[12px] text-(--text-muted)">{PARK_ANSWERS_COPY.answersComing}</span>
        ) : null}
      </div>
      {waiting && onOpenChat ? (
        <Button size="sm" variant="secondary" onClick={onOpenChat}>
          {PROCESS_MANAGER_OPEN_CHAT_LABEL}
        </Button>
      ) : null}
    </div>
  )
}
