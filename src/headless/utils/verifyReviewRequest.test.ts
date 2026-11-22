import { describe, expect, it } from 'vitest'

import { verifyReviewBody } from './verifyReviewRequest'

describe('verifyReviewBody', () => {
  it('omits checkIds when none were asked for, so the route runs the whole pass', () => {
    expect(verifyReviewBody('proj', undefined)).toEqual({ projectId: 'proj' })
    expect(verifyReviewBody('proj', [])).toEqual({ projectId: 'proj' })
    expect(verifyReviewBody('proj', ['', '  '])).toEqual({ projectId: 'proj' })
  })

  it('sends only the asked-for checks, trimmed and without duplicates', () => {
    expect(verifyReviewBody('proj', [' unit ', 'lint', 'unit', ''])).toEqual({
      projectId: 'proj',
      checkIds: ['unit', 'lint'],
    })
  })
})
