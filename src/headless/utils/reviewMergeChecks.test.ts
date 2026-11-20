import { describe, expect, it } from 'vitest'

import {
  reviewCheckChangeNeeded,
  reviewMergeChecksShown,
  reviewMergeChecksView,
} from './reviewMergeChecks'
import type { ReviewMergeChecks, ReviewMergeChecksSnapshot } from './reviewMergeChecksTypes'

const CHECKS: ReviewMergeChecks = {
  repositories: [
    {
      repository: 'acme/web',
      checks: [
        { name: 'build', required: true },
        { name: 'e2e', required: false },
      ],
    },
    { repository: 'acme/api', checks: [], error: 'GitHub said no' },
  ],
}

const snapshot = (over: Partial<ReviewMergeChecksSnapshot> = {}): ReviewMergeChecksSnapshot => ({
  checks: CHECKS,
  readError: undefined,
  changes: [],
  actionError: undefined,
  ...over,
})

describe('reviewMergeChecksShown', () => {
  it('lays the person’s changes over the checks read, in order, matching names in any case', () => {
    const shown = reviewMergeChecksShown(CHECKS, [
      { repository: 'Acme/Web', check: 'BUILD', required: false },
      { repository: 'acme/web', check: 'e2e', required: true },
      { repository: 'acme/web', check: 'e2e', required: false },
    ])
    expect(shown?.repositories[0]?.checks).toEqual([
      { name: 'build', required: false },
      { name: 'e2e', required: false },
    ])
    expect(shown?.repositories[1]).toBe(CHECKS.repositories[1])
  })

  it('answers what was read as it was when nothing is on its way, and nothing before the first read', () => {
    expect(reviewMergeChecksShown(CHECKS, [])).toBe(CHECKS)
    expect(reviewMergeChecksShown(undefined, [])).toBeUndefined()
  })
})

describe('reviewCheckChangeNeeded', () => {
  it('needs sending only when it changes what is shown', () => {
    expect(
      reviewCheckChangeNeeded(CHECKS, { repository: 'acme/web', check: 'e2e', required: false }),
    ).toBe(false)
    expect(
      reviewCheckChangeNeeded(CHECKS, { repository: 'acme/web', check: 'E2E', required: true }),
    ).toBe(true)
    expect(
      reviewCheckChangeNeeded(CHECKS, { repository: 'acme/web', check: 'lint', required: true }),
    ).toBe(false)
    expect(
      reviewCheckChangeNeeded(CHECKS, { repository: 'acme/web', check: 'lint', required: false }),
    ).toBe(true)
    expect(
      reviewCheckChangeNeeded(undefined, { repository: 'acme/web', check: 'e2e', required: false }),
    ).toBe(true)
  })
})

describe('reviewMergeChecksView', () => {
  it('shows each repository’s checks with the person’s changes, and which are on their way', () => {
    const view = reviewMergeChecksView(
      snapshot({ changes: [{ repository: 'acme/web', check: 'build', required: false }] }),
    )
    expect(view).toEqual({
      loading: false,
      empty: false,
      repositories: [
        {
          repository: 'acme/web',
          checks: [
            { repository: 'acme/web', name: 'build', required: false, saving: true },
            { repository: 'acme/web', name: 'e2e', required: false, saving: false },
          ],
        },
        { repository: 'acme/api', checks: [], error: 'Not read: GitHub said no' },
      ],
    })
  })

  it('is loading until the first read answers, and says why a read or a change failed', () => {
    expect(reviewMergeChecksView(snapshot({ checks: undefined }))).toEqual({
      loading: true,
      empty: false,
      repositories: [],
    })
    expect(
      reviewMergeChecksView(
        snapshot({ checks: undefined, readError: 'down', actionError: 'Could not save' }),
      ),
    ).toEqual({
      loading: false,
      empty: false,
      repositories: [],
      readError: 'down',
      actionError: 'Could not save',
    })
  })

  it('is empty when no pull request showed a repository, and not while one says why it was not read', () => {
    expect(reviewMergeChecksView(snapshot({ checks: { repositories: [] } })).empty).toBe(true)
    expect(
      reviewMergeChecksView(
        snapshot({
          checks: { repositories: [{ repository: 'acme/api', checks: [], error: 'x' }] },
        }),
      ).empty,
    ).toBe(false)
  })
})
