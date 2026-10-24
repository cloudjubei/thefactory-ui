import type {
  ProcessParkAction,
  ProcessWaitingKind,
  ProofKind,
  ProofKindUnavailable,
} from 'thefactory-tools/types'
import { canonicalProofKinds } from 'thefactory-tools/utils'

import {
  ACCEPT_DROPPED_NOTE_COPY,
  ANSWER_FILES_CHOICES,
  ANSWER_FILES_MAX,
  PARK_NOTE_CHOICES,
  PARK_NOTE_COUNTER_FROM,
  PARK_NOTE_MAX_LENGTH,
  PARK_NOTE_COPY,
  PARK_NOTE_REQUIRED_CHOICES,
  REQUEST_PROOF_CHOICES,
  SEND_TO_DEVELOPER_NOTE_COPY,
  WAITING_NOTE_COPY,
} from './processParkNoteConstants'
import type { ParkNoteCopy, RequestProofChoice } from './processParkNoteTypes'

/** Whether choosing this at a park opens a note composer rather than acting at once. */
export function choiceTakesNote(choice: ProcessParkAction): boolean {
  return PARK_NOTE_CHOICES.has(choice)
}

/** The composer's words for a park choice that takes a note: sending work back to the developer, accepting a dropped change, else a request for changes. */
export function parkNoteCopy(choice: ProcessParkAction): ParkNoteCopy {
  if (choice === 'send-to-developer') return SEND_TO_DEVELOPER_NOTE_COPY
  if (choice === 'accept-dropped-change') return ACCEPT_DROPPED_NOTE_COPY
  return PARK_NOTE_COPY
}

/** Whether the note IS the answer, so the composer will not send it blank. */
export function parkNoteRequired(choice: ProcessParkAction): boolean {
  return PARK_NOTE_REQUIRED_CHOICES.has(choice)
}

/** The composer's words for answering a waiting agent: an answer to a question, else more info. */
export function waitingNoteCopy(kind: ProcessWaitingKind): ParkNoteCopy {
  return WAITING_NOTE_COPY[kind]
}

/** `1850 / 2000` once a draft nears the limit; nothing before then. */
export function parkNoteCounter(draft: string): string | undefined {
  if (draft.length < PARK_NOTE_COUNTER_FROM) return undefined
  return `${draft.length} / ${PARK_NOTE_MAX_LENGTH}`
}

/** The proof a request requires once one kind is switched on or off, canonical. Pure. */
export function toggleRequestedProof(
  kinds: readonly ProofKind[],
  kind: ProofKind,
  on: boolean,
): ProofKind[] {
  return canonicalProofKinds(on ? [...kinds, kind] : kinds.filter((k) => k !== kind))
}

/**
 * The proof a request for changes can require, as its switches offer it: each
 * kind the run cannot produce here (`unavailable`, the run's `proofUnavailable`)
 * held off with why, so it is never chosen only to fail later. Pure.
 */
export function requestProofChoices(
  unavailable: readonly ProofKindUnavailable[] = [],
): RequestProofChoice[] {
  return REQUEST_PROOF_CHOICES.map((choice) => {
    const reason = unavailable.find((u) => u.kind === choice.kind)?.reason
    return reason ? { ...choice, unavailable: reason } : { ...choice }
  })
}

/** The note a draft sends: trimmed, within the limit, and none at all when blank. */
export function parkNoteToSend(draft: string): string | undefined {
  const note = draft.trim().slice(0, PARK_NOTE_MAX_LENGTH)
  return note === '' ? undefined : note
}

/** Whether answering with this choice can hand the waiting agent files. */
export function answerTakesFiles(choice: ProcessParkAction): boolean {
  return ANSWER_FILES_CHOICES.has(choice)
}

/** The files an answer hands over after adding `picked`: each once, in order, at most {@link ANSWER_FILES_MAX}. */
export function addAnswerFiles(current: readonly string[], picked: readonly string[]): string[] {
  return [...new Set([...current, ...picked])].slice(0, ANSWER_FILES_MAX)
}
