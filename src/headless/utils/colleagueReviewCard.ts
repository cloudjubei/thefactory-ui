import {
  READ_COLLEAGUE_REVIEW_TOOL_NAME,
  RECORD_COLLEAGUE_REVIEW_ROUND_TOOL_NAME,
} from 'thefactory-tools/constants'
import type {
  ColleagueReview,
  ReviewFinding,
  ReviewFindingState,
  ReviewWaitingOn,
} from 'thefactory-tools/types'
import {
  findingStateAt,
  isFindingDropped,
  latestReviewRound,
  openFindingsAt,
  reviewRoundChanges,
} from 'thefactory-tools/utils'
import { cleanCliToolName } from './cliRunner'
import {
  COLLEAGUE_REVIEW_CARD_TEXT,
  REVIEW_FINDING_GROUP_LABELS,
  REVIEW_FINDING_GROUP_ORDER,
  REVIEW_FINDING_KIND_LABELS,
  REVIEW_FINDING_STATE_VIEW,
  REVIEW_VERDICT_VIEW,
  REVIEW_WAITING_STATE_VIEW,
} from './colleagueReviewCardConstants'
import type {
  ColleagueReviewCardInput,
  ColleagueReviewCardView,
  ColleagueReviewTool,
  ReviewFindingGroupId,
  ReviewFindingGroupView,
  ReviewFindingView,
  ReviewPendingActions,
  ReviewRoundView,
  ReviewWaitingOnView,
} from './colleagueReviewCardTypes'
import { slackMessageLink } from './colleagueReviewSource'
import type { ReviewReplyPostView } from './colleagueReviewSourceTypes'
import { reviewOfChat } from './colleagueReviewStart'

type Rec = Record<string, unknown>

const record = (v: unknown): Rec =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {}

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined

const whole = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : undefined

const NO_PENDING: ReviewPendingActions = { drops: new Set(), givens: new Set(), posts: new Set() }

const OPEN: readonly ReviewFindingState[] = ['open', 'still-open']

/** Which review tool a call is, under its bare name or a CLI's prefixed one. Pure. */
export function colleagueReviewToolOf(name: string | undefined): ColleagueReviewTool | undefined {
  if (name === undefined) return undefined
  const bare = cleanCliToolName(name)
  if (bare === RECORD_COLLEAGUE_REVIEW_ROUND_TOOL_NAME) return 'record'
  if (bare === READ_COLLEAGUE_REVIEW_TOOL_NAME) return 'read'
  return undefined
}

/**
 * The review a call is about: the one its answer holds, else the one it named,
 * else the chat's own, as a review chat's agent may leave both out. Pure.
 */
export function colleagueReviewCallKey(call: {
  args?: unknown
  result?: unknown
  chatContextId?: string | undefined
  groupId?: string | undefined
}): { groupId: string; ticketKey: string } | undefined {
  const answered = record(record(call.result).review)
  const asked = record(call.args)
  const chat = reviewOfChat(call.chatContextId)
  const ticketKey = text(answered.ticketKey) ?? text(asked.ticketKey) ?? chat?.ticketKey
  const groupId = text(answered.groupId) ?? text(asked.groupId) ?? chat?.groupId ?? call.groupId
  return ticketKey && groupId ? { groupId, ticketKey } : undefined
}

/** The round a call was about: the one it recorded, or the one a read said is the latest. Pure. */
export function colleagueReviewCallRound(
  tool: ColleagueReviewTool,
  args: unknown,
  result: unknown,
): number | undefined {
  return tool === 'record' ? whole(record(args).round) : whole(record(result).round)
}

/** What the agent was told when the call was refused; `undefined` when it was not. Pure. */
export function colleagueReviewCallRefusal(
  result: unknown,
  resultType: string | undefined,
): string[] | undefined {
  const answer = record(result)
  if (resultType === 'errored') {
    const why = text(result) ?? text(answer.error)
    return why ? [why] : []
  }
  if (answer.ok === false) {
    return Array.isArray(answer.errors) ? answer.errors.flatMap((e) => text(e) ?? []) : []
  }
  const error = text(answer.error)
  return error ? [error] : undefined
}

function stateIn(finding: ReviewFinding, round: number) {
  return finding.states.filter((s) => s.round === round && s.state !== 'dropped').at(-1)
}

function findingView(
  finding: ReviewFinding,
  round: number,
  latest: number,
  dropped: boolean,
  pending: ReviewPendingActions,
): ReviewFindingView {
  const drop = finding.states.find((s) => s.state === 'dropped')
  const own = stateIn(finding, round)
  const state: ReviewFindingState = dropped
    ? 'dropped'
    : (own?.state ?? findingStateAt(finding, round) ?? 'open')
  const shown = REVIEW_FINDING_STATE_VIEW[state]
  const note = dropped ? drop?.note : own?.note
  const current = findingStateAt(finding, latest)
  return {
    id: finding.id,
    title: finding.title,
    detail: finding.detail,
    kind: finding.kind,
    kindLabel: REVIEW_FINDING_KIND_LABELS[finding.kind],
    state,
    stateLabel: shown.label,
    tone: shown.tone,
    evidence: dropped ? [] : (own?.evidence ?? []),
    ...(note ? { note } : {}),
    byYou: dropped,
    canDrop: round === latest && !isFindingDropped(finding) && OPEN.some((s) => s === current),
    saving: pending.drops.has(finding.id),
  }
}

function waitingOnView(
  item: ReviewWaitingOn,
  round: number,
  latest: number,
  pending: ReviewPendingActions,
): ReviewWaitingOnView {
  const given = item.state === 'given' && (item.givenInRound ?? Infinity) <= round
  const state = given ? 'given' : 'outstanding'
  const byYou = given && item.givenBy === 'person'
  const shown = REVIEW_WAITING_STATE_VIEW[state]
  return {
    id: item.id,
    who: item.who,
    what: item.what,
    state,
    stateLabel: byYou ? COLLEAGUE_REVIEW_CARD_TEXT.givenByYou : shown.label,
    tone: shown.tone,
    byYou,
    evidence: given ? (item.evidence ?? []) : [],
    ...(item.note ? { note: item.note } : {}),
    canMarkGiven: round === latest && item.state === 'outstanding',
    saving: pending.givens.has(item.id),
  }
}

function roundSummary(
  groups: readonly ReviewFindingGroupView[],
  waiting: readonly ReviewWaitingOnView[],
  first: boolean,
): string {
  const count = (id: ReviewFindingGroupId) => groups.find((g) => g.id === id)?.findings.length ?? 0
  const t = COLLEAGUE_REVIEW_CARD_TEXT
  const parts = [
    count('toCheck') && t.summaryToCheck(count('toCheck')),
    count('fixed') && t.summaryFixed(count('fixed')),
    count('stillOpen') && t.summaryStillOpen(count('stillOpen')),
    count('raised') && t.summaryRaised(count('raised'), first),
    count('noLongerApplies') && t.summaryNoLonger(count('noLongerApplies')),
    count('dropped') && t.summaryDropped(count('dropped')),
  ].filter((p): p is string => typeof p === 'string')
  const outstanding = waiting.filter((w) => w.state === 'outstanding').length
  if (outstanding > 0) parts.push(t.summaryWaiting(outstanding))
  return parts.length > 0 ? parts.join(' · ') : t.nothingFound
}

function replyPostView(
  round: ColleagueReview['rounds'][number] | undefined,
  thread: boolean,
  posting: boolean,
): ReviewReplyPostView | undefined {
  if (!round?.recordedAt || !round.reply) return undefined
  const permalink = slackMessageLink(round.postedReply?.permalink)
  if (!thread && !permalink) return undefined
  return {
    canPost: thread,
    posting,
    ...(permalink && round.postedReply
      ? { posted: { permalink, postedAt: round.postedReply.postedAt } }
      : {}),
  }
}

/**
 * One round as a card shows it, with what the person may still do on the
 * latest. Its reply may be posted in the thread while the group watches a
 * working one (`thread`); one posted already says where. Pure.
 */
export function reviewRoundView(
  review: ColleagueReview,
  n: number,
  pending: ReviewPendingActions = NO_PENDING,
  thread = false,
): ReviewRoundView {
  const latest = latestReviewRound(review)
  const round = review.rounds.find((r) => r.n === n)
  const recorded = Boolean(round?.recordedAt)
  const changes = reviewRoundChanges(review, n)
  const byGroup: Record<ReviewFindingGroupId, ReviewFinding[]> = recorded
    ? {
        toCheck: [],
        fixed: changes.fixed,
        stillOpen: changes.stillOpen,
        raised: changes.raised,
        noLongerApplies: changes.noLongerApplies,
        dropped: changes.dropped,
      }
    : {
        toCheck: openFindingsAt(review, n),
        fixed: [],
        stillOpen: [],
        raised: [],
        noLongerApplies: [],
        dropped: changes.dropped,
      }
  const groups = REVIEW_FINDING_GROUP_ORDER.flatMap((id): ReviewFindingGroupView[] => {
    const findings = byGroup[id]
    if (findings.length === 0) return []
    return [
      {
        id,
        label:
          id === 'raised' && n === 1
            ? COLLEAGUE_REVIEW_CARD_TEXT.found
            : REVIEW_FINDING_GROUP_LABELS[id],
        findings: findings.map((f) => findingView(f, n, latest, id === 'dropped', pending)),
      },
    ]
  })
  const listed = [...changes.waitingOnGiven, ...changes.waitingOnOutstanding]
  const waitingOn = listed
    .filter((w, at) => listed.findIndex((o) => o.id === w.id) === at)
    .map((w) => waitingOnView(w, n, latest, pending))
  const verdict = recorded ? round?.verdict : undefined
  const post = replyPostView(round, thread, pending.posts.has(n))
  return {
    n,
    title: COLLEAGUE_REVIEW_CARD_TEXT.round(n, latest),
    latest: n === latest,
    recorded,
    ...(verdict
      ? {
          verdict,
          verdictLabel: REVIEW_VERDICT_VIEW[verdict].label,
          verdictTone: REVIEW_VERDICT_VIEW[verdict].tone,
        }
      : {}),
    summary: recorded
      ? roundSummary(groups, waitingOn, n === 1)
      : COLLEAGUE_REVIEW_CARD_TEXT.reviewing,
    groups,
    waitingOn,
    ...(recorded && round?.reply ? { reply: round.reply } : {}),
    ...(post ? { post } : {}),
    files: round?.submission.attachments.length ?? 0,
  }
}

/**
 * What a review tool's row draws: the review as it is now, at the round the
 * call was about, never what the call itself sent. A refused call says what
 * the agent was told instead. Pure.
 */
export function colleagueReviewCardView(
  input: ColleagueReviewCardInput & { ticketKey?: string | undefined },
): ColleagueReviewCardView {
  const t = COLLEAGUE_REVIEW_CARD_TEXT
  if (input.refusal) return { kind: 'refused', line: t.refused, errors: input.refusal }
  const { review } = input
  if (review === undefined) {
    return input.readError ? { kind: 'failed', line: input.readError } : { kind: 'loading' }
  }
  const latest = review ? latestReviewRound(review) : 0
  if (!review || latest === 0) {
    return input.ticketKey
      ? { kind: 'none', line: t.none(input.ticketKey) }
      : { kind: 'none', line: t.noTicket }
  }
  const n = Math.min(Math.max(input.round ?? latest, 1), latest)
  const pending = input.pending ?? NO_PENDING
  const thread = input.thread ?? false
  const rounds = review.rounds.map((r) => reviewRoundView(review, r.n, pending, thread))
  const round = rounds.find((r) => r.n === n) ?? rounds[rounds.length - 1]!
  return {
    kind: 'review',
    ticketKey: review.ticketKey,
    ...(review.ticketUrl ? { ticketUrl: review.ticketUrl } : {}),
    round,
    rounds,
    ...(n < latest ? { laterNote: t.later(latest) } : {}),
    ...(input.actionError ? { actionError: input.actionError } : {}),
  }
}
