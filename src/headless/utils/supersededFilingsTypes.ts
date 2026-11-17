import type { ReviewEvidenceRef } from '../api/generated'

/**
 * Set on a filing a fresh retry replaced: the process run, ledger entry and
 * step of the attempt that replaced it, as thefactory-tools writes it. Absent on
 * a current filing — a carry-on retry leaves it off, so those filings stay current.
 */
export type FilingSupersededBy = NonNullable<ReviewEvidenceRef['supersededBy']>
