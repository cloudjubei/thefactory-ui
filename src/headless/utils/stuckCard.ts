import { STUCK_ANSWER_DETAILS, STUCK_ANSWER_LABELS } from 'thefactory-tools/constants'
import type { ProcessLedgerEntry, ProcessRun, StuckSignal } from 'thefactory-tools/types'
import { stuckAnswerOf } from 'thefactory-tools/utils'

import { QUESTION_CARD_TITLE } from './agentQuestionConstants'
import type { AgentQuestion } from './agentQuestionTypes'
import type { ProcessCirclingView } from './processCirclingViewTypes'
import { STUCK_EVIDENCE_TIMES, STUCK_RUN_LABEL } from './stuckCardConstants'
import type { StuckCardAnswerKind, StuckCardView } from './stuckCardTypes'

const ANSWER_ORDER: readonly StuckCardAnswerKind[] = ['continue', 'hint', 'stop']

/** What the host saw, a line each: how often, the call, and its error when it failed. Pure. */
export function stuckEvidenceLines(signal: StuckSignal): string[] {
  return [
    STUCK_EVIDENCE_TIMES(signal.toolName, signal.count),
    signal.action,
    ...(signal.error ? [signal.error] : []),
  ]
}

/** A question as the stuck card shows it, or `undefined` for any other question. Pure. */
export function stuckCardView(question: AgentQuestion): StuckCardView | undefined {
  if (!question.stuck) return undefined
  return {
    title: QUESTION_CARD_TITLE,
    question: question.question,
    ...(question.context ? { context: question.context } : {}),
    evidence: stuckEvidenceLines(question.stuck),
    answers: ANSWER_ORDER.map((kind) => ({
      kind,
      label: STUCK_ANSWER_LABELS[kind],
      detail: STUCK_ANSWER_DETAILS[kind],
    })),
  }
}

/**
 * Whether words can go as a hint. The host reads a bare "Stop" as the choice, so
 * a hint that says only that would end the turn with no confirmation. Pure.
 */
export function canSendStuckHint(text: string): boolean {
  return text.trim().length > 0 && stuckAnswerOf({ answer: text }).choice === 'hint'
}

function stuckRunView(signal: StuckSignal): ProcessCirclingView {
  const [headline = '', ...evidence] = stuckEvidenceLines(signal)
  return { label: STUCK_RUN_LABEL, headline, evidence }
}

/**
 * The flag and evidence on an attempt the host stopped repeating itself. The
 * stop's own message already says the reason, so this says how often and the
 * call. Pure.
 */
export function processStepStuckView(
  latest: Pick<ProcessLedgerEntry, 'agentStop' | 'stuck'> | undefined,
): ProcessCirclingView | undefined {
  return latest?.agentStop === 'stuck' && latest.stuck ? stuckRunView(latest.stuck) : undefined
}

/** The evidence for the step a run is stopped at, when its newest attempt was stuck. Pure. */
export function processParkStuckView(
  run: Pick<ProcessRun, 'park' | 'ledger'>,
): ProcessCirclingView | undefined {
  const stepId = run.park?.stepId
  if (!stepId) return undefined
  return processStepStuckView([...run.ledger].reverse().find((entry) => entry.stepId === stepId))
}
