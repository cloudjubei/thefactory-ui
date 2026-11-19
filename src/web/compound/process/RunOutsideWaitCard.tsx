import { useState } from 'react'

import { PROCESS_OUTSIDE_WAIT_COPY as COPY } from '../../../headless/utils/processOutsideWaitConstants'
import type { ProcessOutsideWaitView } from '../../../headless/utils/processOutsideWaitTypes'
import { Button } from '../../primitives/Button'

export type RunOutsideWaitCardProps = {
  view: ProcessOutsideWaitView
  /** Inside a frame that draws its own border. */
  embedded?: boolean
  /** Open the run's own Stop confirm. */
  onCancel?: () => void
  /** Carry on with what came; resolves `false` when refused. */
  onCarryOn?: () => Promise<boolean>
  /** Start with the whole reply showing — for a fixed showcase state. */
  expanded?: boolean
}

/**
 * A run waiting on someone outside it: what it waits for, with the run's own
 * Stop; once it came, who replied and what they wrote, and the answer that
 * carries on — shown going at once, a repeat press doing nothing.
 */
export default function RunOutsideWaitCard({
  view,
  embedded = false,
  onCancel,
  onCarryOn,
  expanded = false,
}: RunOutsideWaitCardProps) {
  const [open, setOpen] = useState(expanded)
  const [going, setGoing] = useState(false)
  const tone = view.kind === 'arrived' ? 'review' : 'on_hold'
  const carryOn = () => {
    if (going || !onCarryOn) return
    setGoing(true)
    void onCarryOn().then((ok) => {
      if (!ok) setGoing(false)
    })
  }
  return (
    <section
      aria-label={view.title}
      className={`flex min-w-0 flex-col gap-2 text-[12.5px] ${embedded ? '' : 'mt-2 rounded-lg p-3'}`}
      style={
        embedded
          ? undefined
          : {
              background: `var(--status-${tone}-soft-bg)`,
              border: `1px solid var(--status-${tone}-soft-border)`,
            }
      }
    >
      <h3 className="m-0 text-[15px] font-semibold leading-snug text-(--text-primary)">
        {view.title}
      </h3>
      {view.kind === 'waiting' ? (
        <p className="m-0 text-(--text-secondary)">{COPY.waitingHint}</p>
      ) : (
        <div className="flex min-w-0 flex-col gap-1">
          <p className="m-0 whitespace-pre-wrap break-words rounded-md border border-(--border-subtle) bg-(--surface-sunken) p-2 text-(--text-primary)">
            {open ? view.detail : view.preview}
          </p>
          {view.cut ? (
            <button
              type="button"
              className="self-start text-[11.5px] underline text-(--text-secondary)"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? COPY.showLess : COPY.showAll}
            </button>
          ) : null}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {view.kind === 'arrived' && onCarryOn ? (
          <Button size="sm" variant="primary" loading={going} disabled={going} onClick={carryOn}>
            {view.carryOnLabel}
          </Button>
        ) : null}
        {onCancel ? (
          <Button size="sm" variant="ghost" disabled={going} onClick={onCancel}>
            {COPY.cancel}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
