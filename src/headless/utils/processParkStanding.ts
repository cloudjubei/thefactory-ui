import type { ProcessLedgerEntry } from 'thefactory-tools/types'
import { getChatContextKey, processRunChatContext } from 'thefactory-tools/utils'

import {
  PROCESS_PARK_ANSWERED_BY,
  PROCESS_PARK_ANSWER_WORDS,
  PROCESS_PARK_HANDLED,
  PROCESS_PARK_SUPERSEDED,
} from './processParkStandingConstants'
import type {
  ParkClosure,
  ParkStanding,
  ParkStandingRun,
  ParkToken,
} from './processParkStandingTypes'
import { PROCESS_SIGNOFF_DECIDED_VIA_TEXT } from './processSignoffRecordConstants'
import { formatFriendlyTimestamp } from './time'

type Answer = NonNullable<ProcessLedgerEntry['override']>

/** Whether the run still waits at the park. Pure. */
export function processRunWaitsAt(run: ParkStandingRun, token: ParkToken): boolean {
  return run.status === 'parked' && run.park?.parkedAt === token.parkedAt
}

/**
 * The answer that took the run off a park: the first recorded at or after it,
 * and before the park the run waits at now — an answer to that one is not yet given.
 */
function answerTo(run: ParkStandingRun, parkedAt: number): Answer | undefined {
  const until = run.park && run.park.parkedAt > parkedAt ? run.park.parkedAt : Infinity
  let first: Answer | undefined
  for (const entry of run.ledger) {
    const answer = entry.override
    if (!answer || answer.at < parkedAt || answer.at >= until) continue
    if (!first || answer.at < first.at) first = answer
  }
  return first
}

function runChatKeys(runs: readonly (ParkStandingRun | undefined)[]): Set<string> {
  const keys = new Set<string>()
  for (const run of runs) if (run) keys.add(getChatContextKey(processRunChatContext(run)))
  return keys
}

/** Who gave an answer and what it did, as one phrase: "you allowed it on web". */
function answerPhrase(answer: Answer, runChats: Set<string>): string {
  const did = PROCESS_PARK_ANSWER_WORDS[answer.choice]
  if (answer.decidedBy === 'person') {
    const via =
      answer.decidedVia && answer.decidedVia !== 'tool' && answer.decidedVia !== 'manager'
        ? ` ${PROCESS_SIGNOFF_DECIDED_VIA_TEXT[answer.decidedVia]}`
        : ''
    return `${PROCESS_PARK_ANSWERED_BY.person} ${did}${via}`
  }
  if (answer.decidedBy === 'manager') return `${PROCESS_PARK_ANSWERED_BY.manager} ${did}`
  if (answer.decidedBy === 'agent') {
    const who =
      answer.chatContextId && runChats.has(answer.chatContextId)
        ? PROCESS_PARK_ANSWERED_BY.runChatAgent
        : PROCESS_PARK_ANSWERED_BY.chatAgent
    return `${who} ${did}`
  }
  return did
}

/**
 * How a park closed that the run no longer waits at: who answered it, how and
 * when, as `line` words it — or, with no answer recorded, what came instead.
 * `root` is the run whose chat counts as the run's own, when not `run`.
 * Pure but for the reader's clock and locale.
 */
export function processParkClosure(
  token: ParkToken,
  run: ParkStandingRun,
  root?: ParkStandingRun,
  line: (answer: string, at: string) => string = PROCESS_PARK_HANDLED,
): ParkClosure {
  const answer = answerTo(run, token.parkedAt)
  if (!answer) return { tone: 'superseded', line: PROCESS_PARK_SUPERSEDED[run.status] }
  const at = formatFriendlyTimestamp(new Date(answer.at).toISOString())
  return { tone: 'handled', line: line(answerPhrase(answer, runChatKeys([root, run])), at) }
}

/**
 * Where a park stands now, read off the run that stopped: open while it still
 * waits there, else closed — by the answer it recorded, or by what came
 * instead. Unknown while the run is not read. Pure but for the reader's clock
 * and locale.
 */
export function processParkStanding(
  token: ParkToken,
  run: ParkStandingRun | undefined,
  root?: ParkStandingRun,
): ParkStanding {
  if (!run) return { state: 'unknown' }
  if (processRunWaitsAt(run, token)) return { state: 'open' }
  return { state: 'closed', closure: processParkClosure(token, run, root) }
}
