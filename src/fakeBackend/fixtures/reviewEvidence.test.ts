import { describe, expect, it } from 'vitest'

import { FAKE_EVIDENCE_IDS } from './evidenceIdsConstants'
import { FAKE_PROJECT_ID } from './projects'
import { fakeFiledEvidence, fakeReviewEvidenceList } from './reviewEvidence'
import { FAKE_RUN_THROUGH_RUN_ID } from './runThroughRun'
import { FAKE_SCRIPT_RUN_ID } from './scriptStepRun'
import { FAKE_VARIANT_RUN_ID } from './variantRun'

const list = (projectId: string, search = '') =>
  fakeReviewEvidenceList(projectId, new URLSearchParams(search))

describe('fakeFiledEvidence', () => {
  it('holds each item once, with the run that filed it', () => {
    const blocker = fakeFiledEvidence(FAKE_EVIDENCE_IDS['run-through-blocker'])
    expect(blocker?.group.runId).toBe(FAKE_RUN_THROUGH_RUN_ID)
    expect(fakeFiledEvidence(FAKE_EVIDENCE_IDS['stopped-shot'])?.group.runId).toBe(
      FAKE_SCRIPT_RUN_ID,
    )
    expect(fakeFiledEvidence('gone')).toBeUndefined()
  })
})

describe('fakeReviewEvidenceList', () => {
  it('lists what one run filed, newest first', () => {
    const filed = list(FAKE_PROJECT_ID, `runId=${FAKE_RUN_THROUGH_RUN_ID}`) ?? []
    expect(filed.map((ref) => ref.id)).toEqual([
      FAKE_EVIDENCE_IDS['run-through-record'],
      FAKE_EVIDENCE_IDS['run-through-recording'],
      FAKE_EVIDENCE_IDS['run-through-minor'],
      FAKE_EVIDENCE_IDS['run-through-major'],
      FAKE_EVIDENCE_IDS['run-through-blocker'],
    ])
  })

  it('lists every run’s filings with no filter, and none for a story nothing was filed under', () => {
    const runs = new Set(list(FAKE_PROJECT_ID)?.map((ref) => ref.runId))
    expect([...runs]).toEqual(
      expect.arrayContaining([FAKE_VARIANT_RUN_ID, FAKE_SCRIPT_RUN_ID, FAKE_RUN_THROUGH_RUN_ID]),
    )
    expect(list(FAKE_PROJECT_ID, 'storyId=s1')).toEqual([])
  })

  it('lists nothing for another project the fake holds, and refuses one it does not', () => {
    expect(list('thefactory-ui')).toEqual([])
    expect(list('no-such-project')).toBeUndefined()
  })
})
