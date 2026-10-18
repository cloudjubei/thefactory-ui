import type { VerificationCheckResult, VerificationSiblingFallbackOutcome } from '../api/generated'
import type { ProcessStatusTone } from './processView'

/** One dependency the checks ran again with at its stable branch, as a chip reads it. */
export type SiblingFallbackChip = {
  /** "thefactory-db". */
  name: string
  /** Its working tree: "dev@1a2b3c4", or the short commit when detached. */
  live: string
  /** It had uncommitted changes. */
  pending: boolean
  /** "main@5d6e7f8" — the branch and commit the second run used. */
  stable: string
  /** Where it is on the machine. */
  path: string
}

/** What a checks attempt that ran again at a dependency's stable branch tells the person. */
export type SiblingFallbackView = {
  outcome: VerificationSiblingFallbackOutcome
  tone: ProcessStatusTone
  /** "Passes only at the stable branch". */
  title: string
  /** The host's own sentence — "Passed against lib@5d6e7f8; your pending changes in lib break it: …". */
  message: string
  chips: SiblingFallbackChip[]
  /** What failed, under its heading — none for a dependency that could not be checked at all. */
  failures: { label: string; lines: string[] } | undefined
  /** "lib: it has no main or dev branch …" — each dependency that could not be checked at its stable branch. */
  notReplaced: string[]
}

/** Which of a fallback attempt's two runs a check list shows. */
export type SiblingFallbackCheckSetId = 'stable' | 'live'

/** One of a fallback attempt's two runs, as a check list can switch to it. */
export type SiblingFallbackCheckSet = {
  id: SiblingFallbackCheckSetId
  /** "Stable branch" / "Your pending changes". */
  label: string
  checks: VerificationCheckResult[]
}

/**
 * A run-chat notice about a checks attempt, read live off the run: unknown
 * while the run or the attempt is not read, current while it is the run's
 * newest checks attempt, superseded once a newer one ran.
 */
export type SiblingFallbackNoticeState =
  | { state: 'unknown' }
  | { state: 'current'; view: SiblingFallbackView }
  | { state: 'superseded'; view: SiblingFallbackView; line: string }
