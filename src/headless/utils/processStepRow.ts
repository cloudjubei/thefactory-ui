import type {
  ProcessLedgerEntry,
  ProcessRun,
  ProcessRunStopHolder,
  ProcessStepState,
} from 'thefactory-tools/types'

import { processNodeState, processNodeSummary, processNodeTone } from './processView'
import {
  PROCESS_REVIEW_VERDICT_WORDS,
  PROCESS_STAGE_MANAGER_ON_IT,
  PROCESS_STAGE_MARKS,
  PROCESS_STAGE_WORDS,
  PROCESS_STEP_FILING_GRACE_MS,
  PROCESS_STEP_MANAGER_ON_IT,
  PROCESS_STEP_NOT_NEEDED,
  PROCESS_STEP_RESULT_MAX,
  PROCESS_STEP_SKIPPED,
  PROCESS_STEP_WAITING_ON_YOU,
  PROCESS_STEP_WORKING,
} from './processStepRowConstants'
import type {
  ProcessStageChip,
  ProcessStepPreviewKind,
  ProcessStepRowView,
} from './processStepRowTypes'
import { reportAuthor } from './reviewEvidenceView'
import type { EvidenceTile, ReportAuthor } from './reviewEvidenceViewTypes'
import { clipLine } from './textLine'
import { verifyAttemptStanding } from './verifyProof'

function previewKind(
  state: ProcessStepState,
  run: Pick<ProcessRun, 'storyId' | 'parentRunId'> | undefined,
): ProcessStepPreviewKind {
  switch (state.step.kind) {
    case 'judge':
      return 'code-review'
    case 'report':
      return 'report'
    case 'process':
      return state.latest?.childRunId ? 'stages' : 'none'
    case 'check':
      return 'checks'
    case 'gate':
      return run?.storyId && !run.parentRunId && state.latest?.override ? 'signoff' : 'none'
    default:
      return state.latest?.runRef ? 'attempt' : 'none'
  }
}

function reviewLine(entry: ProcessLedgerEntry | undefined): string | undefined {
  if (!entry?.review) return undefined
  const word = PROCESS_REVIEW_VERDICT_WORDS[entry.review.verdict]
  return entry.review.reason ? `${word} · ${entry.review.reason}` : word
}

function resultLine(
  state: ProcessStepState,
  nodeState: ReturnType<typeof processNodeState>,
): string | undefined {
  if (nodeState === 'parked' && state.step.kind === 'gate') return PROCESS_STEP_WAITING_ON_YOU
  const summary = processNodeSummary(state)?.text
  if (nodeState === 'skipped') {
    return summary ?? (state.step.onlyWhenSentBack ? PROCESS_STEP_NOT_NEEDED : PROCESS_STEP_SKIPPED)
  }
  if (nodeState === 'queued') return undefined
  if (state.step.kind === 'judge' && !state.requeued) {
    const line = reviewLine(state.latest)
    if (line) return line
  }
  if (summary) return summary
  if (nodeState === 'working') return PROCESS_STEP_WORKING
  if (nodeState === 'parked') return PROCESS_STEP_WAITING_ON_YOU
  return undefined
}

/**
 * A step's row on the pipeline: one short result line read from what the step
 * already recorded, and whether it has anything to preview. A skipped, not
 * needed or not-yet-reached step is inert — nothing to time, cost or open. A
 * story run's sign-off opens to its decision once the person has made it. The
 * step the run is stopped at waits on the person — unless `stopHolder` (from
 * `processRunStopHolder`) says the agent manager has the stop: then it says
 * the manager is on it.
 */
export function processStepRowView(
  state: ProcessStepState,
  parkStepId: string | undefined,
  run?: Pick<ProcessRun, 'storyId' | 'parentRunId'>,
  stopHolder?: ProcessRunStopHolder,
): ProcessStepRowView {
  const nodeState = processNodeState(state, parkStepId)
  const managerOnIt = nodeState === 'parked' && stopHolder === 'manager'
  const inert = nodeState === 'skipped' || (nodeState === 'queued' && state.entries.length === 0)
  const preview = previewKind(state, run)
  const result = managerOnIt ? PROCESS_STEP_MANAGER_ON_IT : resultLine(state, nodeState)
  return {
    inert,
    result: result ? clipLine(result.split('\n')[0], PROCESS_STEP_RESULT_MAX) : undefined,
    waitingOnYou: nodeState === 'parked' && !managerOnIt,
    managerOnIt,
    expandable: !inert && preview !== 'none' && state.latest !== undefined,
    preview,
  }
}

/**
 * A feature step's own stages as chips — Implement, Checks, Code review, Verify,
 * Report — each marked by where it stands and saying the one thing worth
 * knowing: a review's verdict, a verify a person accepted, a retry.
 */
export function processStageChips(
  states: readonly ProcessStepState[],
  parkStepId: string | undefined,
  stopHolder?: ProcessRunStopHolder,
): ProcessStageChip[] {
  return states.map((s) => {
    const stopped = processNodeState(s, parkStepId)
    const managerOnIt = stopped === 'parked' && stopHolder === 'manager'
    const nodeState = managerOnIt ? 'working' : stopped
    const accepted =
      s.latest !== undefined &&
      s.step.agentType === 'verifier' &&
      verifyAttemptStanding(s.latest) === 'accepted'
    const review = s.step.kind === 'judge' ? s.latest?.review : undefined
    const note = accepted
      ? 'accepted by you'
      : review && !s.requeued
        ? PROCESS_REVIEW_VERDICT_WORDS[review.verdict].toLowerCase()
        : s.attempts > 1 && nodeState === 'done'
          ? `${s.attempts} attempts`
          : managerOnIt
            ? PROCESS_STAGE_MANAGER_ON_IT
            : PROCESS_STAGE_WORDS[nodeState]
    return {
      stepId: s.step.id,
      label: s.step.name,
      mark: accepted ? '!' : PROCESS_STAGE_MARKS[nodeState],
      tone: accepted ? 'working' : processNodeTone(nodeState, s.step.kind === 'gate'),
      note,
      inert: nodeState === 'skipped' || s.latest === undefined,
    }
  })
}

/**
 * The report a step filed: the newest by one of `authors`, filed while its
 * attempt ran — or just after, since a filing can land a moment past the end.
 */
export function stepFilingOf(
  tiles: readonly EvidenceTile[],
  entry: Pick<ProcessLedgerEntry, 'startedAt' | 'endedAt'> | undefined,
  authors: readonly ReportAuthor[],
): EvidenceTile | undefined {
  if (!entry) return undefined
  const until =
    entry.endedAt === undefined ? Infinity : entry.endedAt + PROCESS_STEP_FILING_GRACE_MS
  return tiles
    .filter(
      (t) =>
        t.ref.kind === 'report' &&
        authors.includes(reportAuthor(t.ref)) &&
        t.ref.createdAt >= entry.startedAt &&
        t.ref.createdAt <= until,
    )
    .sort((a, b) => b.ref.createdAt - a.ref.createdAt)[0]
}
