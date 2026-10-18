import { describe, expect, it } from 'vitest'

import { reviewOnBaseOfferView } from './reviewOnBase'
import { REVIEW_ON_BASE_COPY } from './reviewOnBaseConstants'

const branch = 'agent/84b6fd5bb3cd'

describe('reviewOnBaseOfferView', () => {
  it('offers to close a review its base holds, at once', () => {
    expect(
      reviewOnBaseOfferView({ preview: { kind: 'held', branch, baseRef: 'dev', by: 'tree' } }),
    ).toEqual({
      label: 'Already on dev — close it',
      detail: 'dev already holds this change. Closing removes its branch, recorded for restore.',
      busy: false,
      busyLabel: 'Closing…',
    })
  })

  it('offers to close a review a later commit replaced, saying so', () => {
    const view = reviewOnBaseOfferView({
      preview: { kind: 'superseded', branch, baseRef: 'main', supersededBy: 'c'.repeat(40) },
    })
    expect(view?.label).toBe('Already on main — close it')
    expect(view?.detail).toBe(REVIEW_ON_BASE_COPY.superseded('main'))
    expect(view).not.toHaveProperty('confirm')
  })

  it('offers a review its base lacks only behind a confirm, naming the files it lacks', () => {
    expect(
      reviewOnBaseOfferView({
        preview: {
          kind: 'neither',
          branch,
          baseRef: 'dev',
          reason: 'dev does not hold all of this review yet — 2 files differ: a.ts, b.ts.',
          paths: ['a.ts', 'b.ts'],
        },
      }),
    ).toEqual({
      label: 'Close as already on dev…',
      detail: 'dev lacks a.ts, b.ts.',
      confirm: {
        text: 'Close it anyway? Nothing on disk is discarded — the review closes and its branch is removed, recorded for restore.',
        action: 'Close it',
        keep: 'Keep open',
      },
      busy: false,
      busyLabel: 'Closing…',
    })
  })

  it('names three of the files the base lacks and counts the rest', () => {
    const view = reviewOnBaseOfferView({
      preview: {
        kind: 'neither',
        branch,
        baseRef: 'dev',
        reason: 'r',
        paths: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'],
      },
    })
    expect(view?.detail).toBe('dev lacks a.ts, b.ts, c.ts and 2 more.')
  })

  it('says why when git could not tell which files the base lacks', () => {
    const view = reviewOnBaseOfferView({
      preview: { kind: 'neither', branch, baseRef: 'dev', reason: 'No commit agent/x here.' },
    })
    expect(view?.detail).toBe('No commit agent/x here.')
    expect(view?.confirm).toBeDefined()
  })

  it('carries a close in flight and why the last one did nothing', () => {
    const view = reviewOnBaseOfferView({
      preview: { kind: 'held', branch, baseRef: 'dev', by: 'merged' },
      busy: true,
      error: 'dev does not hold all of this review yet',
    })
    expect(view).toMatchObject({ busy: true, error: 'dev does not hold all of this review yet' })
  })

  it('offers nothing until read, nor for a review with nothing to close', () => {
    expect(reviewOnBaseOfferView({ preview: undefined })).toBeUndefined()
    expect(reviewOnBaseOfferView({ preview: { kind: 'none' } })).toBeUndefined()
  })
})
