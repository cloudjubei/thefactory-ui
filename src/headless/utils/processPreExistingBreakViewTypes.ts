import type { ProofPointList } from './processPartialProofViewTypes'

/**
 * A check target already broken before the change, as its stop card draws it:
 * the headline, where it already fails, the files and checks it fails in, and
 * its first failing lines.
 */
export type PreExistingBreakView = {
  headline: string
  /** "Fails the same way on main@9f3c2a1, in files this change does not touch." */
  base: string
  /** Absent when the checks name no file. */
  files: ProofPointList | undefined
  checks: ProofPointList
  /** Absent when no failing line was read. */
  failing: { title: string; text: string } | undefined
}
