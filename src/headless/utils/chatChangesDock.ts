import { isChatOpenChangesOverdue } from 'thefactory-tools/utils'

import {
  CHAT_CHANGES_DOCK_COPY,
  CHAT_REVIEW_CHAT_MIN_WIDTH,
  CHAT_REVIEW_PANEL_MIN_WIDTH,
  CHAT_REVIEW_SIDE_MIN_WIDTH,
} from './chatChangesDockConstants'
import type {
  ChatChangesBarInput,
  ChatChangesBarView,
  ChatChangesMarkerInput,
  ChatChangesMarkerView,
  ChatChangesTag,
  ChatChangesVerdictInput,
  ChatReviewHeaderInput,
  ChatReviewHeaderView,
  ChatReviewLayout,
} from './chatChangesDockTypes'
import { chatChangesNotice, heldChatChangesNote } from './chatChangesView'
import { commitReceiptFiles } from './gitChangeApproval'
import { openChangesWaitWords } from './openChangesNotice'
import { ALREADY_ON_BASE_TITLE, VERDICT_LABELS, VERDICT_TONES } from './runReviewConstants'

const HOUR_MS = 60 * 60 * 1000

function branchOf(review: { branch: string; shadow?: boolean } | undefined): string | undefined {
  return review && !review.shadow ? review.branch : undefined
}

/** What became of a turn's changes once decided, when anything did. */
function decidedTag(input: ChatChangesMarkerInput): ChatChangesTag | undefined {
  if (input.review?.mergedAt != null)
    return { label: CHAT_CHANGES_DOCK_COPY.merged, tone: 'positive' }
  if (input.decision)
    return { label: VERDICT_LABELS[input.decision], tone: VERDICT_TONES[input.decision] }
  if (input.review?.rejectedAt != null)
    return { label: CHAT_CHANGES_DOCK_COPY.rejected, tone: 'danger' }
  if (input.artifact?.appliedAt != null)
    return { label: CHAT_CHANGES_DOCK_COPY.applied, tone: 'positive' }
  return undefined
}

/**
 * The one line a chat turn that changed files leaves in the conversation: how
 * many files, the branch they wait on, and the link that opens their review —
 * "Review below" when the bar above the message box already holds them.
 * Changes settled elsewhere keep their one-line notice; a change already on
 * its base says so in one line, or nothing when the turn's own commit receipt
 * does; a turn that changed nothing shows nothing. Pure.
 */
export function chatChangesMarkerView(
  input: ChatChangesMarkerInput,
): ChatChangesMarkerView | undefined {
  const { artifact, alreadyOnBase } = input
  if (alreadyOnBase) return alreadyOnBaseMarker(alreadyOnBase, input)
  const settled = chatChangesNotice(artifact)
  if (settled) return { kind: 'notice', text: settled }
  const label = artifact
    ? CHAT_CHANGES_DOCK_COPY.changed(artifact.payload.files.length)
    : input.landFailed
      ? CHAT_CHANGES_DOCK_COPY.notCommitted
      : input.reportOnly && input.hasReport
        ? CHAT_CHANGES_DOCK_COPY.stageReport
        : undefined
  if (label === undefined) return undefined
  const status = artifact ? decidedTag(input) : undefined
  const inBar = !input.reportOnly && input.openRunId === input.runId
  const toDecide = artifact !== undefined && !input.reportOnly && status === undefined
  const branch = branchOf(input.review)
  const note = heldChatChangesNote(artifact)
  return {
    kind: 'marker',
    label,
    ...(branch ? { branch } : {}),
    ...(status ? { status } : {}),
    ...(note ? { note } : {}),
    ...(input.canOpen
      ? {
          action: {
            label: inBar
              ? CHAT_CHANGES_DOCK_COPY.reviewBelow
              : toDecide
                ? CHAT_CHANGES_DOCK_COPY.review
                : CHAT_CHANGES_DOCK_COPY.open,
            inBar,
          },
        }
      : {}),
  }
}

/** Whether two shas name the same commit, either of them short. */
function sameCommit(a: string, b: string): boolean {
  return a.length > 0 && b.length > 0 && (a.startsWith(b) || b.startsWith(a))
}

/**
 * The one line a turn whose change its base already holds leaves — nothing,
 * when the turn's own commit receipt already says so.
 */
function alreadyOnBaseMarker(
  view: NonNullable<ChatChangesMarkerInput['alreadyOnBase']>,
  input: ChatChangesMarkerInput,
): ChatChangesMarkerView | undefined {
  const { sha, subject } = view
  if (sha && (input.receiptShas ?? []).some((made) => sameCommit(made, sha))) return undefined
  return {
    kind: 'already',
    text: view.text,
    ...(sha
      ? {
          change: {
            files: commitReceiptFiles(input.changeFiles ?? []),
            ...(subject ? { message: subject } : {}),
          },
        }
      : {}),
  }
}

/** The open run's verdict as one short tag: how many checks did not pass, or how far they got. Pure. */
export function chatChangesVerdictTag(verdict: ChatChangesVerdictInput): ChatChangesTag {
  switch (verdict.key) {
    case 'failed':
      return { label: CHAT_CHANGES_DOCK_COPY.failedChecks(verdict.failed), tone: 'danger' }
    case 'proven':
      return { label: CHAT_CHANGES_DOCK_COPY.checksPassed, tone: 'positive' }
    case 'partly':
      return { label: CHAT_CHANGES_DOCK_COPY.partlyChecked, tone: 'warning' }
    case 'not-run':
      return { label: CHAT_CHANGES_DOCK_COPY.notChecked, tone: 'warning' }
  }
}

/**
 * The bar above the message box while the chat's changes wait on the person:
 * how many files, what the checks said, that they no longer fit the checkout,
 * how long they have waited — and Discard while nothing is in flight.
 * `undefined` until read and once none wait. Pure.
 */
export function chatChangesBarView(
  input: ChatChangesBarInput,
  now: number,
): ChatChangesBarView | undefined {
  const open = input.openChanges
  if (!open || input.alreadyOnBase) return undefined
  const count = open.files.length
  const waitedMs = now - open.openSince
  return {
    runId: open.runId,
    title: CHAT_CHANGES_DOCK_COPY.barTitle(count),
    shortTitle: CHAT_CHANGES_DOCK_COPY.barShortTitle(count),
    ...(input.verdict ? { verdict: chatChangesVerdictTag(input.verdict) } : {}),
    ...(open.changed.length > 0 ? { unfit: CHAT_CHANGES_DOCK_COPY.unfit } : {}),
    ...(waitedMs >= HOUR_MS ? { waited: openChangesWaitWords(waitedMs) } : {}),
    overdue: isChatOpenChangesOverdue(open.openSince, now),
    canDiscard: input.busy === undefined,
    ...(input.busy ? { busy: input.busy } : {}),
    ...(input.error ? { error: input.error } : {}),
  }
}

/** The head of an opened review: what it holds, and the branch the changes wait on. Pure. */
export function chatReviewHeader(input: ChatReviewHeaderInput): ChatReviewHeaderView {
  if (input.alreadyOnBase) return { title: ALREADY_ON_BASE_TITLE(input.alreadyOnBase.baseRef) }
  const branch = branchOf(input.review)
  const title =
    input.fileCount !== undefined
      ? CHAT_CHANGES_DOCK_COPY.reviewTitle(input.fileCount)
      : input.landFailed
        ? CHAT_CHANGES_DOCK_COPY.notCommitted
        : input.reportOnly
          ? CHAT_CHANGES_DOCK_COPY.stageReport
          : CHAT_CHANGES_DOCK_COPY.reviewTitlePending
  return { title, ...(branch ? { branch } : {}) }
}

/** Whether a chat this wide opens a review beside itself or over itself. Pure. */
export function chatReviewLayout(chatWidth: number | undefined): ChatReviewLayout {
  return chatWidth === undefined || chatWidth >= CHAT_REVIEW_SIDE_MIN_WIDTH ? 'side' : 'sheet'
}

/** The review's width beside the chat: as asked, within its narrowest and what leaves the chat its own. Pure. */
export function chatReviewPanelWidth(requested: number, chatWidth: number): number {
  const widest = Math.max(CHAT_REVIEW_PANEL_MIN_WIDTH, chatWidth - CHAT_REVIEW_CHAT_MIN_WIDTH)
  return Math.min(widest, Math.max(CHAT_REVIEW_PANEL_MIN_WIDTH, requested))
}
