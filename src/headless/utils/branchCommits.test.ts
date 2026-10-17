import { describe, expect, it } from 'vitest'

import { branchCommitsRefs, commitsSinceBase } from './branchCommits'

const c = (hash: string) => ({ hash, subject: hash, authorDate: 1 })

describe('commitsSinceBase', () => {
  it('takes everything newer than the base and stops there', () => {
    expect(
      commitsSinceBase([c('c'), c('b'), c('base'), c('older')], 'base').map((x) => x.hash),
    ).toEqual(['c', 'b'])
  })

  it('does not treat a one-character overlap as a match', () => {
    // `b` prefixes `base`; matching loosely stopped the walk on the wrong commit.
    expect(commitsSinceBase([c('c'), c('b'), c('base')], 'base').map((x) => x.hash)).toEqual([
      'c',
      'b',
    ])
  })

  it('matches an abbreviated base sha in either direction', () => {
    expect(commitsSinceBase([c('c'), c('abcdef123456')], 'abcdef1')).toHaveLength(1)
    expect(commitsSinceBase([c('c'), c('abcdef1')], 'abcdef123456')).toHaveLength(1)
  })

  it('is empty when the branch tip IS the base', () => {
    expect(commitsSinceBase([c('base')], 'base')).toEqual([])
  })

  it('claims nothing when the base was never reached in the window', () => {
    // A short log window cannot prove which commits are the branch's own, and
    // crediting the run with the whole history is worse than saying nothing.
    expect(commitsSinceBase([c('c'), c('b')], 'base')).toEqual([])
  })

  it('claims nothing without a base', () => {
    expect(commitsSinceBase([c('c')], undefined)).toEqual([])
  })
})

describe('branchCommitsRefs', () => {
  const review = { branch: 'agent/cb1e3b4ae450', baseSha: 'base123', headSha: 'head456' }

  it('reads an open review from its branch, then from its recorded tip', () => {
    expect(branchCommitsRefs(review)).toEqual(['agent/cb1e3b4ae450', 'head456'])
  })

  it('reads an open review with no recorded tip from its branch alone', () => {
    expect(branchCommitsRefs({ branch: 'agent/x', baseSha: 'base123' })).toEqual(['agent/x'])
  })

  it('reads a rejected review only from its recorded tip — its branch was deleted', () => {
    expect(branchCommitsRefs({ ...review, rejectedAt: 1 })).toEqual(['head456'])
  })

  it('reads a merged review only from its recorded tip', () => {
    expect(branchCommitsRefs({ ...review, mergedAt: 1 })).toEqual(['head456'])
  })

  it('reads nothing for a decided review with no recorded tip', () => {
    expect(branchCommitsRefs({ branch: 'agent/x', baseSha: 'b', rejectedAt: 1 })).toEqual([])
  })

  it('reads nothing without a base to count from', () => {
    expect(branchCommitsRefs({ ...review, baseSha: '' })).toEqual([])
  })

  it('reads nothing without a review', () => {
    expect(branchCommitsRefs(undefined)).toEqual([])
  })

  it('asks for a tip that equals the branch name once', () => {
    expect(branchCommitsRefs({ branch: 'abc', baseSha: 'b', headSha: 'abc' })).toEqual(['abc'])
  })
})
