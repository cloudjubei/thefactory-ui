import type { VerificationCheckResult, VerificationCheckStatus } from '../api/generated'
import type { ProcessStatusTone } from './processView'

/** What a run's newest checks step recorded: one result per command, and when it finished. */
export type ProcessChecksResult = {
  entryId: string
  checks: VerificationCheckResult[]
  /** Epoch ms the step finished — what decides whether it is newer than a run's own record. */
  at: number
}

/** One command of a checks step, as a pipeline node lists it. */
export type ProcessCheckRow = {
  id: string
  label: string
  status: VerificationCheckStatus
  /** ✓ ✗ ! – — the same marks the developer's own line uses; an advisory failure is flagged `!`. */
  mark: string
  /** "passed", "failed", "errored", "skipped" — or "flagged" for an advisory command that failed. */
  word: string
  tone: ProcessStatusTone
  /** Reported, but its failure does not fail the step — lint and format. */
  advisory: boolean
  /** The command's own one line, when it said one. */
  summary: string | undefined
  durationLabel: string | undefined
  /** "sandbox" or "host" — where it ran, when the result says. */
  ranInLabel: string | undefined
  /** "Ran in the sandbox." or "Ran on the host — why it could not run in the sandbox." */
  ranInDetail: string | undefined
  /** "14 tests" — how many tests a test command ran, when it said; never set for a run of none, whose summary says so. */
  testCountLabel: string | undefined
  /** "pre-existing" / "partly pre-existing" — a failure its base shares, in full or in part; else unset. */
  baselineLabel: string | undefined
  /** "Already failing at the base 28cf012 in the same environment — not caused by this change." — when it was compared. */
  baselineDetail: string | undefined
  /** "Built against thefactory-tools at 1a2b3c4 with uncommitted changes" — the code outside the checkout it ran against. */
  dependencyDetail: string | undefined
}

/** What a sign-off section says about the checks its developer ran before handing over. */
export type DeveloperChecksNote = {
  /** "Developer verified: Build ✓ (covisionTestDebug), Lint ✗" or "Developer ran no checks". */
  text: string
  ran: boolean
}

/** A running checks step that has not started its checks yet: what it waits for, and for how long. */
export type ProcessCheckWaitingView = {
  /** "Waiting for another check run of this project to finish". */
  reason: string
  /** How long it has waited so far, e.g. "2m 12s". */
  waited: string
}
