import { describe, expect, it } from 'vitest'

import {
  FAKE_RUN_THROUGH_ISSUES,
  FAKE_RUN_THROUGH_RUN,
  FAKE_RUN_THROUGH_RUN_ID,
  fakeRunThroughEvidence,
} from './runThroughRun'

const filed = () => fakeRunThroughEvidence().groups.flatMap((group) => group.evidence)

describe('the run-through fixture', () => {
  it('is a tester’s run', () => {
    expect(FAKE_RUN_THROUGH_RUN.plan.steps.map((step) => step.agentType)).toEqual(['tester'])
  })

  it('flags issues of different severities, each on a screenshot of its run', () => {
    expect(FAKE_RUN_THROUGH_ISSUES.map((ref) => ref.issue?.severity)).toEqual([
      'blocker',
      'major',
      'minor',
    ])
    for (const ref of FAKE_RUN_THROUGH_ISSUES) {
      expect(ref).toMatchObject({ kind: 'screenshot', runId: FAKE_RUN_THROUGH_RUN_ID })
      expect(ref.mediaType).toMatch(/^image\//)
    }
  })

  it('places one issue in the recording, which was filed after every issue', () => {
    expect(FAKE_RUN_THROUGH_ISSUES.filter((ref) => ref.issue?.at !== undefined)).toHaveLength(1)
    const recording = filed().find((ref) => ref.kind === 'recording')
    const latestIssue = Math.max(...FAKE_RUN_THROUGH_ISSUES.map((ref) => ref.createdAt))
    expect(recording?.createdAt).toBeGreaterThan(latestIssue)
  })

  it('files its record of how far it got', () => {
    const record = filed().find((ref) => ref.runThroughSections)
    expect(record).toMatchObject({ kind: 'report', label: 'Run-through' })
    expect(record?.runThroughSections?.reachedEnd).toBe(true)
  })
})
