import { describe, expect, it } from 'vitest'

import { commitsSinceBase } from './branchCommits'

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
