import type { ChatAudienceMessage } from 'thefactory-tools/types'
import { isChatOpenChangesOverdue } from 'thefactory-tools/utils'

import {
  OPEN_CHANGES_NOTICE_COPY,
  OPEN_CHANGES_NOTICE_HOURS_BEFORE_DAYS,
} from './openChangesNoticeConstants'
import type { OpenChangesNoticeInput, OpenChangesNoticeView } from './openChangesNoticeTypes'

const HOUR_MS = 60 * 60 * 1000

/** How long the changes have waited, as the notice counts it. */
function waitWords(waitedMs: number): string {
  const hours = Math.max(0, Math.floor(waitedMs / HOUR_MS))
  return hours < OPEN_CHANGES_NOTICE_HOURS_BEFORE_DAYS
    ? OPEN_CHANGES_NOTICE_COPY.hours(hours)
    : OPEN_CHANGES_NOTICE_COPY.days(Math.floor(hours / 24))
}

/**
 * What the change card of a chat's open changes says of them, from the changes
 * as they stand now: that they wait on the person once past the limit, that
 * they no longer fit the checkout, and Discard — and Rebuild while they do not
 * fit. `undefined` on any other run's card, before they are read, once none
 * wait, and while fresh changes still fit. Pure.
 */
export function openChangesNoticeView(
  input: OpenChangesNoticeInput,
  now: number,
): OpenChangesNoticeView | undefined {
  const open = input.openChanges
  if (!open || open.runId !== input.runId) return undefined
  const waiting = isChatOpenChangesOverdue(open.openSince, now)
  const unfit = open.changed.length > 0
  if (!waiting && !unfit && input.busy === undefined && input.error === undefined) return undefined
  const idle = input.busy === undefined
  return {
    ...(waiting
      ? { waiting: OPEN_CHANGES_NOTICE_COPY.waiting(waitWords(now - open.openSince)) }
      : {}),
    ...(unfit
      ? { unfit: OPEN_CHANGES_NOTICE_COPY.unfit(open.changed.length, open.files.length) }
      : {}),
    canDiscard: idle,
    canRebuild: unfit && idle,
    ...(input.busy ? { busy: input.busy } : {}),
    ...(input.conflicts && input.conflicts.length > 0
      ? { conflictLine: OPEN_CHANGES_NOTICE_COPY.conflicts(input.conflicts.map((c) => c.path)) }
      : {}),
    ...(input.error ? { error: input.error } : {}),
  }
}

/**
 * Whether a message only carries a card about the chat's open changes — one the
 * host posted on its own before cards were raised on the turn holding them.
 * Drawn as nothing: the change card says what it said. Pure.
 */
export function isOpenChangesCardOnlyMessage(
  message: Pick<ChatAudienceMessage, 'role' | 'openChangesCard'> & { cliRunId?: string },
): boolean {
  return message.role === 'assistant' && message.openChangesCard !== undefined && !message.cliRunId
}
