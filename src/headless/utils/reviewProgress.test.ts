import { describe, expect, it } from 'vitest'

import { isReviewInProgress, type ReviewInProgressInput } from './reviewProgress'

// A run with a live, CONFIRMED-running verifier and nothing suppressing it — the
// one shape that is genuinely "verifying". Each case below flips ONE field so a
// mutation dropping any single guard is caught.
const verifying: ReviewInProgressInput = {
  processRunId: undefined,
  reviewRunId: 'verifier-1',
  verdict: undefined,
  reviewRunTerminal: false,
}

describe('isReviewInProgress', () => {
  it('is true only for a non-process run with a CONFIRMED-running verifier and no verdict', () => {
    expect(isReviewInProgress(verifying)).toBe(true)
  })

  it('is FALSE for a process-owned run — the pipeline owns verification, not this panel', () => {
    // The reported bug: a process step run showed "Verifying…" forever even though
    // its verification is the process's own verify step.
    expect(isReviewInProgress({ ...verifying, processRunId: 'proc-9' })).toBe(false)
  })

  it('is FALSE when the verifier status is UNKNOWN (undefined) — the initial state', () => {
    // Before the verifier's status is read, `reviewRunTerminal` is undefined; that
    // is "unknown", which reads as not-in-progress (never a stuck "running").
    expect(isReviewInProgress({ ...verifying, reviewRunTerminal: undefined })).toBe(false)
  })

  it('is FALSE once the verifier has reached a terminal state', () => {
    expect(isReviewInProgress({ ...verifying, reviewRunTerminal: true })).toBe(false)
  })

  it('is FALSE when there is no linked verifier at all', () => {
    expect(isReviewInProgress({ ...verifying, reviewRunId: undefined })).toBe(false)
  })

  it('is FALSE once a verdict is recorded, whatever the verifier state', () => {
    expect(isReviewInProgress({ ...verifying, verdict: { decision: 'approved' } })).toBe(false)
  })
})
