import { OPEN_CHANGES_CARD_COPY } from './openChangesCardConstants'
import type { OpenChangesCardInput, OpenChangesCardView } from './openChangesCardTypes'

function settledDetail(input: OpenChangesCardInput): string {
  if (input.cardRunReview?.rejectedAt !== undefined) return OPEN_CHANGES_CARD_COPY.discarded
  if (input.cardRunReview?.mergedAt !== undefined) return OPEN_CHANGES_CARD_COPY.merged
  return OPEN_CHANGES_CARD_COPY.settled
}

/**
 * The card about a chat's open changes, from the changes as they stand now —
 * never from what the card recorded when it was posted: once they are decided
 * anywhere it shows how, and a card about changes that no longer fit shows
 * them fitting again once rebuilt. Pure.
 */
export function openChangesCardView(
  input: OpenChangesCardInput,
  formatAt: (ms: number) => string,
): OpenChangesCardView {
  const base = {
    title: OPEN_CHANGES_CARD_COPY.title,
    canDiscard: false,
    canRebuild: false,
  }
  const open = input.openChanges
  if (open === undefined) {
    return { ...base, state: 'loading', detail: OPEN_CHANGES_CARD_COPY.loading }
  }
  if (open === null) return { ...base, state: 'settled', detail: settledDetail(input) }
  const unfit = open.changed.length > 0
  if (input.card.kind === 'unfit' && !unfit) {
    return {
      ...base,
      state: 'settled',
      detail: OPEN_CHANGES_CARD_COPY.fitsAgain,
      viewRunId: open.runId,
    }
  }
  return {
    ...base,
    state: 'open',
    detail: unfit
      ? OPEN_CHANGES_CARD_COPY.unfit(open.changed.length, open.files.length)
      : OPEN_CHANGES_CARD_COPY.waiting(formatAt(open.openSince), open.files.length),
    viewRunId: open.runId,
    canDiscard: input.busy === undefined,
    canRebuild: unfit && input.busy === undefined,
    ...(input.busy ? { busy: input.busy } : {}),
    ...(input.conflicts && input.conflicts.length > 0
      ? { conflictLine: OPEN_CHANGES_CARD_COPY.conflicts(input.conflicts.map((c) => c.path)) }
      : {}),
    ...(input.error ? { error: input.error } : {}),
  }
}
