import type {
  ColleagueReview,
  ColleagueReviewRoundRecord,
  ReviewFindingAnswer,
  ReviewWaitingOnAnswer,
} from 'thefactory-tools/types'
import {
  applyReviewRoundRecord,
  dropReviewFinding,
  markReviewWaitingGiven,
  parseReviewSubmission,
  startReviewRound,
} from 'thefactory-tools/utils'
import type { ChatAttachmentFile, ReviewPasteBox } from 'thefactory-ui/headless'

/** A colleague's ticket under review, shaped like a real one: five screenshots and a transcript. */
export const REVIEW_GROUP = 'osc'
export const REVIEW_TICKET = 'ZNR-809'
export const REVIEW_TICKET_URL = `https://acme.atlassian.net/browse/${REVIEW_TICKET}`
export const REVIEW_CHAT_ID = `groups/${REVIEW_GROUP}/topics/review-${REVIEW_TICKET}`

const KEY = { groupId: REVIEW_GROUP, ticketKey: REVIEW_TICKET }

export const ROUND_ONE_UPDATE = `Hi! ZNR-809 is ready for review.

PRs:
- https://github.com/acme/coach-api/pull/390 (backfill + reminder skip)
- https://github.com/acme/coach-web/pull/112 (settings copy)

Loom walkthrough: https://www.loom.com/share/4f1c2a9e0b7d (2:10–4:45 shows the paused plan)

The backfill is behind PAUSED_PLAN_REMINDERS, default on. Ran it on staging, 1,204 plans updated.
Screenshots of the settings page and the reminder log attached, plus the call transcript.`

const ROUND_ONE_FILES = [
  'settings-paused.png',
  'settings-active.png',
  'reminder-log.png',
  'staging-backfill.png',
  'loom-still-3m02.png',
  'call-transcript.md',
]

const at = (day: number, hour: number) =>
  `2026-11-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`

function started(review: ColleagueReview | undefined, when: string, text: string, files: string[]) {
  return startReviewRound(
    review,
    {
      ...KEY,
      ticketUrl: REVIEW_TICKET_URL,
      submission: parseReviewSubmission(text, { now: when, attachments: files }),
    },
    when,
    () => 'review-znr-809',
  )
}

function recorded(
  review: ColleagueReview,
  when: string,
  record: Omit<
    ColleagueReviewRoundRecord,
    'groupId' | 'ticketKey' | 'round' | 'reviewedHeads' | 'claims' | 'requirements'
  >,
): ColleagueReview {
  const done = applyReviewRoundRecord(
    review,
    {
      ...KEY,
      round: review.rounds.length,
      reviewedHeads: [
        { pullRequestUrl: 'https://github.com/acme/coach-api/pull/390', sha: 'a1b2c3d' },
      ],
      claims: [],
      requirements: [],
      ...record,
    },
    when,
  )
  if (!done.ok) throw new Error(done.errors.join('\n'))
  return done.review
}

function changed(update: { ok: true; review: ColleagueReview } | { ok: false; errors: string[] }) {
  if (!update.ok) throw new Error(update.errors.join('\n'))
  return update.review
}

const ROUND_ONE_FINDINGS: ReviewFindingAnswer[] = [
  {
    kind: 'change',
    title: 'Backfill has no dry run',
    detail:
      'The backfill writes on its first pass. Add a --dry-run that prints the plans it would change, and run that on production first.',
    evidence: ['coach-api scripts/backfillPausedPlans.ts:12'],
  },
  {
    kind: 'change',
    title: 'PAUSED_PLAN_REMINDERS defaults to on',
    detail: 'Ship it off and turn it on per region once the backfill has run.',
    evidence: ['coach-api src/flags.ts:41'],
  },
  {
    kind: 'request',
    title: 'Test a paused plan with no reminders left',
    detail: 'The empty case is the one that threw on staging (transcript 12:40).',
  },
  {
    kind: 'small',
    title: 'Reminder log prints the email',
    detail: 'Log the user id instead.',
    evidence: ['coach-api src/reminders/log.ts:8'],
  },
  {
    kind: 'question',
    title: 'Why a batch size of 500?',
    detail: 'Is it tied to the rate limit, or a guess?',
  },
]

const ROUND_ONE_WAITING: ReviewWaitingOnAnswer[] = [
  { who: 'Priya Shah', what: 'Approve running the backfill on production data' },
  { who: 'Tom Reid', what: 'Confirm the new reminder copy with support' },
]

const ROUND_ONE_REPLY = `Thanks, this is close! A few things before it goes live.

*Waiting on*
• Priya: approval to run the backfill on production data
• Tom: support’s OK on the new reminder copy

*Needs fixing before it goes live*
• Add a --dry-run to the backfill and run that on production first
• Ship PAUSED_PLAN_REMINDERS off, and turn it on per region

*Small things*
• Add a test for a paused plan with no reminders left
• Log the user id, not the email, in the reminder log
• Why a batch size of 500?

*Going live*
Dry run on production → Priya’s OK → backfill → flag on for one region.`

export const ROUND_ONE: ColleagueReview = recorded(
  started(undefined, at(10, 9), ROUND_ONE_UPDATE, ROUND_ONE_FILES),
  at(10, 10),
  {
    findings: ROUND_ONE_FINDINGS,
    waitingOn: ROUND_ONE_WAITING,
    verdict: 'changes-requested',
    reply: ROUND_ONE_REPLY,
  },
)

export const ROUND_TWO_UPDATE = `Updated both PRs:
- dry run added (https://github.com/acme/coach-api/pull/390/commits/b4e5f6a)
- test for the empty plan
- batch size is gone, it streams now
Priya approved the backfill in #ops. Flag still defaults on, will change before release.`

const ROUND_TWO_STARTED = started(ROUND_ONE, at(12, 9), ROUND_TWO_UPDATE, ['dry-run-output.png'])

const ROUND_TWO_DROPPED = changed(
  dropReviewFinding(
    ROUND_TWO_STARTED,
    'F4',
    'The logs stay internal; not worth a round.',
    at(12, 9),
  ),
)

const ROUND_TWO_RECORDED = recorded(ROUND_TWO_DROPPED, at(12, 10), {
  findings: [
    {
      id: 'F1',
      state: 'fixed',
      evidence: ['coach-api scripts/backfillPausedPlans.ts:30 --dry-run', 'dry-run-output.png'],
    },
    { id: 'F2', state: 'still-open', note: 'Still defaults on in src/flags.ts:41.' },
    { id: 'F3', state: 'fixed', evidence: ['coach-api test/reminders.test.ts:118'] },
    {
      id: 'F5',
      state: 'no-longer-applies',
      evidence: ['coach-api #390 b4e5f6a: the batch is gone, it streams'],
    },
    {
      kind: 'change',
      title: 'Retry loop never gives up',
      detail: 'sendReminder retries forever on a 429. Cap it at 5 with backoff.',
      evidence: ['coach-api src/reminders/send.ts:57'],
    },
  ],
  waitingOn: [],
  verdict: 'changes-requested',
  reply: `Thanks for the quick turnaround!

*Fixed since last round*
• Dry run on the backfill
• Test for a paused plan with no reminders left
• Batch size: gone now that it streams

*Waiting on*
• Tom: support’s OK on the new reminder copy

*Needs fixing before it goes live*
• PAUSED_PLAN_REMINDERS still defaults on
• sendReminder retries forever on a 429: cap it at 5 with backoff`,
})

/** Round 2: some fixed, one still open, one new, one dropped by the person, Priya's approval given by them. */
export const ROUND_TWO: ColleagueReview = changed(
  markReviewWaitingGiven(ROUND_TWO_RECORDED, 'W1', 'Approved in the #ops thread.', at(12, 11)),
)

export const ROUND_THREE_UPDATE = `Flag now ships off, retries capped at 5 with backoff. Tom says support is fine with the copy (thread linked in the PR).`

/** Round 3 started: the agent is still at it. */
export const ROUND_THREE_STARTED: ColleagueReview = started(
  ROUND_TWO,
  at(14, 9),
  ROUND_THREE_UPDATE,
  [],
)

/** Round 3 approved. */
export const ROUND_THREE: ColleagueReview = recorded(ROUND_THREE_STARTED, at(14, 10), {
  findings: [
    { id: 'F2', state: 'fixed', evidence: ['coach-api src/flags.ts:41 default false'] },
    { id: 'F6', state: 'fixed', evidence: ['coach-api src/reminders/send.ts:57 maxRetries: 5'] },
  ],
  waitingOn: [
    {
      id: 'W2',
      state: 'given',
      evidence: ['https://github.com/acme/coach-web/pull/112#issuecomment-201'],
    },
  ],
  verdict: 'approve',
  reply: `All good from me, thanks!

*Fixed since last round*
• PAUSED_PLAN_REMINDERS ships off
• Retries capped at 5 with backoff

*Going live*
Dry run on production → backfill → flag on for one region.`,
})

/** What a refused record told the agent. */
export const REVIEW_REFUSAL = [
  'F2 “PAUSED_PLAN_REMINDERS defaults to on” is not answered: say whether it is fixed, still-open or no-longer-applies.',
  'F1 “Backfill has no dry run” is fixed without evidence: cite what shows it.',
]

const shot = (name: string, size: number): ChatAttachmentFile => ({
  name,
  size,
  blob: new Blob([]),
})

const PASTED_FILES = ROUND_ONE_FILES.map((name, i) => ({
  file: shot(name, 180_000 + i * 20_000),
}))

export const BOX_EMPTY: ReviewPasteBox = {
  ticketKey: REVIEW_TICKET,
  nextRound: false,
  draft: { text: '', files: [] },
}

export const BOX_FILLED: ReviewPasteBox = {
  ticketKey: REVIEW_TICKET,
  nextRound: false,
  draft: { text: ROUND_ONE_UPDATE, files: PASTED_FILES },
}

export const BOX_NEXT_ROUND: ReviewPasteBox = {
  ticketKey: REVIEW_TICKET,
  nextRound: true,
  draft: { text: ROUND_TWO_UPDATE, files: [{ file: shot('dry-run-output.png', 96_000) }] },
}

export const BOX_FAILED: ReviewPasteBox = {
  ...BOX_FILLED,
  draft: {
    ...BOX_FILLED.draft,
    files: PASTED_FILES.map((f, i) =>
      i < 3 ? { ...f, path: `.factory/attachments/review/${f.file.name}` } : f,
    ),
  },
  error: 'loom-still-3m02.png did not upload.',
}
