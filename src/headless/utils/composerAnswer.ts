import type { ProcessRun, ProcessStep } from 'thefactory-tools/types'
import { getChatContext, processRunIdOfChatContext } from 'thefactory-tools/utils'
import { isColleagueReviewDecisionGrant, isProcessActionsGate } from './colleagueReviewDecision'
import type { ReviewDecisionArgs, ReviewGateAnswer } from './colleagueReviewDecisionTypes'
import { COMPOSER_ANSWER_FILES_LABEL } from './composerAnswerConstants'
import type { ComposerMessageRoute } from './composerAnswerTypes'

type GrantLike = { toolName?: string | undefined; args?: unknown; detail?: unknown }

/** A review run as the composer reads it: whether it waits at its approval. */
export type ComposerReviewRun = Partial<Pick<ProcessRun, 'park' | 'ticketReview'>> & {
  id: string
  plan: { steps: readonly Pick<ProcessStep, 'id' | 'kind' | 'gateKind'>[] }
}

/** The note a card is answered with: what the person typed, their files named after it. Pure. */
export function composerAnswerNote(text: string, files: readonly string[]): string {
  const typed = text.trim()
  if (files.length === 0) return typed
  const named = `${COMPOSER_ANSWER_FILES_LABEL} ${files.join(', ')}`
  return typed ? `${typed}\n\n${named}` : named
}

/**
 * The run whose own chat a chat is: the one a message typed there can answer.
 * A ticket's review chat is no run's — a review run works in its own chat —
 * so nothing typed there answers a run. Pure.
 */
export function composerRunIdOfChat(chatId: string | undefined): string | undefined {
  const context = chatId ? getChatContext(chatId) : undefined
  return context ? processRunIdOfChatContext(context) : undefined
}

/**
 * What a message the person sends from a chat's composer becomes. While the
 * chat's review decision card waits — on its row or set aside for later — it
 * is the card's answer, a note on the same call, as a typed answer is an
 * open question's; else, in a colleague review run's own chat (`run`, by
 * {@link composerRunIdOfChat}) while the run waits at its approval, it
 * answers that approval; else it is sent as ever. Never a second turn beside
 * the one the card holds. Pure.
 */
export function composerMessageRoute<G extends GrantLike>(
  grants: readonly G[] | undefined,
  run?: ComposerReviewRun,
): ComposerMessageRoute<G> {
  const card = (grants ?? []).find((g) => isColleagueReviewDecisionGrant(g))
  if (card) return { kind: 'decision-note', grant: card }
  if (run?.ticketReview && isProcessActionsGate(run))
    return { kind: 'run-gate-note', runId: run.id }
  return { kind: 'send' }
}

/** What answering the decision card with the person's typed note carries. Pure. */
export function reviewDecisionNoteMetadata(note: string): { args: ReviewDecisionArgs } {
  return { args: { choice: 'note', note } }
}

/** How a review run's approval is answered with the person's typed note: sent back with it. Pure. */
export function reviewGateNoteAnswer(note: string): ReviewGateAnswer {
  return { choice: 'request-changes', note }
}

/** Answer the waiting decision card with the person's typed note; `false` when it would not take it. */
export async function answerDecisionCardWithNote(
  grant: { decide: (decision: 'once', metadata: { args: ReviewDecisionArgs }) => Promise<unknown> },
  note: string,
): Promise<boolean> {
  try {
    await grant.decide('once', reviewDecisionNoteMetadata(note))
    return true
  } catch {
    return false
  }
}
