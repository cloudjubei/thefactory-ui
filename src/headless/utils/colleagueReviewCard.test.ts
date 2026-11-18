import { describe, expect, it } from 'vitest'
import type { ColleagueReview, ColleagueReviewRoundRecord } from 'thefactory-tools/types'
import {
  applyReviewRoundRecord,
  dropReviewFinding,
  markReviewWaitingGiven,
  parseReviewSubmission,
  startReviewRound,
} from 'thefactory-tools/utils'
import {
  colleagueReviewCallKey,
  colleagueReviewCallRefusal,
  colleagueReviewCallRound,
  colleagueReviewCardView,
  colleagueReviewToolOf,
  reviewReplyToPost,
  reviewRoundView,
} from './colleagueReviewCard'
import type { ColleagueReviewCardView, ReviewRoundView } from './colleagueReviewCardTypes'

const KEY = { groupId: 'osc', ticketKey: 'ZNR-809' }

const started = (
  review: ColleagueReview | undefined,
  at: string,
  text: string,
  files: string[] = [],
) =>
  startReviewRound(
    review,
    { ...KEY, submission: parseReviewSubmission(text, { now: at, attachments: files }) },
    at,
    () => 'review-1',
  )

const recorded = (
  review: ColleagueReview,
  record: Partial<ColleagueReviewRoundRecord>,
  at: string,
) => {
  const done = applyReviewRoundRecord(
    review,
    {
      ...KEY,
      round: review.rounds.length,
      reviewedHeads: [],
      claims: [],
      requirements: [],
      findings: [],
      waitingOn: [],
      verdict: 'changes-requested',
      reply: 'Thanks!',
      ...record,
    },
    at,
  )
  if (!done.ok) throw new Error(done.errors.join('\n'))
  return done.review
}

const ok = <T>(update: { ok: true; review: T } | { ok: false; errors: string[] }): T => {
  if (!update.ok) throw new Error(update.errors.join('\n'))
  return update.review
}

const ROUND_ONE = recorded(
  started(undefined, '2026-11-10T09:00:00.000Z', 'Done, see the PR.', ['a.png', 'notes.md']),
  {
    findings: [
      { kind: 'change', title: 'Guard the empty plan', detail: 'It throws on none.' },
      { kind: 'request', title: 'Add a test', detail: 'Cover the retry.' },
      { kind: 'small', title: 'Typo in the log', detail: 'recieved' },
      { kind: 'change', title: 'Use the flag', detail: 'Behind PLAN_V2.' },
    ],
    waitingOn: [{ who: 'Priya', what: 'Sign off the rollout' }],
    reply: 'Round one reply',
  },
  '2026-11-10T10:00:00.000Z',
)

const ROUND_TWO_STARTED = started(ROUND_ONE, '2026-11-12T09:00:00.000Z', 'Fixed most of it.')

const ROUND_TWO = recorded(
  ok(dropReviewFinding(ROUND_TWO_STARTED, 'F3', 'Not worth a round', '2026-11-12T09:30:00.000Z')),
  {
    findings: [
      { id: 'F1', state: 'fixed', evidence: ['plan.ts:41'] },
      { id: 'F2', state: 'still-open', note: 'No test yet' },
      { id: 'F4', state: 'no-longer-applies', evidence: ['flag removed in #390'] },
      { kind: 'question', title: 'Why two retries?', detail: 'Say why.' },
    ],
    waitingOn: [{ who: 'Sam', what: 'Approve the data fix' }],
    reply: 'Round two reply',
  },
  '2026-11-12T10:00:00.000Z',
)

const ROUND_TWO_GIVEN = ok(
  markReviewWaitingGiven(ROUND_TWO, 'W1', 'In Slack', '2026-11-12T11:00:00.000Z'),
)

const review = (view: ColleagueReviewCardView) => {
  if (view.kind !== 'review') throw new Error(`a ${view.kind} card`)
  return view
}

const ids = (round: ReviewRoundView) =>
  Object.fromEntries(round.groups.map((g) => [g.id, g.findings.map((f) => f.id)]))

describe('colleagueReviewToolOf', () => {
  it('names both review tools, under a CLI prefix too', () => {
    expect(colleagueReviewToolOf('recordColleagueReviewRound')).toBe('record')
    expect(colleagueReviewToolOf('mcp__thefactory__readColleagueReview')).toBe('read')
    expect(colleagueReviewToolOf('readPullRequestForReview')).toBeUndefined()
    expect(colleagueReviewToolOf(undefined)).toBeUndefined()
  })
})

describe('colleagueReviewCallKey', () => {
  it('takes the answer first, then the arguments, then the review chat', () => {
    const chatContextId = 'groups/osc/topics/review-ZNR-809'
    expect(
      colleagueReviewCallKey({
        result: { ok: true, review: { groupId: 'g2', ticketKey: 'A-1' } },
        args: { groupId: 'g3', ticketKey: 'B-1' },
        chatContextId,
      }),
    ).toEqual({ groupId: 'g2', ticketKey: 'A-1' })
    expect(colleagueReviewCallKey({ args: { ticketKey: 'B-1' }, chatContextId })).toEqual({
      groupId: 'osc',
      ticketKey: 'B-1',
    })
    expect(colleagueReviewCallKey({ args: {}, chatContextId })).toEqual(KEY)
  })

  it('falls back on the chat’s group, and finds nothing outside a review chat', () => {
    expect(colleagueReviewCallKey({ args: { ticketKey: 'B-1' }, groupId: 'g9' })).toEqual({
      groupId: 'g9',
      ticketKey: 'B-1',
    })
    expect(
      colleagueReviewCallKey({ args: {}, chatContextId: 'groups/osc/topics/ticket-ZNR-809' }),
    ).toBeUndefined()
    expect(colleagueReviewCallKey({ args: { ticketKey: '  ' } })).toBeUndefined()
  })
})

describe('colleagueReviewCallRound', () => {
  it('reads the recorded round from the arguments and a read’s from its answer', () => {
    expect(colleagueReviewCallRound('record', { round: 2 }, { round: 3 })).toBe(2)
    expect(colleagueReviewCallRound('read', { round: 2 }, { round: 3 })).toBe(3)
    expect(colleagueReviewCallRound('record', { round: 0 }, undefined)).toBeUndefined()
    expect(colleagueReviewCallRound('record', { round: '2' }, undefined)).toBeUndefined()
  })
})

describe('colleagueReviewCallRefusal', () => {
  it('says what a refused, failed or errored call was told', () => {
    expect(
      colleagueReviewCallRefusal({ ok: false, errors: ['F2 is not answered', 7] }, 'success'),
    ).toEqual(['F2 is not answered'])
    expect(colleagueReviewCallRefusal({ error: 'review chat only' }, 'success')).toEqual([
      'review chat only',
    ])
    expect(colleagueReviewCallRefusal('boom', 'errored')).toEqual(['boom'])
    expect(colleagueReviewCallRefusal({ error: 'x' }, 'errored')).toEqual(['x'])
    expect(colleagueReviewCallRefusal(undefined, 'errored')).toEqual([])
  })

  it('finds no refusal on a call that went through or has not run', () => {
    expect(colleagueReviewCallRefusal({ ok: true, review: {} }, 'success')).toBeUndefined()
    expect(colleagueReviewCallRefusal(undefined, 'running')).toBeUndefined()
  })
})

describe('reviewRoundView', () => {
  it('lists a first round’s findings as found, with its verdict, reply and files', () => {
    const round = reviewRoundView(ROUND_ONE, 1)
    expect(round).toMatchObject({
      n: 1,
      title: 'Round 1 of 1',
      latest: true,
      recorded: true,
      verdict: 'changes-requested',
      verdictLabel: 'Changes requested',
      verdictTone: 'working',
      reply: 'Round one reply',
      files: 2,
      summary: '4 found · waiting on 1',
    })
    expect(round.groups.map((g) => [g.id, g.label])).toEqual([['raised', 'Found']])
    expect(round.groups[0]!.findings[0]).toMatchObject({
      id: 'F1',
      kindLabel: 'Change',
      state: 'open',
      stateLabel: 'Open',
      canDrop: true,
      byYou: false,
      saving: false,
    })
    expect(round.waitingOn[0]).toMatchObject({
      id: 'W1',
      who: 'Priya',
      state: 'outstanding',
      stateLabel: 'Waiting',
      canMarkGiven: true,
    })
  })

  it('splits a later round by what became of each finding, the person’s drop apart', () => {
    const round = reviewRoundView(ROUND_TWO_GIVEN, 2)
    expect(ids(round)).toEqual({
      fixed: ['F1'],
      stillOpen: ['F2'],
      raised: ['F5'],
      noLongerApplies: ['F4'],
      dropped: ['F3'],
    })
    expect(round.groups.map((g) => g.label)).toEqual([
      'Fixed since last round',
      'Still open',
      'New',
      'No longer applies',
      'Dropped by you',
    ])
    expect(round.summary).toBe(
      '1 fixed · 1 still open · 1 new · 1 no longer apply · 1 dropped · waiting on 1',
    )
    const finding = (id: string) =>
      round.groups.flatMap((g) => g.findings).find((f) => f.id === id)!
    expect(finding('F1')).toMatchObject({
      state: 'fixed',
      evidence: ['plan.ts:41'],
      canDrop: false,
    })
    expect(finding('F2')).toMatchObject({ state: 'still-open', note: 'No test yet', canDrop: true })
    expect(finding('F3')).toMatchObject({
      state: 'dropped',
      stateLabel: 'Dropped by you',
      byYou: true,
      note: 'Not worth a round',
      canDrop: false,
    })
  })

  it('shows a wait the person marked given as theirs, and offers Given only on what is outstanding', () => {
    const round = reviewRoundView(ROUND_TWO_GIVEN, 2)
    expect(round.waitingOn.map((w) => [w.id, w.stateLabel, w.byYou, w.canMarkGiven])).toEqual([
      ['W1', 'Given · by you', true, false],
      ['W2', 'Waiting', false, true],
    ])
  })

  it('keeps an earlier round as it was, with nothing to act on', () => {
    const round = reviewRoundView(ROUND_TWO_GIVEN, 1)
    expect(round).toMatchObject({ title: 'Round 1 of 2', latest: false })
    expect(ids(round)).toEqual({ raised: ['F1', 'F2', 'F3', 'F4'] })
    expect(round.groups.flatMap((g) => g.findings).some((f) => f.canDrop || f.byYou)).toBe(false)
    expect(round.waitingOn).toEqual([
      expect.objectContaining({ id: 'W1', state: 'outstanding', canMarkGiven: false }),
    ])
  })

  it('says a round still being reviewed is, with what it has to check', () => {
    const round = reviewRoundView(
      ok(dropReviewFinding(ROUND_TWO_STARTED, 'F3', undefined, '2026-11-12T09:30:00.000Z')),
      2,
    )
    expect(round).toMatchObject({ recorded: false, summary: 'Being reviewed' })
    expect(round).not.toHaveProperty('verdict')
    expect(round).not.toHaveProperty('reply')
    expect(ids(round)).toEqual({ toCheck: ['F1', 'F2', 'F4'], dropped: ['F3'] })
    expect(round.groups[0]!.findings.every((f) => f.canDrop)).toBe(true)
  })

  it('marks what the person has on its way', () => {
    const round = reviewRoundView(ROUND_TWO, 2, {
      drops: new Set(['F2']),
      givens: new Set(['W1']),
      posts: new Set(),
    })
    const all = round.groups.flatMap((g) => g.findings)
    expect(all.find((f) => f.id === 'F2')?.saving).toBe(true)
    expect(all.find((f) => f.id === 'F1')?.saving).toBe(false)
    expect(round.waitingOn.find((w) => w.id === 'W1')?.saving).toBe(true)
  })

  it('says when a recorded round asks nothing more', () => {
    const approved = recorded(
      started(undefined, '2026-11-10T09:00:00.000Z', 'Done.'),
      { verdict: 'approve', reply: 'Ship it' },
      '2026-11-10T10:00:00.000Z',
    )
    expect(reviewRoundView(approved, 1)).toMatchObject({
      summary: 'Nothing to fix.',
      verdictLabel: 'Approve',
      verdictTone: 'done',
      groups: [],
    })
  })
})

describe('colleagueReviewCardView', () => {
  it('draws the round the call was about, every round beside it', () => {
    const view = review(colleagueReviewCardView({ tool: 'record', review: ROUND_TWO, round: 1 }))
    expect(view.round.n).toBe(1)
    expect(view.rounds.map((r) => r.n)).toEqual([1, 2])
    expect(view.laterNote).toBe('Round 2 is the latest: act on it there.')
    expect(view.ticketKey).toBe('ZNR-809')
  })

  it('draws the latest round when the call names none or one past it', () => {
    expect(review(colleagueReviewCardView({ tool: 'read', review: ROUND_TWO })).round.n).toBe(2)
    const past = review(colleagueReviewCardView({ tool: 'record', review: ROUND_TWO, round: 9 }))
    expect(past.round.n).toBe(2)
    expect(past).not.toHaveProperty('laterNote')
  })

  it('says why the person’s last change did not go through', () => {
    expect(
      review(colleagueReviewCardView({ tool: 'read', review: ROUND_TWO, actionError: 'No.' }))
        .actionError,
    ).toBe('No.')
  })

  it('draws a refusal in place of the review', () => {
    expect(
      colleagueReviewCardView({
        tool: 'record',
        review: ROUND_TWO,
        refusal: ['F2 is not answered'],
      }),
    ).toEqual({
      kind: 'refused',
      line: 'Not recorded. The agent was told why:',
      errors: ['F2 is not answered'],
    })
  })

  it('waits, fails, or says there is no review yet', () => {
    expect(colleagueReviewCardView({ tool: 'read', review: undefined })).toEqual({
      kind: 'loading',
    })
    expect(colleagueReviewCardView({ tool: 'read', review: undefined, readError: 'Down' })).toEqual(
      {
        kind: 'failed',
        line: 'Down',
      },
    )
    expect(colleagueReviewCardView({ tool: 'read', review: null, ticketKey: 'ZNR-809' })).toEqual({
      kind: 'none',
      line: 'No review of ZNR-809 yet.',
    })
    expect(colleagueReviewCardView({ tool: 'read', review: null })).toEqual({
      kind: 'none',
      line: 'This chat is not a ticket’s review.',
    })
  })
})

describe('posting a round’s reply in the thread', () => {
  const NO_PENDING = {
    drops: new Set<string>(),
    givens: new Set<string>(),
    posts: new Set<number>(),
  }
  const POSTED_LINK = 'https://acme.slack.com/archives/C1/p1763380000999999'
  const posted = (link = POSTED_LINK): ColleagueReview => ({
    ...ROUND_TWO,
    rounds: ROUND_TWO.rounds.map((r) =>
      r.n === 2
        ? { ...r, postedReply: { permalink: link, ts: '1', postedAt: '2026-11-12T12:00:00.000Z' } }
        : r,
    ),
  })

  it('is offered on a recorded reply while the group watches a working thread', () => {
    expect(reviewRoundView(ROUND_TWO, 2, NO_PENDING, true).post).toEqual({
      canPost: true,
      posting: false,
    })
    expect(reviewRoundView(ROUND_TWO, 1, NO_PENDING, true).post).toEqual({
      canPost: true,
      posting: false,
    })
  })

  it('is not offered without a working thread, nor on a round with no reply yet', () => {
    expect(reviewRoundView(ROUND_TWO, 2, NO_PENDING, false)).not.toHaveProperty('post')
    expect(reviewRoundView(ROUND_TWO, 2)).not.toHaveProperty('post')
    expect(reviewRoundView(ROUND_TWO_STARTED, 2, NO_PENDING, true)).not.toHaveProperty('post')
  })

  it('shows where it was posted, offering it again only with a working thread', () => {
    expect(reviewRoundView(posted(), 2, NO_PENDING, true).post).toEqual({
      canPost: true,
      posting: false,
      posted: { permalink: POSTED_LINK, postedAt: '2026-11-12T12:00:00.000Z' },
    })
    expect(reviewRoundView(posted(), 2, NO_PENDING, false).post).toEqual({
      canPost: false,
      posting: false,
      posted: { permalink: POSTED_LINK, postedAt: '2026-11-12T12:00:00.000Z' },
    })
    expect(reviewRoundView(posted('javascript:x'), 2, NO_PENDING, false)).not.toHaveProperty('post')
  })

  it('carries the person’s edit as what was posted, when they changed the draft', () => {
    const edited: ColleagueReview = {
      ...ROUND_TWO,
      rounds: ROUND_TWO.rounds.map((r) =>
        r.n === 2
          ? {
              ...r,
              postedReply: {
                permalink: POSTED_LINK,
                ts: '1',
                text: 'Thanks, all good now.',
                postedAt: '2026-11-12T12:00:00.000Z',
              },
            }
          : r,
      ),
    }
    expect(reviewRoundView(edited, 2, NO_PENDING, true).post?.posted).toEqual({
      permalink: POSTED_LINK,
      postedAt: '2026-11-12T12:00:00.000Z',
      text: 'Thanks, all good now.',
    })
  })

  it('marks a post on its way', () => {
    expect(
      reviewRoundView(ROUND_TWO, 2, { ...NO_PENDING, posts: new Set([2]) }, true).post?.posting,
    ).toBe(true)
  })

  it('is drawn on the card from whether the group watches a working thread', () => {
    const view = review(
      colleagueReviewCardView({ tool: 'record', review: ROUND_TWO, thread: true }),
    )
    expect(view.round.post?.canPost).toBe(true)
    const without = review(colleagueReviewCardView({ tool: 'record', review: ROUND_TWO }))
    expect(without.round).not.toHaveProperty('post')
  })
})

describe('reviewReplyToPost', () => {
  const DRAFT = 'Thanks! Two things left:\n- the Sunday case\n- the email subject'

  it('posts the draft as it is while the person left it unchanged', () => {
    expect(reviewReplyToPost(DRAFT, DRAFT)).toEqual({ canPost: true })
    expect(reviewReplyToPost(DRAFT, `  ${DRAFT}\n\n`)).toEqual({ canPost: true })
  })

  it('posts the person’s edit, trimmed, once it differs', () => {
    expect(reviewReplyToPost(DRAFT, '  Thanks, all good now.\n')).toEqual({
      canPost: true,
      text: 'Thanks, all good now.',
    })
  })

  it('holds Post while the box is empty', () => {
    expect(reviewReplyToPost(DRAFT, '')).toEqual({ canPost: false })
    expect(reviewReplyToPost(DRAFT, '  \n ')).toEqual({ canPost: false })
  })
})
