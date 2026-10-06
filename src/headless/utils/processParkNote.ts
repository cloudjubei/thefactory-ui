import type {
  ProcessParkAction,
  ProcessWaitingKind,
  ProofKind,
  UiChangeFeature,
  UiChangeScope,
} from 'thefactory-tools/types'
import { canonicalProofKinds, likelyUiChange } from 'thefactory-tools/utils'

import {
  PARK_NOTE_CHOICES,
  PARK_NOTE_COUNTER_FROM,
  PARK_NOTE_MAX_LENGTH,
  PARK_NOTE_REQUIRED_CHOICES,
  WAITING_NOTE_COPY,
} from './processParkNoteConstants'
import type { ParkNoteCopy } from './processParkNoteTypes'

/** Whether choosing this at a park opens a note composer rather than acting at once. */
export function choiceTakesNote(choice: ProcessParkAction): boolean {
  return PARK_NOTE_CHOICES.has(choice)
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

/**
 * The proof a request for changes starts out requiring: on-screen proof when
 * the story's change is to what users see — a feature that looks like one, or
 * a proof plan that already asks for screens. Pure.
 */
export function requestChangesProofPreset(input: {
  features: readonly UiChangeFeature[]
  scope?: UiChangeScope
  plannedKinds?: readonly ProofKind[]
}): ProofKind[] {
  const ui =
    (input.plannedKinds ?? []).includes('ui-before-after') ||
    input.features.some((f) => likelyUiChange(f, input.scope))
  return ui ? ['ui-before-after'] : []
}

/** Where a project's own app lives, read from its metadata — what a change to it alters. Pure. */
export function uiChangeScopeOf(metadata: unknown): UiChangeScope {
  const appDir = (metadata as { appDir?: unknown } | undefined)?.appDir
  return typeof appDir === 'string' && appDir.trim() ? { appDir: appDir.trim() } : {}
}

/** The proof a request requires once one kind is switched on or off, canonical. Pure. */
export function toggleRequestedProof(
  kinds: readonly ProofKind[],
  kind: ProofKind,
  on: boolean,
): ProofKind[] {
  return canonicalProofKinds(on ? [...kinds, kind] : kinds.filter((k) => k !== kind))
}

/** The note a draft sends: trimmed, within the limit, and none at all when blank. */
export function parkNoteToSend(draft: string): string | undefined {
  const note = draft.trim().slice(0, PARK_NOTE_MAX_LENGTH)
  return note === '' ? undefined : note
}
