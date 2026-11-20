import { describe, expect, it } from 'vitest'

import { FAKE_EVIDENCE_IDS } from './evidenceIdsConstants'
import { FAKE_EVIDENCE_REFERENCE } from './resolvedEvidenceConstants'

describe('the fixture evidence ids', () => {
  const ids = Object.values(FAKE_EVIDENCE_IDS)

  it('are each one a reference can cite', () => {
    const uncitable = ids.filter((id) => !FAKE_EVIDENCE_REFERENCE.test(`&p1/evidence/${id}`))
    expect(uncitable).toEqual([])
  })

  it('are each distinct, down to the short citation', () => {
    expect(new Set(ids.map((id) => id.slice(0, 8))).size).toBe(ids.length)
  })
})
