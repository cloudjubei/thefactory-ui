import { describe, expect, it } from 'vitest'
import { commitLinkNotice, resolveCommitLink } from './gitCommitLink'

const A = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'
const B = 'a1b2c3d9999999999999999999999999999999ff'
const C = 'ffeeddccbbaa99887766554433221100ffeeddcc'
const log = [{ hash: A }, { hash: B }, { hash: C }]

describe('resolveCommitLink', () => {
  it('has nothing to resolve without a link, or for the working tree', () => {
    expect(resolveCommitLink({ link: undefined, log, hasMore: true })).toEqual({ state: 'none' })
    expect(resolveCommitLink({ link: 'UNCOMMITTED', log, hasMore: true })).toEqual({
      state: 'none',
    })
  })

  it('finds a full sha', () => {
    expect(resolveCommitLink({ link: C, log, hasMore: false })).toEqual({ state: 'found', sha: C })
  })

  it('finds a unique short sha, in any case, as the full sha', () => {
    expect(resolveCommitLink({ link: 'FFEEDDC', log, hasMore: true })).toEqual({
      state: 'found',
      sha: C,
    })
    expect(resolveCommitLink({ link: 'a1b2c3d4', log, hasMore: true })).toEqual({
      state: 'found',
      sha: A,
    })
  })

  it('refuses a link shorter than seven characters', () => {
    expect(resolveCommitLink({ link: 'a1b2c3', log, hasMore: true })).toEqual({
      state: 'too-short',
      link: 'a1b2c3',
    })
  })

  it('says when a short sha matches several commits', () => {
    expect(resolveCommitLink({ link: 'a1b2c3d', log, hasMore: false })).toEqual({
      state: 'ambiguous',
      link: 'a1b2c3d',
      matches: 2,
    })
  })

  it('keeps searching while there is more history within the bound', () => {
    expect(resolveCommitLink({ link: '1234567', log, hasMore: true })).toEqual({
      state: 'searching',
      link: '1234567',
    })
  })

  it('stops at the end of the history', () => {
    expect(resolveCommitLink({ link: '1234567', log, hasMore: false })).toEqual({
      state: 'not-found',
      link: '1234567',
      searched: 3,
      exhausted: true,
    })
  })

  it('stops at the bound even when more history remains', () => {
    expect(resolveCommitLink({ link: '1234567', log, hasMore: true, maxCommits: 3 })).toEqual({
      state: 'not-found',
      link: '1234567',
      searched: 3,
      exhausted: false,
    })
  })

  it('ignores the whitespace around a link', () => {
    expect(resolveCommitLink({ link: ' ffeeddc ', log, hasMore: true })).toEqual({
      state: 'found',
      sha: C,
    })
  })
})

describe('commitLinkNotice', () => {
  it('says nothing while the link resolves or once it has', () => {
    expect(commitLinkNotice({ state: 'none' })).toBeUndefined()
    expect(commitLinkNotice({ state: 'found', sha: A })).toBeUndefined()
    expect(commitLinkNotice({ state: 'searching', link: 'abcdefg' })).toBeUndefined()
  })

  it('explains each way a link fails to resolve', () => {
    expect(commitLinkNotice({ state: 'too-short', link: 'abc' })).toBe(
      "A commit link needs at least 7 characters of the sha; 'abc' is too short.",
    )
    expect(commitLinkNotice({ state: 'ambiguous', link: 'a1b2c3d', matches: 2 })).toBe(
      "'a1b2c3d' matches 2 commits. Use more characters of the sha.",
    )
    expect(
      commitLinkNotice({ state: 'not-found', link: '1234567', searched: 40, exhausted: true }),
    ).toBe("No commit in this project's history matches '1234567'.")
    expect(
      commitLinkNotice({ state: 'not-found', link: '1234567', searched: 3000, exhausted: false }),
    ).toBe("'1234567' isn't among the latest 3,000 commits, so it isn't highlighted in the graph.")
  })
})
