import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ColleagueReview } from 'thefactory-tools/types'
import {
  applyReviewRoundRecord,
  dropReviewFinding,
  markReviewWaitingGiven,
  parseReviewSubmission,
  startReviewRound,
} from 'thefactory-tools/utils'

const api = vi.hoisted(() => ({
  readColleagueReview: vi.fn(),
  dropColleagueReviewFinding: vi.fn(),
  markColleagueReviewWaitingGiven: vi.fn(),
}))

vi.mock('../api/colleagueReviewApi', () => api)

const sourceApi = vi.hoisted(() => ({ postColleagueReviewReply: vi.fn() }))

vi.mock('../api/colleagueReviewSourceApi', () => sourceApi)

import { ColleagueReviewStore, colleagueReviewKey } from './colleagueReviewStore'

const KEY = colleagueReviewKey('osc', 'ZNR-809')

const ok = <T>(update: { ok: true; review: T } | { ok: false; errors: string[] }): T => {
  if (!update.ok) throw new Error(update.errors.join('\n'))
  return update.review
}

const REVIEW: ColleagueReview = ok(
  applyReviewRoundRecord(
    startReviewRound(
      undefined,
      {
        groupId: 'osc',
        ticketKey: 'ZNR-809',
        submission: parseReviewSubmission('Done', { now: '2026-11-10T09:00:00.000Z' }),
      },
      '2026-11-10T09:00:00.000Z',
      () => 'r1',
    ),
    {
      groupId: 'osc',
      ticketKey: 'ZNR-809',
      round: 1,
      reviewedHeads: [],
      claims: [],
      requirements: [],
      findings: [{ kind: 'change', title: 'Guard it', detail: 'It throws.' }],
      waitingOn: [{ who: 'Priya', what: 'Sign off' }],
      verdict: 'changes-requested',
      reply: 'Thanks',
    },
    '2026-11-10T10:00:00.000Z',
  ),
)

const DROPPED = ok(dropReviewFinding(REVIEW, 'F1', 'Not needed', '2026-11-10T11:00:00.000Z'))
const GIVEN = ok(markReviewWaitingGiven(REVIEW, 'W1', undefined, '2026-11-10T11:00:00.000Z'))

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function fakeWs() {
  const handlers = new Map<string, Set<(data: unknown) => void>>()
  const reconnects = new Set<() => void>()
  return {
    on: <T = unknown>(event: string, handler: (data: T) => void) => {
      const set = handlers.get(event) ?? new Set()
      const held = handler as (data: unknown) => void
      set.add(held)
      handlers.set(event, set)
      return () => {
        set.delete(held)
      }
    },
    onReconnect: (handler: () => void) => {
      reconnects.add(handler)
      return () => {
        reconnects.delete(handler)
      }
    },
    emit: (event: string, data: unknown) => handlers.get(event)?.forEach((h) => h(data)),
    reconnect: () => reconnects.forEach((h) => h()),
  }
}

const findingState = (review: ColleagueReview | null | undefined) =>
  review?.findings[0]?.states.at(-1)?.state

beforeEach(() => {
  api.readColleagueReview.mockReset()
  api.dropColleagueReviewFinding.mockReset()
  api.markColleagueReviewWaitingGiven.mockReset()
  sourceApi.postColleagueReviewReply.mockReset()
})

describe('ColleagueReviewStore', () => {
  it('reads a review once for every holder, and keeps the snapshot until it changes', async () => {
    api.readColleagueReview.mockResolvedValue(REVIEW)
    const store = new ColleagueReviewStore(fakeWs())
    const listener = vi.fn()
    store.listen(KEY, listener)
    store.retain(KEY)
    store.retain(KEY)
    await vi.waitFor(() => expect(store.snapshot(KEY).review).toBe(REVIEW))
    expect(api.readColleagueReview).toHaveBeenCalledTimes(1)
    expect(api.readColleagueReview).toHaveBeenCalledWith('osc', 'ZNR-809')
    expect(listener).toHaveBeenCalled()
    expect(store.snapshot(KEY)).toBe(store.snapshot(KEY))
    expect(store.snapshot(KEY)).toMatchObject({ settled: true, readError: null })
  })

  it('reads again on its own update and on a reconnect, never on another review’s', async () => {
    api.readColleagueReview.mockResolvedValue(REVIEW)
    const ws = fakeWs()
    const store = new ColleagueReviewStore(ws)
    store.retain(KEY)
    await vi.waitFor(() => expect(api.readColleagueReview).toHaveBeenCalledTimes(1))
    ws.emit('colleagueReviews:updated', { groupId: 'osc', ticketKey: 'ZNR-810' })
    ws.emit('colleagueReviews:updated', { groupId: 'other', ticketKey: 'ZNR-809' })
    expect(api.readColleagueReview).toHaveBeenCalledTimes(1)
    ws.emit('colleagueReviews:updated', { groupId: 'osc', ticketKey: 'ZNR-809' })
    await vi.waitFor(() => expect(api.readColleagueReview).toHaveBeenCalledTimes(2))
    ws.reconnect()
    await vi.waitFor(() => expect(api.readColleagueReview).toHaveBeenCalledTimes(3))
  })

  it('holds a review that is not there as none', async () => {
    api.readColleagueReview.mockResolvedValue(null)
    const store = new ColleagueReviewStore(fakeWs())
    store.retain(KEY)
    await vi.waitFor(() => expect(store.snapshot(KEY).settled).toBe(true))
    expect(store.snapshot(KEY).review).toBeNull()
  })

  it('shows a drop at once, and keeps it over a read begun before it', async () => {
    const reading = deferred<ColleagueReview>()
    api.readColleagueReview.mockResolvedValueOnce(REVIEW).mockReturnValueOnce(reading.promise)
    const ws = fakeWs()
    const store = new ColleagueReviewStore(ws)
    store.retain(KEY)
    await vi.waitFor(() => expect(store.snapshot(KEY).review).toBe(REVIEW))
    ws.emit('colleagueReviews:updated', { groupId: 'osc', ticketKey: 'ZNR-809' })
    const dropping = deferred<ColleagueReview>()
    api.dropColleagueReviewFinding.mockReturnValue(dropping.promise)
    const going = store.drop(KEY, 'F1', 'Not needed')
    expect(findingState(store.snapshot(KEY).review)).toBe('dropped')
    expect(store.snapshot(KEY).pending.drops.has('F1')).toBe(true)
    void store.drop(KEY, 'F1')
    expect(api.dropColleagueReviewFinding).toHaveBeenCalledTimes(1)
    expect(api.dropColleagueReviewFinding).toHaveBeenCalledWith(
      'osc',
      'ZNR-809',
      'F1',
      'Not needed',
    )
    dropping.resolve(DROPPED)
    await going
    expect(store.snapshot(KEY).pending.drops.size).toBe(0)
    reading.resolve(REVIEW)
    await vi.waitFor(() => expect(api.readColleagueReview).toHaveBeenCalledTimes(2))
    await Promise.resolve()
    expect(findingState(store.snapshot(KEY).review)).toBe('dropped')
  })

  it('takes a read as new as the change once it comes', async () => {
    api.readColleagueReview.mockResolvedValueOnce(REVIEW).mockResolvedValueOnce(GIVEN)
    api.dropColleagueReviewFinding.mockResolvedValue(DROPPED)
    const ws = fakeWs()
    const store = new ColleagueReviewStore(ws)
    store.retain(KEY)
    await vi.waitFor(() => expect(store.snapshot(KEY).review).toBe(REVIEW))
    await store.drop(KEY, 'F1')
    expect(store.snapshot(KEY).review).toBe(DROPPED)
    ws.emit('colleagueReviews:updated', { groupId: 'osc', ticketKey: 'ZNR-809' })
    await vi.waitFor(() => expect(store.snapshot(KEY).review).toBe(GIVEN))
  })

  it('rolls a change back with why when it fails, and clears why on the next', async () => {
    api.readColleagueReview.mockResolvedValue(REVIEW)
    api.markColleagueReviewWaitingGiven.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { error: 'The store refused it.' } },
    })
    const store = new ColleagueReviewStore(fakeWs())
    store.retain(KEY)
    await vi.waitFor(() => expect(store.snapshot(KEY).review).toBe(REVIEW))
    const going = store.markGiven(KEY, 'W1', 'In Slack')
    expect(store.snapshot(KEY).review?.waitingOn[0]?.state).toBe('given')
    await going
    expect(store.snapshot(KEY).review).toBe(REVIEW)
    expect(store.snapshot(KEY).actionError).toBe('The store refused it.')
    api.markColleagueReviewWaitingGiven.mockResolvedValueOnce(GIVEN)
    const again = store.markGiven(KEY, 'W1')
    expect(store.snapshot(KEY).actionError).toBeUndefined()
    await again
    expect(store.snapshot(KEY).review).toBe(GIVEN)
  })

  it('falls back on its own words when a failure says nothing', async () => {
    api.readColleagueReview.mockResolvedValue(REVIEW)
    api.dropColleagueReviewFinding.mockRejectedValue({})
    api.markColleagueReviewWaitingGiven.mockRejectedValue({})
    const store = new ColleagueReviewStore(fakeWs())
    store.retain(KEY)
    await vi.waitFor(() => expect(store.snapshot(KEY).review).toBe(REVIEW))
    await store.drop(KEY, 'F1')
    expect(store.snapshot(KEY).actionError).toBe('The finding was not dropped.')
    await store.markGiven(KEY, 'W1')
    expect(store.snapshot(KEY).actionError).toBe('It was not marked given.')
  })

  it('says why a read failed', async () => {
    api.readColleagueReview.mockRejectedValue(new Error('Down'))
    const store = new ColleagueReviewStore(fakeWs())
    store.retain(KEY)
    await vi.waitFor(() => expect(store.snapshot(KEY).readError?.message).toBe('Down'))
    expect(store.snapshot(KEY).review).toBeUndefined()
  })

  describe('posting a reply in the thread', () => {
    const POSTED: ColleagueReview = {
      ...REVIEW,
      updatedAt: '2026-11-10T12:00:00.000Z',
      rounds: REVIEW.rounds.map((r) => ({
        ...r,
        postedReply: {
          permalink: 'https://acme.slack.com/archives/C1/p1763380000999999',
          ts: '1763380000.999999',
          postedAt: '2026-11-10T12:00:00.000Z',
        },
      })),
    }

    it('shows the round posting at once, posts once however often it is pressed, then shows where', async () => {
      api.readColleagueReview.mockResolvedValue(REVIEW)
      const store = new ColleagueReviewStore(fakeWs())
      store.retain(KEY)
      await vi.waitFor(() => expect(store.snapshot(KEY).review).toBe(REVIEW))
      const posting = deferred<ColleagueReview>()
      sourceApi.postColleagueReviewReply.mockReturnValue(posting.promise)
      const going = store.postReply(KEY, 1, false)
      expect(store.snapshot(KEY).pending.posts.has(1)).toBe(true)
      void store.postReply(KEY, 1, true)
      expect(sourceApi.postColleagueReviewReply).toHaveBeenCalledTimes(1)
      expect(sourceApi.postColleagueReviewReply).toHaveBeenCalledWith('osc', 'ZNR-809', 1, false)
      posting.resolve(POSTED)
      await going
      expect(store.snapshot(KEY).pending.posts.size).toBe(0)
      expect(store.snapshot(KEY).review).toBe(POSTED)
    })

    it('posts again only when asked to', async () => {
      api.readColleagueReview.mockResolvedValue(POSTED)
      sourceApi.postColleagueReviewReply.mockResolvedValue(POSTED)
      const store = new ColleagueReviewStore(fakeWs())
      await store.postReply(KEY, 1, true)
      expect(sourceApi.postColleagueReviewReply).toHaveBeenCalledWith('osc', 'ZNR-809', 1, true)
    })

    it('says why it was not posted, in the backend’s words or its own', async () => {
      api.readColleagueReview.mockResolvedValue(REVIEW)
      const store = new ColleagueReviewStore(fakeWs())
      store.retain(KEY)
      await vi.waitFor(() => expect(store.snapshot(KEY).review).toBe(REVIEW))
      sourceApi.postColleagueReviewReply.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 502, data: { error: 'Slack refused the reply: channel_not_found.' } },
      })
      await store.postReply(KEY, 1, false)
      expect(store.snapshot(KEY)).toMatchObject({
        review: REVIEW,
        actionError: 'Slack refused the reply: channel_not_found.',
      })
      expect(store.snapshot(KEY).pending.posts.size).toBe(0)
      sourceApi.postColleagueReviewReply.mockRejectedValueOnce({})
      await store.postReply(KEY, 1, false)
      expect(store.snapshot(KEY).actionError).toBe('The reply was not posted.')
    })
  })
})
