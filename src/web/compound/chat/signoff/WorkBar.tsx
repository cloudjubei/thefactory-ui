import { useEffect, useState } from 'react'

import { formatDurationMs } from '../../../../headless'
import { Button } from '../../../primitives/Button'
import Tooltip from '../../../primitives/Tooltip'

export type WorkBarProps = {
  /** What is running — "Verifying on a device", "Capturing screens". */
  label: string
  /** When this work started, so the bar can say how long it has been going. */
  startedAtMs: number | undefined
  /** Stops the work; omitted when the host has nothing to stop. */
  onCancel?: () => void
  cancelling?: boolean
}

/**
 * Takes the decision bar's place while an agent is producing evidence. Replaced,
 * not disabled: a greyed-out Approve still reads as a thing you could click; a
 * bar that has become something else reads as a state you are in.
 *
 * The elapsed time ticks because "still working" and "stuck" look identical
 * without it — a number that keeps moving is the difference.
 */
export default function WorkBar({ label, startedAtMs, onCancel, cancelling }: WorkBarProps) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startedAtMs === undefined) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAtMs])
  const elapsed =
    startedAtMs === undefined ? undefined : formatDurationMs(Math.max(0, now - startedAtMs))

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-md border border-(--status-working-soft-border) bg-(--status-working-soft-bg) px-3 py-2">
      <span className="badge badge--soft badge--working badge--sm">
        {/* Filled and pulsing: something IS happening. A hollow dot means nobody
            has decided yet, which is a different fact. */}
        <span className="badge__dot badge__dot--pulse" />
        Agent working
      </span>
      <span className="text-[12px] font-semibold text-(--text-primary)">{label}</span>
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent text-(--status-working-soft-fg)" />
      {elapsed ? (
        <span className="text-[11px] tabular-nums text-(--text-muted)">{elapsed}</span>
      ) : null}
      <span className="flex-1" />
      {onCancel ? (
        <Tooltip
          placement="top"
          content={
            <div className="max-w-[280px] text-xs">
              <b className="mb-0.5 block font-semibold">Stops the work that has not finished</b>
              <span>Anything already finished keeps its result and stays filed as evidence.</span>
              <span className="mt-1 block text-(--text-muted)">
                The run itself is untouched and stays on its branch.
              </span>
            </div>
          }
        >
          <Button size="sm" variant="ghost" disabled={cancelling} onClick={onCancel}>
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </Button>
        </Tooltip>
      ) : null}
      <span className="basis-full text-[11.5px] text-(--text-secondary)">
        Keep reading — tabs, evidence and the comparison overlay all still work.{' '}
        <b className="text-(--text-primary)">Sign-off comes back when this finishes.</b>
      </span>
    </div>
  )
}
