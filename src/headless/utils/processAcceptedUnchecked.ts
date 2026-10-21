import type {
  ProcessAcceptedUnchecked,
  ProcessDecidedBy,
  ProcessPlanStep,
} from 'thefactory-tools/types'

import {
  PROCESS_ACCEPTED_BY,
  PROCESS_ACCEPTED_NEVER_PROVEN,
  PROCESS_ACCEPTED_UNCHECKED_LABEL,
} from './processAcceptedUncheckedConstants'
import type {
  ProcessAcceptedEntry,
  ProcessAcceptedUncheckedView,
} from './processAcceptedUncheckedTypes'

/** Who carried a step on past, as a line names them. A decision recorded before it was attributed was a person's. */
export function processAcceptedByWord(decidedBy: ProcessDecidedBy | undefined): string {
  return PROCESS_ACCEPTED_BY[decidedBy ?? 'person']
}

/**
 * Everyone who accepted something, as one line names them: "you", "the
 * manager", or "you and the manager" — each once, in the order they first
 * appear. A word left unknown was a person's. Pure.
 */
export function processAcceptedByList(words: readonly (string | undefined)[]): string {
  const who = [...new Set(words.map((w) => w ?? processAcceptedByWord(undefined)))]
  if (who.length <= 1) return who[0] ?? processAcceptedByWord(undefined)
  return `${who.slice(0, -1).join(', ')} and ${who[who.length - 1]}`
}

/**
 * The steps an attempt was carried on past although they proved nothing: for a
 * `process` step that passed, the nested run's steps the driver stamped on it;
 * for any other, the attempt itself when it proved nothing (`unchecked`) and was
 * answered with "Accept and carry on". Empty for every other attempt. Pure.
 */
export function processEntryAcceptedUnchecked(
  entry: ProcessAcceptedEntry | undefined,
  stepName: string,
): readonly ProcessAcceptedUnchecked[] {
  if (!entry || entry.status !== 'done') return []
  if (entry.outcome === 'passed') return entry.acceptedUnchecked ?? []
  const override = entry.override
  if (entry.outcome !== 'unchecked' || override?.choice !== 'continue') return []
  return [
    {
      stepId: entry.stepId,
      stepName,
      at: override.at,
      ...(override.decidedBy ? { decidedBy: override.decidedBy } : {}),
      ...(override.note ? { note: override.note } : {}),
    },
  ]
}

/** Whether an attempt was carried on past although it proved nothing, itself or in its nested run. Pure. */
export function isProcessEntryAcceptedUnchecked(entry: ProcessAcceptedEntry | undefined): boolean {
  return processEntryAcceptedUnchecked(entry, '').length > 0
}

function acceptedLine(accepted: readonly ProcessAcceptedUnchecked[], own: boolean): string {
  if (own) {
    return `Accepted by ${processAcceptedByWord(accepted[0]?.decidedBy)} — ${PROCESS_ACCEPTED_NEVER_PROVEN}`
  }
  const parts = accepted.map(
    (a, i) => `${a.stepName} ${i === 0 ? 'accepted ' : ''}by ${processAcceptedByWord(a.decidedBy)}`,
  )
  return `${parts.join(', ')} — ${PROCESS_ACCEPTED_NEVER_PROVEN}`
}

/**
 * How a step reads when the run carried it on past although it was never
 * proven — its own unchecked attempt accepted, or a nested run that succeeded
 * over such steps — with who accepted each. `undefined` for every other step,
 * and for one a later pass went back over: its verdict is still to come. Pure.
 */
export function processStepAcceptedUnchecked(state: {
  step: Pick<ProcessPlanStep, 'name'>
  latest?: ProcessAcceptedEntry
  requeued?: boolean
}): ProcessAcceptedUncheckedView | undefined {
  if (state.requeued) return undefined
  const accepted = processEntryAcceptedUnchecked(state.latest, state.step.name)
  if (accepted.length === 0) return undefined
  return {
    label: PROCESS_ACCEPTED_UNCHECKED_LABEL,
    line: acceptedLine(accepted, state.latest?.outcome === 'unchecked'),
    accepted,
  }
}
