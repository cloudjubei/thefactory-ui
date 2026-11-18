import { describe, expect, it } from 'vitest'
import type { ColleagueReview, ReviewPullRequestRef } from 'thefactory-tools/types'
import {
  reviewCardMerge,
  reviewMergePullRequests,
  reviewMergeStartBody,
  reviewMergeView,
} from './colleagueReviewMerge'
import type { ReviewMergeJob } from './colleagueReviewMergeTypes'

const pr = (repo: string, number: number): ReviewPullRequestRef => ({
  url: `https://github.com/acme/${repo}/pull/${number}`,
  host: 'github',
  owner: 'acme',
  repo,
  number,
})

const WEB = pr('coach-web', 77)
const API = pr('coach-be', 418)
const BACKEND = pr('Backend-Services', 9)

const job = (over: Partial<ReviewMergeJob> = {}): ReviewMergeJob => ({
  jobId: 'j1',
  groupId: 'osc',
  ticketKey: 'OSC-402',
  round: 2,
  state: 'running',
  startedAt: '2026-11-17T12:00:00.000Z',
  pullRequests: [
    { url: API.url, state: 'merged' },
    { url: WEB.url, state: 'waiting-for-checks', detail: 'build, lint' },
  ],
  ...over,
})

describe('reviewMergePullRequests', () => {
  it('lists the backend’s first, the rest in the order the update gave them', () => {
    expect(reviewMergePullRequests([WEB, API, BACKEND]).map((p) => p.name)).toEqual([
      'coach-be #418',
      'Backend-Services #9',
      'coach-web #77',
    ])
  })

  it('names one it cannot read by its link', () => {
    const other: ReviewPullRequestRef = {
      url: 'https://dev.azure.com/x/_git/y/pullrequest/5',
      host: 'other',
    }
    expect(reviewMergePullRequests([other])).toEqual([
      { url: other.url, name: other.url, backend: false },
    ])
  })
})

describe('reviewMergeStartBody', () => {
  it('sends the round, the Slack line only when typed, and the override only when asked', () => {
    expect(reviewMergeStartBody(2, '  ', false)).toEqual({ round: 2 })
    expect(reviewMergeStartBody(2, ' Merged, thanks! ', true)).toEqual({
      round: 2,
      slackText: 'Merged, thanks!',
      override: true,
    })
  })
})

describe('reviewMergeView', () => {
  const prs = reviewMergePullRequests([WEB, API])

  it('is nothing while no merge was ever started', () => {
    expect(reviewMergeView({ job: null, prs })).toBeUndefined()
    expect(reviewMergeView({ job: undefined, prs })).toBeUndefined()
  })

  it('shows a merge starting at once, its pull requests waiting their turn', () => {
    expect(reviewMergeView({ job: null, starting: true, prs })).toEqual({
      label: 'Starting…',
      tone: 'working',
      running: true,
      rows: [
        { url: API.url, name: 'coach-be #418', label: 'Waiting its turn', tone: 'queued' },
        { url: WEB.url, name: 'coach-web #77', label: 'Waiting its turn', tone: 'queued' },
      ],
    })
  })

  it('follows each pull request while it runs, with why it stands there', () => {
    expect(reviewMergeView({ job: job(), prs })).toEqual({
      label: 'Merging',
      tone: 'working',
      running: true,
      rows: [
        { url: API.url, name: 'coach-be #418', label: 'Merged', tone: 'done' },
        {
          url: WEB.url,
          name: 'coach-web #77',
          label: 'Waiting for checks',
          tone: 'working',
          detail: 'build, lint',
        },
      ],
    })
  })

  it('says each state its own way', () => {
    const states = [
      'queued',
      'waiting-for-checks',
      'marking-viewed',
      'approving',
      'merging',
      'merged',
      'failed',
      'skipped',
    ] as const
    const rows = reviewMergeView({
      job: job({ pullRequests: states.map((state) => ({ url: `u-${state}`, state })) }),
      prs: [],
    })?.rows
    expect(rows?.map((r) => [r.name, r.label, r.tone])).toEqual([
      ['u-queued', 'Waiting its turn', 'queued'],
      ['u-waiting-for-checks', 'Waiting for checks', 'working'],
      ['u-marking-viewed', 'Marking files viewed', 'working'],
      ['u-approving', 'Approving', 'working'],
      ['u-merging', 'Merging', 'working'],
      ['u-merged', 'Merged', 'done'],
      ['u-failed', 'Failed', 'stuck'],
      ['u-skipped', 'Skipped', 'empty'],
    ])
  })

  it('says what came of it once merged, with the Slack message', () => {
    const view = reviewMergeView({
      job: job({
        state: 'merged',
        finishedAt: '2026-11-17T12:10:00.000Z',
        pullRequests: [
          { url: API.url, state: 'merged' },
          { url: WEB.url, state: 'merged' },
        ],
        summary: 'Both pull requests merged.',
        slack: { posted: true, permalink: 'https://acme.slack.com/archives/C1/p1' },
      }),
      prs,
    })
    expect(view).toMatchObject({
      label: 'Merged',
      tone: 'done',
      running: false,
      summary: 'Both pull requests merged.',
      slack: { line: 'Posted in Slack', permalink: 'https://acme.slack.com/archives/C1/p1' },
    })
  })

  it('says where it stopped, and why Slack heard nothing', () => {
    const failed = reviewMergeView({
      job: job({
        state: 'failed',
        pullRequests: [
          { url: API.url, state: 'failed', detail: 'Required checks failed.' },
          { url: WEB.url, state: 'skipped' },
        ],
        summary: 'Stopped at coach-be #418.',
        error: 'GitHub said no.',
        slack: { posted: false, error: 'not_in_channel' },
      }),
      prs,
    })
    expect(failed).toMatchObject({
      label: 'Stopped',
      tone: 'stuck',
      running: false,
      summary: 'Stopped at coach-be #418.',
      error: 'GitHub said no.',
      slack: { line: 'Not posted in Slack: not_in_channel' },
    })
    expect(
      reviewMergeView({
        job: job({ state: 'merged', slack: { posted: false, detail: 'Posted already.' } }),
        prs,
      })?.slack,
    ).toEqual({ line: 'Posted already.' })
  })

  it('keeps only an https Slack link', () => {
    expect(
      reviewMergeView({
        job: job({ state: 'merged', slack: { posted: true, permalink: 'javascript:x' } }),
        prs,
      })?.slack,
    ).toEqual({ line: 'Posted in Slack' })
  })
})

describe('reviewCardMerge', () => {
  const round = (n: number, recorded: boolean, prs: ReviewPullRequestRef[]) => ({
    n,
    ...(recorded ? { recordedAt: '2026-11-17T10:00:00.000Z' } : {}),
    submission: { pullRequests: prs },
  })
  const review = (...rounds: ReturnType<typeof round>[]) =>
    ({ rounds }) as unknown as ColleagueReview
  const idle = {
    job: null,
    readError: undefined,
    starting: undefined,
    refusal: undefined,
    actionError: undefined,
  }

  it('offers the latest recorded round’s pull requests, the backend’s first', () => {
    expect(reviewCardMerge(review(round(1, true, [WEB, API])), 1, idle)).toEqual({
      prs: reviewMergePullRequests([API, WEB]),
      starting: false,
    })
  })

  it('carries the merge as it goes, the backend’s hold, and why a start failed', () => {
    const merge = reviewCardMerge(review(round(1, true, [API])), 1, {
      ...idle,
      job: job(),
      refusal: 'Round 1 asked for changes.',
      actionError: 'Nope.',
    })
    expect(merge).toMatchObject({
      starting: false,
      refusal: 'Round 1 asked for changes.',
      actionError: 'Nope.',
      view: { label: 'Merging' },
    })
    expect(
      reviewCardMerge(review(round(1, true, [API])), 1, { ...idle, starting: { round: 1 } }),
    ).toMatchObject({ starting: true, view: { label: 'Starting…' } })
  })

  it('offers nothing on an earlier round, one not recorded yet, or one without pull requests', () => {
    expect(
      reviewCardMerge(review(round(1, true, [API]), round(2, true, [WEB])), 1, idle),
    ).toBeUndefined()
    expect(reviewCardMerge(review(round(1, false, [API])), 1, idle)).toBeUndefined()
    expect(reviewCardMerge(review(round(1, true, [])), 1, idle)).toBeUndefined()
    expect(reviewCardMerge(null, 1, idle)).toBeUndefined()
  })

  it('still follows a merge on a round without pull requests listed', () => {
    expect(reviewCardMerge(review(round(1, true, [])), 1, { ...idle, job: job() })).toMatchObject({
      prs: [],
      view: { label: 'Merging' },
    })
  })
})
