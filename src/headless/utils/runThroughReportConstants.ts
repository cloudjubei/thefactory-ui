import type { ReportProofStatus } from 'thefactory-tools/types'

import type { RunThroughState } from './runThroughReportTypes'

export const RUN_THROUGH_TEXT = {
  label: 'Run-through',
  scenario: 'Scenario',
  reachedEnd: 'Reached the end',
  stoppedAt: (where: string) => `Stopped at ${where}`,
  stoppedShort: 'Stopped part-way',
  recording: 'Run-through recording',
  issues: 'Issues',
  noIssues: 'No issues',
  nothingFlagged: 'Nothing was flagged.',
  expected: 'Expected:',
  doing: 'Was doing:',
  playFrom: (time: string) => `Play the recording from ${time}`,
  openShot: (title: string) => `Open the screenshot of ${title}`,
  noRecording: 'This run-through was not recorded.',
  proofEnd: 'reached the end',
  proofStopped: (where: string) => `stopped at ${where}`,
  proofNoIssues: 'no issues',
} as const

/** How each state reads as a line in "How it was proven". */
export const RUN_THROUGH_PROOF_STATUS: Record<RunThroughState, ReportProofStatus> = {
  passed: 'proven',
  flagged: 'unproven',
  failed: 'failed',
}
