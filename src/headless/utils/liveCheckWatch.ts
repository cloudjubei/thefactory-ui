import type { ProcessParkChoice, ProcessRun, ProcessStep } from 'thefactory-tools/types'

import {
  LIVE_CHECK_GATE_KIND,
  LIVE_CHECK_WATCH_BADGES,
  LIVE_CHECK_WATCH_COPY,
  LIVE_CHECK_WATCH_DECIDED,
  LIVE_CHECK_WATCH_PROBLEM_PATTERN,
  LIVE_CHECK_WATCH_READY_PATTERN,
} from './liveCheckWatchConstants'
import type { LiveCheckWatchState, LiveCheckWatchView } from './liveCheckWatchTypes'

/** Whether a step is the "Watch it live" gate of an ask-me live check. Pure. */
export function isLiveCheckWatchStep(
  step: Pick<ProcessStep, 'kind' | 'gateKind'> | undefined,
): boolean {
  return step?.kind === 'gate' && step.gateKind === LIVE_CHECK_GATE_KIND
}

/** Whether a step runs a live check on a test account, in either mode. Pure. */
export function isLiveCheckStep(
  step: Pick<ProcessStep, 'liveCheck' | 'kind' | 'gateKind'>,
): boolean {
  return step.liveCheck !== undefined || isLiveCheckWatchStep(step)
}

/** Where the device stands, read from the host's line on the stop. Pure. */
export function liveCheckWatchState(message: string): LiveCheckWatchState {
  if (LIVE_CHECK_WATCH_PROBLEM_PATTERN.test(message)) return 'problem'
  if (LIVE_CHECK_WATCH_READY_PATTERN.test(message.trim())) return 'ready'
  return 'unprepared'
}

/**
 * The "Watch it live" card of a run stopped at an ask-me live check: the
 * host's line, what to walk, and whether it can still go back to the
 * developer. `undefined` for any other stop. Pure.
 */
export function liveCheckWatchView(
  run: Pick<ProcessRun, 'park'> & { plan: { steps: readonly ProcessStep[] } },
  choices: readonly Pick<ProcessParkChoice, 'choice'>[],
): LiveCheckWatchView | undefined {
  const park = run.park
  if (!park || park.reason !== 'gate' || park.childRunId !== undefined) return undefined
  const step = run.plan.steps.find((s) => s.id === park.stepId)
  if (!step || !isLiveCheckWatchStep(step)) return undefined
  const state = liveCheckWatchState(park.message)
  const badge = LIVE_CHECK_WATCH_BADGES[state]
  const sendOffered = choices.some((c) => c.choice === 'send-to-developer')
  return {
    title: LIVE_CHECK_WATCH_COPY.title,
    state,
    ...(badge ? { badge } : {}),
    line: park.message,
    walk: step.liveCheck?.beforeAndAfter
      ? LIVE_CHECK_WATCH_COPY.walkBeforeAndAfter
      : LIVE_CHECK_WATCH_COPY.walkAfter,
    sendOffered,
    ...(sendOffered ? {} : { noPassesLine: LIVE_CHECK_WATCH_COPY.noPassesLine }),
  }
}

/** What a decided "Watch it live" step says on its row; `undefined` before a choice. Pure. */
export function liveCheckWatchDecidedLine(choice: string | undefined): string | undefined {
  return choice === undefined ? undefined : LIVE_CHECK_WATCH_DECIDED[choice]
}
