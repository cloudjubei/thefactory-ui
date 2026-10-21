import type { ProcessAcceptedUnchecked, ProcessLedgerEntry } from 'thefactory-tools/types'

/** What an attempt is read for: how it ended, and how it was carried on. */
export type ProcessAcceptedEntry = Pick<
  ProcessLedgerEntry,
  'stepId' | 'status' | 'outcome' | 'override' | 'acceptedUnchecked'
>

/** How a step the run carried on past although it proved nothing reads. */
export type ProcessAcceptedUncheckedView = {
  /** "Accepted unchecked". */
  label: string
  /** Who accepted what, in one line: "Verify accepted by you — never proven". */
  line: string
  /** Each step carried on past, in plan order, with who accepted it. */
  accepted: readonly ProcessAcceptedUnchecked[]
}
