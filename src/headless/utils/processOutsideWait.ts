import type { ProcessPark, ProcessRun } from 'thefactory-tools/types'

import { PROCESS_OUTSIDE_PREVIEW_LINES } from './processOutsideWaitConstants'
import type { ProcessOutsideWaitView } from './processOutsideWaitTypes'

/** Whether a park waits on someone outside the run that has not come yet: nothing waits on the person. Pure. */
export function isOutsideWaitPending(
  park: Pick<ProcessPark, 'reason' | 'ask'> | undefined,
): boolean {
  return park?.reason === 'step-waiting' && !!park.ask?.outside && !park.ask.outside.arrived
}

/**
 * A run's stop while it waits on someone outside it: still waiting, or what
 * came with the answer that carries on from it — the preview cut to a few
 * lines. Nothing for any other stop. Pure.
 */
export function processOutsideWaitView(
  run: Pick<ProcessRun, 'park'>,
): ProcessOutsideWaitView | undefined {
  const park = run.park
  const outside = park?.reason === 'step-waiting' ? park.ask?.outside : undefined
  if (!park?.ask || !outside) return undefined
  const arrived = outside.arrived
  if (!arrived) return { kind: 'waiting', title: park.ask.title, detail: park.ask.detail }
  const lines = arrived.detail.split('\n')
  const cut = lines.length > PROCESS_OUTSIDE_PREVIEW_LINES
  return {
    kind: 'arrived',
    title: arrived.title,
    preview: cut ? lines.slice(0, PROCESS_OUTSIDE_PREVIEW_LINES).join('\n') : arrived.detail,
    detail: arrived.detail,
    cut,
    carryOnLabel: arrived.carryOnLabel,
  }
}
