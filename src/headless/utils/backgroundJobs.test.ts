import { describe, expect, it } from 'vitest'
import { BACKGROUND_JOB_OUTCOME } from 'thefactory-tools/constants'
import {
  backgroundJobAnchorId,
  backgroundJobAnchorOf,
  backgroundJobIdOf,
  describeBackgroundResult,
  slowToolLabel,
} from './backgroundJobs'

describe('backgroundJobIdOf', () => {
  const body = { outcome: BACKGROUND_JOB_OUTCOME, jobId: 'job-1', agentInstruction: '…' }

  it('reads the job a call carries on as, from the result or its text', () => {
    expect(backgroundJobIdOf(body)).toBe('job-1')
    expect(backgroundJobIdOf(JSON.stringify(body))).toBe('job-1')
  })

  it('is undefined for any other result', () => {
    expect(backgroundJobIdOf({ outcome: 'pending', jobId: 'job-1' })).toBeUndefined()
    expect(backgroundJobIdOf({ outcome: BACKGROUND_JOB_OUTCOME })).toBeUndefined()
    expect(backgroundJobIdOf('not json')).toBeUndefined()
    expect(backgroundJobIdOf(undefined)).toBeUndefined()
    expect(backgroundJobIdOf(['job-1'])).toBeUndefined()
  })
})

describe('backgroundJobAnchorId', () => {
  it('is one id per job, safe as an element id', () => {
    expect(backgroundJobAnchorId('job-1a2b')).toBe('bg-job-job-1a2b')
    expect(backgroundJobAnchorId('a b/c')).toBe('bg-job-a_b_c')
  })
})

describe('describeBackgroundResult', () => {
  it('says how the call ended and how long it took', () => {
    expect(
      describeBackgroundResult({ jobId: 'j', toolName: 't', status: 'succeeded', tookMs: 90_000 }),
    ).toBe('finished after 1m 30s')
    expect(
      describeBackgroundResult({ jobId: 'j', toolName: 't', status: 'failed', tookMs: 2_000 }),
    ).toBe('failed after 2.0s')
  })
})

describe('backgroundJobAnchorOf', () => {
  it('is the anchor of a row whose call went to the background, and nothing for another', async () => {
    const { BACKGROUND_JOB_OUTCOME } = await import('thefactory-tools/constants')
    expect(backgroundJobAnchorOf({ outcome: BACKGROUND_JOB_OUTCOME, jobId: 'job-1' })).toBe(
      'bg-job-job-1',
    )
    expect(backgroundJobAnchorOf({ ok: true })).toBeUndefined()
  })
})

describe('slowToolLabel', () => {
  const startedAt = new Date(1_000_000).toISOString()

  it('says nothing for a call that has not run long', () => {
    expect(
      slowToolLabel({ origin: 'internal', startedAt, nowMs: 1_000_000 + 9_999 }),
    ).toBeUndefined()
  })

  it("names the host as what a slow call to the host's own tools waits on", () => {
    expect(slowToolLabel({ origin: 'internal', startedAt, nowMs: 1_000_000 + 40_000 })).toBe(
      'Waiting on host · 40s',
    )
    expect(slowToolLabel({ startedAt, nowMs: 1_000_000 + 12_000 })).toBe('Waiting on host · 12s')
  })

  it('says a slow call the CLI runs itself is running', () => {
    expect(slowToolLabel({ origin: 'native', startedAt, nowMs: 1_000_000 + 75_000 })).toBe(
      'Running · 1m 15s',
    )
    expect(slowToolLabel({ origin: 'external-mcp', startedAt, nowMs: 1_000_000 + 10_000 })).toBe(
      'Running · 10s',
    )
  })

  it('says nothing without a start it can read', () => {
    expect(slowToolLabel({ origin: 'internal', nowMs: 50_000 })).toBeUndefined()
    expect(
      slowToolLabel({ origin: 'internal', startedAt: 'nonsense', nowMs: 50_000 }),
    ).toBeUndefined()
  })
})
