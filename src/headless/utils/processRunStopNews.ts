import type { ProcessRun } from 'thefactory-tools/types'

import {
  RUN_NEEDS_YOU_NOTIFICATION_TAG,
  RUN_NEEDS_YOU_NOTIFICATION_TITLE,
} from './chatNotifyConstants'
import { isOutsideWaitPending } from './processOutsideWait'
import { processRunAttentionSection } from './processRunAttention'
import type {
  ProcessRunStopCheck,
  ProcessRunStopMarks,
  ProcessRunStopNews,
  ProcessRunStopNotification,
  ProcessRunStopRead,
} from './processRunStopNewsTypes'

const ASK_KEY = 'ask'

function needsPerson(run: ProcessRun, now: number, asks: number): boolean {
  const section = processRunAttentionSection(run, now, { unread: 0, asks })
  return section === 'needs-you' || section === 'sign-off'
}

/**
 * What a top-level run needs the person for, named so the same stop reads the
 * same: its own stop by when it stopped — where the Processes list puts it
 * under Needs you or Sign off (`processRunAttentionSection`), never while its
 * manager has it, it waits on other work or its group's sign-off, or on
 * someone outside it who has not come — else an ask waiting in its chat.
 * `undefined` when it needs nothing of them. What its agent writes changes
 * nothing. Pure.
 */
export function processRunStopKey(run: ProcessRun, now: number, asks: number): string | undefined {
  if (run.parentRunId) return undefined
  if (needsPerson(run, now, 0) && !isOutsideWaitPending(run.park)) {
    return `stop:${run.park?.parkedAt ?? run.status}`
  }
  return asks > 0 && needsPerson(run, now, asks) ? ASK_KEY : undefined
}

/**
 * The runs that came to need the person since the marks were taken, and the
 * marks to look against next. A run is told once for what it needs them for:
 * a stop and the ask of that stop waiting in its chat are one, whichever came
 * first; a later stop is told again. With no marks yet nothing is told —
 * what already waited is only marked. A run whose chat the person set to
 * `nothing` is never told, yet keeps its mark. Pure.
 */
export function processRunStopsSince<T extends ProcessRun>(
  runs: readonly T[],
  now: number,
  marks: ProcessRunStopMarks | undefined,
  read: ProcessRunStopRead<T>,
): ProcessRunStopCheck {
  const next = new Map<string, string>()
  const arrived: ProcessRunStopNews[] = []
  for (const run of runs) {
    const key = processRunStopKey(run, now, read.asksOf(run))
    if (key === undefined) continue
    next.set(run.id, key)
    if (marks === undefined || read.levelOf(run) === 'nothing') continue
    const before = marks.get(run.id)
    const told = before !== undefined && (before === key || before === ASK_KEY || key === ASK_KEY)
    if (told) continue
    arrived.push({
      runId: run.id,
      projectId: run.projectId,
      title: run.title.trim() || run.plan.name,
    })
  }
  return { arrived, marks: next }
}

/** The OS notification of a run that came to need the person: one per run, replacing its last. Pure. */
export function processRunStopNotification(stop: ProcessRunStopNews): ProcessRunStopNotification {
  return {
    title: RUN_NEEDS_YOU_NOTIFICATION_TITLE,
    tag: `${RUN_NEEDS_YOU_NOTIFICATION_TAG}:${stop.runId}`,
    run: stop,
  }
}
