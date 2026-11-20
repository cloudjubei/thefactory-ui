import { describe, expect, it } from 'vitest'
import type { ColleagueReview, ReviewPullRequestRef } from 'thefactory-tools/types'
import {
  reviewCardMerge,
  reviewMergeStopView,
  reviewMergeProgressLine,
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
    reviewedHeads: [],
  })
  const review = (...rounds: ReturnType<typeof round>[]) =>
    ({ rounds }) as unknown as ColleagueReview
  const idle = {
    job: null,
    readError: undefined,
    starting: undefined,
    refusal: undefined,
    actionError: undefined,
    choosing: undefined,
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

  it('offers the earlier round’s pull requests when the latest update, a thread reply, links none', () => {
    expect(
      reviewCardMerge(review(round(1, true, [WEB, API]), round(2, true, [])), 2, idle),
    ).toEqual({
      prs: reviewMergePullRequests([API, WEB]),
      starting: false,
    })
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

describe('reviewMergeStopView', () => {
  const conflict = {
    pullRequestUrl: API.url,
    name: 'coach-be#418',
    baseBranch: 'main',
    conflicts: true,
    files: ['src/app.ts', 'src/b.ts'],
    developer: 'Ana',
    ask: '@Ana coach-be#418 conflicts with main in src/app.ts and src/b.ts — could you bring main in and resolve it? Then I’ll merge.',
  }
  const stopped = (over: Partial<NonNullable<ReviewMergeJob['baseConflict']>> = {}) =>
    job({ state: 'failed', baseConflict: { ...conflict, ...over } })

  it('says which pull request conflicts with its base, on which files, offering to ask its developer', () => {
    expect(reviewMergeStopView(stopped(), undefined)).toEqual({
      line: 'coach-be #418 conflicts with main in src/app.ts and src/b.ts',
      askLabel: 'Ask Ana',
      draft: conflict.ask,
    })
  })

  it('says one that only lacks its base’s commits is behind, a few files named and the rest counted', () => {
    expect(
      reviewMergeStopView(
        stopped({ conflicts: false, files: [], developer: undefined }),
        undefined,
      ),
    ).toMatchObject({ line: 'coach-be #418 is behind main', askLabel: 'Ask the developer' })
    expect(
      reviewMergeStopView(stopped({ files: ['a', 'b', 'c', 'd', 'e'] }), undefined)?.line,
    ).toBe('coach-be #418 conflicts with main in a, b, c and 2 more')
    expect(reviewMergeStopView(stopped({ files: [] }), undefined)?.line).toBe(
      'coach-be #418 conflicts with main',
    )
  })

  it('shows the person’s choice at once while it is on its way', () => {
    expect(reviewMergeStopView(stopped(), { kind: 'resolve' })?.chosen).toEqual({
      line: 'Resolving it here…',
      tone: 'working',
      pending: true,
    })
    expect(reviewMergeStopView(stopped(), { kind: 'ask', text: 'x' })?.chosen).toEqual({
      line: 'Posting in the thread…',
      tone: 'working',
      pending: true,
    })
  })

  it('says what the person chose once it is done: resolving in the run, or asked with the post', () => {
    expect(
      reviewMergeStopView(stopped({ resolving: { at: 't', runId: 'run-1' } }), undefined)?.chosen,
    ).toEqual({ line: 'Resolving it in the review run', tone: 'working', pending: false })
    expect(
      reviewMergeStopView(
        stopped({ asked: { at: 't', permalink: 'https://acme.slack.com/archives/C1/p2' } }),
        undefined,
      )?.chosen,
    ).toEqual({
      line: 'Asked Ana in the thread',
      tone: 'review',
      pending: false,
      permalink: 'https://acme.slack.com/archives/C1/p2',
    })
    expect(
      reviewMergeStopView(
        stopped({ developer: undefined, asked: { at: 't', permalink: 'javascript:x' } }),
        undefined,
      )?.chosen,
    ).toEqual({ line: 'Asked the developer in the thread', tone: 'review', pending: false })
  })

  it('is nothing for a merge that did not stop on a base', () => {
    expect(reviewMergeStopView(job({ state: 'failed' }), undefined)).toBe(undefined)
    expect(reviewMergeStopView(job({ baseConflict: conflict }), undefined)).toBe(undefined)
    expect(reviewMergeStopView(null, undefined)).toBe(undefined)
  })

  it('rides on the review card’s merge', () => {
    const shown = reviewCardMerge(
      {
        rounds: [{ n: 1, recordedAt: 't', submission: { pullRequests: [API] }, reviewedHeads: [] }],
      } as unknown as ColleagueReview,
      1,
      {
        job: stopped(),
        readError: undefined,
        starting: undefined,
        refusal: undefined,
        actionError: undefined,
        choosing: { kind: 'resolve' },
      },
    )
    expect(shown?.stop).toMatchObject({ askLabel: 'Ask Ana', chosen: { pending: true } })
  })
})

describe('reviewMergeView ticket move', () => {
  it('says what the merge did with the ticket, in the backend’s words', () => {
    const view = reviewMergeView({
      job: job({
        state: 'merged',
        ticket: {
          moved: true,
          status: 'In QA',
          from: 'In Review',
          detail: 'Moved OSC-402 to In QA',
        },
      }),
      prs: [],
    })
    expect(view?.ticketMove).toEqual({ line: 'Moved OSC-402 to In QA', failed: false })
    const already = reviewMergeView({
      job: job({
        ticket: { moved: false, status: 'In QA', detail: 'OSC-402 is in In QA already' },
      }),
      prs: [],
    })
    expect(already?.ticketMove).toEqual({ line: 'OSC-402 is in In QA already', failed: false })
  })

  it('says why the ticket did not move', () => {
    const view = reviewMergeView({
      job: job({
        state: 'merged',
        ticket: { moved: false, status: 'In QA', error: 'No transition to In QA.', detail: 'x' },
      }),
      prs: [],
    })
    expect(view?.ticketMove).toEqual({ line: 'No transition to In QA.', failed: true })
  })

  it('says nothing of the ticket while there is nothing to say, or nothing was asked', () => {
    expect(
      reviewMergeView({ job: job({ ticket: { moved: false, status: 'In QA' } }), prs: [] })
        ?.ticketMove,
    ).toBeUndefined()
    expect(reviewMergeView({ job: job(), prs: [] })).not.toHaveProperty('ticketMove')
  })
})

describe('reviewMergeProgressLine', () => {
  it('says how many merged of how many, and the step the one going is at', () => {
    expect(reviewMergeProgressLine(job())).toBe(
      'Merging · 1 of 2 merged · waiting for checks on coach-web #77',
    )
    expect(
      reviewMergeProgressLine(
        job({
          pullRequests: [
            { url: API.url, state: 'approving' },
            { url: WEB.url, state: 'queued' },
          ],
        }),
      ),
    ).toBe('Merging · 0 of 2 merged · approving on coach-be #418')
  })

  it('says only the count while every pull request waits its turn, and how it ended once finished', () => {
    expect(
      reviewMergeProgressLine(job({ pullRequests: [{ url: API.url, state: 'queued' }] })),
    ).toBe('Merging · 0 of 1 merged')
    expect(
      reviewMergeProgressLine(
        job({
          state: 'merged',
          pullRequests: [
            { url: API.url, state: 'merged' },
            { url: WEB.url, state: 'merged' },
          ],
        }),
      ),
    ).toBe('Merged · 2 of 2 merged')
    expect(
      reviewMergeProgressLine(
        job({
          state: 'failed',
          pullRequests: [
            { url: API.url, state: 'merged' },
            { url: WEB.url, state: 'failed', detail: 'checks failed' },
          ],
        }),
      ),
    ).toBe('Stopped · 1 of 2 merged · failed on coach-web #77')
  })
})
