import type { ReviewChatSlotKind } from './reviewChatSlotTypes'

/**
 * What an inline review chat shows in its composer's place. A review run
 * never works in this chat, so while the ticket has one going the chat only
 * points to it, in one line — never the run's own cards, and never the reply
 * card, since the run starts its own next round. With no run, the reply
 * waiting to start the next round. Pure.
 */
export function reviewChatSlotKind(
  runLive: boolean,
  replyWaits: boolean,
): ReviewChatSlotKind | undefined {
  if (runLive) return 'run-link'
  return replyWaits ? 'reply' : undefined
}
