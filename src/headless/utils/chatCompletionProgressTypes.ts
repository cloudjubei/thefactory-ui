/** One `completion:progress` event, read off the socket: whose turn it is and what it says. */
export type CompletionProgressEvent = {
  /** The chat whose API turn sent it. */
  chatContextId: string
  /** The API turn it belongs to. */
  turnId: string
} & ({ kind: 'turn'; turn: number; content: string } | { kind: 'done' })

/** A chat with a send in flight from this client, and the turn its progress is pinned to once one arrives. */
export type CompletionProgressClaim = {
  turnId?: string
}

/** What one event does to its chat: the live preview it sets, and the claim it leaves. */
export type CompletionProgressRoute = {
  claim: CompletionProgressClaim
  pendingAssistant: { turn: number; content: string } | null
}
