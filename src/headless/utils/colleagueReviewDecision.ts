import type {
  ColleagueReview,
  ProcessParkChoice,
  ProcessRun,
  ProcessStep,
} from 'thefactory-tools/types'
import { latestReviewRound } from 'thefactory-tools/utils'
import { cleanCliToolName } from './cliRunner'
import { reviewRoundView } from './colleagueReviewCard'
import { reviewMergePullRequests } from './colleagueReviewMerge'
import type { ReviewMergePullRequest } from './colleagueReviewMergeTypes'
import type { ToolAskDecidedLine } from './toolAskCardTypes'
import {
  ASK_COLLEAGUE_REVIEW_DECISION_TOOL_NAME,
  INLINE_REVIEW_DECISION_ACTIONS,
  REVIEW_DECISION_KEEP_REVIEWING,
  REVIEW_DECISION_LABELS,
  REVIEW_DECISION_STOP,
  REVIEW_DECISION_TEXT,
} from './colleagueReviewDecisionConstants'
import type {
  ReviewDecisionAction,
  ReviewDecisionArgs,
  ReviewDecisionVerdict,
  ReviewGateAnswer,
} from './colleagueReviewDecisionTypes'

type GrantLike = { toolName?: string | undefined; args?: unknown; detail?: unknown }

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

/** Whether an ask is a review chat's decision card, under its bare name or a CLI's prefixed one. Pure. */
export function isColleagueReviewDecisionGrant(grant: GrantLike): boolean {
  const named = grant.toolName ? cleanCliToolName(grant.toolName) : undefined
  return (
    named === ASK_COLLEAGUE_REVIEW_DECISION_TOOL_NAME ||
    record(grant.detail).tool === ASK_COLLEAGUE_REVIEW_DECISION_TOOL_NAME
  )
}

/** The reply the agent drafted on the card's ask; empty when it gave none. Pure. */
export function colleagueReviewDecisionDraft(grant: GrantLike): string {
  const args = grant.args !== undefined ? record(grant.args) : record(record(grant.detail).args)
  return typeof args.reply === 'string' ? args.reply : ''
}

/** What a review chat's decision card offers, in order. Pure. */
export function inlineReviewDecisionActions(): ReviewDecisionAction[] {
  return INLINE_REVIEW_DECISION_ACTIONS.map((a) => ({ ...a }))
}

/**
 * What a review run's actions gate offers, as the decision card shows it: each
 * gate action, sending the round back with a note, and stopping — in the
 * card's own words for the ones it knows. Pure.
 */
export function runReviewDecisionActions(
  choices: readonly ProcessParkChoice[],
): ReviewDecisionAction[] {
  return choices.flatMap((choice): ReviewDecisionAction[] => {
    const id =
      choice.choice === 'approve'
        ? choice.action?.id
        : choice.choice === REVIEW_DECISION_KEEP_REVIEWING || choice.choice === REVIEW_DECISION_STOP
          ? choice.choice
          : undefined
    if (!id) return []
    return [
      {
        id,
        label: REVIEW_DECISION_LABELS[id] ?? choice.action?.label ?? choice.label,
        ...(choice.detail ? { detail: choice.detail } : {}),
        primary: choice.primary === true,
        editsText: choice.action?.editsText === true,
        noteRequired: choice.noteRequired === true,
      },
    ]
  })
}

/** Why the choice cannot go yet: an empty reply to send, or no note to review on with. Pure. */
export function reviewDecisionProblem(
  action: ReviewDecisionAction,
  text: string,
  note: string,
): string | undefined {
  if (action.editsText && text.trim() === '') return REVIEW_DECISION_TEXT.emptyReply
  if (action.noteRequired && note.trim() === '') return REVIEW_DECISION_TEXT.noteNeeded
  return undefined
}

function editedReply(action: ReviewDecisionAction, draft: string, text: string) {
  const typed = text.trim()
  return action.editsText && typed !== '' && typed !== draft.trim() ? typed : undefined
}

/**
 * What approving the decision card's ask carries: the choice, the reply only
 * when the person changed it, the note only when reviewing on. Pure.
 */
export function reviewDecisionMetadata(
  action: ReviewDecisionAction,
  draft: string,
  text: string,
  note: string,
): { args: ReviewDecisionArgs } {
  const reply = editedReply(action, draft, text)
  return {
    args: {
      choice: action.id,
      ...(reply ? { reply } : {}),
      ...(action.noteRequired ? { note: note.trim() } : {}),
    },
  }
}

/**
 * How a review run's actions gate is answered from the card: an approval
 * naming the action, its text only for one that edits text and only when
 * changed; sending back with the note; or stopping. Pure.
 */
export function reviewGateAnswer(
  action: ReviewDecisionAction,
  draft: string,
  text: string,
  note: string,
): ReviewGateAnswer {
  if (action.id === REVIEW_DECISION_STOP) return { choice: 'abandon' }
  if (action.id === REVIEW_DECISION_KEEP_REVIEWING) {
    return { choice: 'request-changes', note: note.trim() }
  }
  const reply = editedReply(action, draft, text)
  return { choice: 'approve', gateAction: { id: action.id, ...(reply ? { text: reply } : {}) } }
}

/** Whether a run waits at its own actions gate: the person chooses what is done there. Pure. */
export function isProcessActionsGate(
  run: Partial<Pick<ProcessRun, 'park'>> & {
    plan: { steps: readonly Pick<ProcessStep, 'id' | 'kind' | 'gateKind'>[] }
  },
): boolean {
  const park = run.park
  if (!park || park.reason !== 'gate' || park.childRunId !== undefined) return false
  const step = run.plan.steps.find((s) => s.id === park.stepId)
  return step?.kind === 'gate' && step.gateKind === 'actions'
}

/** The latest recorded round as the decision card's head reads it; nothing before one is recorded. Pure. */
export function reviewDecisionVerdict(
  review: ColleagueReview | null | undefined,
): ReviewDecisionVerdict | undefined {
  if (!review || latestReviewRound(review) === 0) return undefined
  const recorded = review.rounds.filter((r) => r.recordedAt).at(-1)
  if (!recorded) return undefined
  const round = reviewRoundView(review, recorded.n)
  return {
    round: round.n,
    title: round.title,
    ...(round.verdictLabel ? { verdictLabel: round.verdictLabel } : {}),
    ...(round.verdictTone ? { tone: round.verdictTone } : {}),
    summary: round.summary,
  }
}

/** What resuming a review run sends for the card's answer at its actions gate. Pure. */
export function reviewGateResumeBody(answer: ReviewGateAnswer): {
  choice: ReviewGateAnswer['choice']
  note?: string
  gateAction?: { id: string; text?: string }
} {
  if (answer.choice === 'approve')
    return { choice: 'approve', gateAction: { ...answer.gateAction } }
  if (answer.choice === 'request-changes') return { choice: answer.choice, note: answer.note }
  return { choice: 'abandon' }
}

/** The line the card folds to once the person chose. Pure. */
export function reviewDecisionDecidedLine(action: ReviewDecisionAction): ToolAskDecidedLine {
  return { tone: 'done', text: REVIEW_DECISION_TEXT.chose(action.label) }
}

/** The latest recorded round's pull requests, in the order they merge. Pure. */
export function reviewDecisionPullRequests(
  review: ColleagueReview | null | undefined,
): ReviewMergePullRequest[] {
  const recorded = review?.rounds.filter((r) => r.recordedAt).at(-1)
  return recorded ? reviewMergePullRequests(recorded.submission.pullRequests) : []
}
