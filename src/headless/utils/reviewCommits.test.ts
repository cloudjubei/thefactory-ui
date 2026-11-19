import { describe, expect, it } from 'vitest'
import { reviewCommitsOfState, reviewCommitsView } from './reviewCommits'
import type { ReviewCommits, ReviewPullRequestCommits } from './reviewCommitsTypes'

const pr = (over: Partial<ReviewPullRequestCommits>): ReviewPullRequestCommits => ({
  url: 'https://github.com/o/r/pull/1',
  name: 'o/r #1',
  state: 'no-commits',
  commits: 0,
  ...over,
})

const of = (pullRequests: ReviewPullRequestCommits[]): ReviewCommits => ({
  ticketKey: 'ZNR-756',
  round: 2,
  checkedAt: '2026-11-19T10:00:00.000Z',
  pullRequests,
})

describe('reviewCommitsView', () => {
  it('adds up the commits pushed on every pull request since the round', () => {
    expect(
      reviewCommitsView(
        of([
          pr({ state: 'new-commits', commits: 2 }),
          pr({ state: 'new-commits', commits: 1 }),
          pr({ state: 'no-commits' }),
          pr({ state: 'unread' }),
        ]),
      ),
    ).toEqual({ label: '3 new commits', tone: 'news' })
    expect(reviewCommitsView(of([pr({ state: 'new-commits', commits: 1 })]))).toEqual({
      label: '1 new commit',
      tone: 'news',
    })
  })

  it('says nothing was pushed when every pull request read stands where the round left it', () => {
    expect(reviewCommitsView(of([pr({}), pr({ state: 'unread' })]))).toEqual({
      label: 'No new commits',
      tone: 'quiet',
    })
  })

  it('says history was rewritten when any pull request lost the head the round reviewed', () => {
    expect(
      reviewCommitsView(of([pr({ state: 'new-commits', commits: 4 }), pr({ state: 'rewritten' })])),
    ).toEqual({ label: 'Rewritten since review', tone: 'warn' })
  })

  it('says nothing without a pull request it could read', () => {
    expect(reviewCommitsView(undefined)).toBeUndefined()
    expect(reviewCommitsView(of([]))).toBeUndefined()
    expect(reviewCommitsView(of([pr({ state: 'unread' })]))).toBeUndefined()
  })
})

describe('reviewCommitsOfState', () => {
  it('is the commits once read, nothing before or after a failure', () => {
    const commits = of([pr({})])
    expect(reviewCommitsOfState({ kind: 'ready', commits })).toBe(commits)
    expect(reviewCommitsOfState({ kind: 'idle' })).toBeUndefined()
    expect(reviewCommitsOfState({ kind: 'loading' })).toBeUndefined()
    expect(reviewCommitsOfState({ kind: 'failed' })).toBeUndefined()
  })
})
