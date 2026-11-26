import type { ProcessResumeChoice, ProcessRun, ProcessRunCursor } from 'thefactory-tools/types'

import type { ParkAnswerView, ParkAnswersView } from './processParkAnswersTypes'
import {
  PROCESS_ANSWER_CONTINUES,
  PROCESS_ANSWER_PENDING_BASE,
  PROCESS_ANSWER_PENDING_BASE_UNNAMED,
  PROCESS_ANSWER_PENDING_FALLBACK,
  PROCESS_ANSWER_PENDING_LINES,
} from './processRunAnswerConstants'
import type { ProcessAnswerInFlight, ProcessRunAnswering } from './processRunAnswerTypes'

/**
 * A stopped run as it reads the moment its stop is answered, before the host
 * replies: going on from the step it stopped at, its stop gone. `undefined`
 * where nothing can be assumed — an answer that may end the run or decide
 * where it goes, any answer at a gate, a run that is not stopped, or one whose
 * stop belongs to a nested run. Pure.
 */
export function optimisticAnsweredRun<T extends ProcessRun>(
  run: T,
  choice: ProcessResumeChoice,
): T | undefined {
  const park = run.park
  if (run.status !== 'parked' || !park || park.childRunId) return undefined
  if (park.reason === 'gate' || !PROCESS_ANSWER_CONTINUES.has(choice)) return undefined
  return goingOn(run)
}

/**
 * A parent run as it reads while the nested run its stop mirrors is shown
 * going on: going on too, from the step that holds the nested run. The parent
 * itself whenever `nested` is not that run, or still reads stopped. Pure.
 */
export function optimisticMirrorRun<T extends ProcessRun>(
  parent: T,
  nested: Pick<ProcessRun, 'id' | 'status' | 'park'> | undefined,
): T {
  const mirrored = parent.park?.childRunId
  if (!nested || !mirrored || mirrored !== nested.id) return parent
  if (parent.status !== 'parked' || nested.status !== 'running' || nested.park) return parent
  return goingOn(parent)
}

/**
 * The answer on its way for a run, with the run as it stands at the stop it
 * answers — nothing once the run holds another stop, or none. Pure.
 */
export function processRunAnswering<T extends ProcessRun>(
  run: T | undefined,
  inFlight: ProcessAnswerInFlight | undefined,
): ProcessRunAnswering<T> | undefined {
  if (!run?.park || !inFlight || run.park.parkedAt !== inFlight.parkedAt) return undefined
  return { ...inFlight, stopped: run }
}

/**
 * The run to show while an answer is on its way: going on where that can be
 * assumed, else the record as it is. Pure.
 */
export function processRunShownWhileAnswering<T extends ProcessRun>(
  run: T | undefined,
  answering: ProcessRunAnswering<T> | undefined,
): T | undefined {
  if (!run || !answering) return run
  return optimisticAnsweredRun(run, answering.choice) ?? run
}

/**
 * Whether a record just read or pushed is older than the one held, so it must
 * not replace it. A record as new as the one held, or either without a time,
 * is taken. Pure.
 */
export function processRunRecordIsStale(
  held: Partial<Pick<ProcessRun, 'updatedAt'>> | undefined,
  incoming: Partial<Pick<ProcessRun, 'updatedAt'>>,
): boolean {
  if (held?.updatedAt === undefined || incoming.updatedAt === undefined) return false
  return incoming.updatedAt < held.updatedAt
}

/** What the stop's card says in place of its headline while an answer is on its way. Pure. */
export function processAnswerPendingLine(
  answer: Pick<ProcessAnswerInFlight, 'choice' | 'recovery'>,
  run: Pick<ProcessRun, 'workBranch'>,
): string {
  if (answer.recovery) return PROCESS_ANSWER_PENDING_FALLBACK
  if (answer.choice === 'update-base') {
    return PROCESS_ANSWER_PENDING_BASE(
      run.workBranch?.baseRef ?? PROCESS_ANSWER_PENDING_BASE_UNNAMED,
    )
  }
  return PROCESS_ANSWER_PENDING_LINES[answer.choice] ?? PROCESS_ANSWER_PENDING_FALLBACK
}

/**
 * Which of a stop's answers is the one on its way — the one in front when
 * several are on its choice — by its key; none when the stop does not offer
 * it. A way on the stopped step offers is sent as `retry` with its id. Pure.
 */
export function parkPendingAnswerKey(
  view: ParkAnswersView,
  answer: Pick<ProcessAnswerInFlight, 'choice' | 'recovery'> | undefined,
): string | undefined {
  if (!answer) return undefined
  const sends = (one: ParkAnswerView) =>
    one.choice === 'recover'
      ? answer.choice === 'retry' &&
        answer.recovery !== undefined &&
        one.offer.recovery?.id === answer.recovery
      : answer.recovery === undefined && one.choice === answer.choice
  const all = [...(view.lead ? [view.lead] : []), ...view.others, ...view.minor]
  return all.find(sends)?.key
}

function goingOn<T extends ProcessRun>(run: T): T {
  const { park, ...rest } = run
  const cursor = cursorAt(run, park?.stepId)
  return { ...rest, status: 'running', ...(cursor ? { cursor } : {}) } as T
}

function cursorAt(run: ProcessRun, stepId: string | undefined): ProcessRunCursor | undefined {
  if (!stepId || run.cursor?.stepId === stepId) return run.cursor
  const latest = run.ledger.filter((entry) => entry.stepId === stepId).at(-1)
  return { stepId, iteration: latest?.iteration ?? 1 }
}
