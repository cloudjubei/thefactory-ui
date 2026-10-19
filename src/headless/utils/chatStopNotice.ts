import {
  CHAT_STOP_CAUSE_PILL,
  CHAT_STOP_COPY,
  CHAT_STOP_REPEAT_FROM,
  CHAT_STOP_TURNS_TONE,
  CHAT_STOP_UNKNOWN_TONE,
} from './chatStopNoticeConstants'
import type {
  ChatStopCardView,
  ChatStopNotice,
  ChatStopRestart,
  ChatStopRestartInput,
} from './chatStopNoticeTypes'

/** The reason as one sentence another can follow: a full stop added where it ended without one. */
function asSentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`
}

/**
 * The card a stopped turn or story run shows, from the notice the host wrote: whose problem it
 * was, what to do next and the raw error kept for "Show details". Pure.
 */
export function chatStopCardView(notice: ChatStopNotice): ChatStopCardView {
  const featureTitle = notice.featureTitle?.trim()
  const reason = notice.reason.trim()
  const raw = notice.raw?.trim()
  const limit = notice.turnLimit && notice.turnLimit > 0 ? notice.turnLimit : undefined
  const repeats = notice.repeats ?? 0

  const pill =
    notice.cause === 'turns'
      ? {
          label: limit ? CHAT_STOP_COPY.turnsUsed(limit) : CHAT_STOP_COPY.turnsUsedUnknown,
          tone: CHAT_STOP_TURNS_TONE,
        }
      : Object.hasOwn(CHAT_STOP_CAUSE_PILL, notice.cause)
        ? CHAT_STOP_CAUSE_PILL[notice.cause]
        : undefined

  const primaryLabel =
    notice.cause === 'turns'
      ? limit
        ? CHAT_STOP_COPY.carryOn(limit)
        : CHAT_STOP_COPY.carryOnUnknown
      : CHAT_STOP_COPY.tryAgain

  return {
    title: featureTitle ? CHAT_STOP_COPY.stoppedOn(featureTitle) : CHAT_STOP_COPY.turnStopped,
    ...(pill ? { pill } : {}),
    tone: pill?.tone ?? CHAT_STOP_UNKNOWN_TONE,
    reason,
    ...(repeats >= CHAT_STOP_REPEAT_FROM
      ? { repeatLine: CHAT_STOP_COPY.failedAgain(repeats) }
      : {}),
    primaryLabel,
    ...(notice.cause === 'agent'
      ? {
          askAgentDraft: featureTitle
            ? CHAT_STOP_COPY.draftOn(featureTitle, asSentence(reason))
            : CHAT_STOP_COPY.draft(asSentence(reason)),
        }
      : {}),
    ...(raw ? { details: raw } : {}),
  }
}

/**
 * Which restart the card's primary button runs — the row's own restart when the list offers one,
 * else the last row's retry — or `undefined` where the row offers neither today. Pure.
 */
export function chatStopRestart(input: ChatStopRestartInput): ChatStopRestart | undefined {
  if (input.restart) {
    return { via: 'restart', title: input.restart.label, disabled: input.restart.disabled }
  }
  if (input.hasRetry && input.isLast) {
    return { via: 'retry', title: CHAT_STOP_COPY.retryTitle, disabled: input.isThinking }
  }
  return undefined
}

/** What the details toggle says: what a press of it does. */
export function chatStopDetailsLabel(open: boolean): string {
  return open ? CHAT_STOP_COPY.hideDetails : CHAT_STOP_COPY.showDetails
}
