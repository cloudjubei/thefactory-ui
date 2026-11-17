/**
 * Set on a filing a fresh retry replaced. thefactory-tools writes this when
 * the failed attempt's filings are superseded by the new attempt: `attemptId`
 * is that new attempt. Absent on a current filing — a carry-on retry leaves
 * it off, so those filings stay current.
 */
export interface FilingSupersededBy {
  attemptId: string
}
