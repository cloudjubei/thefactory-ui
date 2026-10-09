import type { SyncKVStorage } from '../hooks/useStorageBackedState'

/**
 * A message the person sent while the agent was still busy. It waits in the
 * chat's queue and goes out — merged with the others — once the turn ends.
 */
export type PendingChatMessage = {
  id: string
  text: string
  /** Attachment paths, as the composer held them. */
  attachments: string[]
}

/**
 * Everything typed into one chat that has not been sent yet: the composer's
 * text and attachment chips, and the queue of messages waiting for the agent.
 */
export type ChatDraft = {
  text: string
  attachments: string[]
  pending: PendingChatMessage[]
  /**
   * The queue waits for the person instead of going out on its own — set when
   * they stopped the turn, or the turn ended in an error.
   */
  paused: boolean
}

/** A draft as it is kept in storage: stamped so a stale one is dropped on load. */
export type StoredChatDraft = ChatDraft & {
  /** Epoch ms of the last write. */
  savedAt: number
}

/** One message's worth of text and attachments, ready to send. */
export type OutgoingChatMessage = {
  text: string
  attachments: string[]
}

/**
 * Why the composer cannot take a message right now. Each one also stops the
 * queue from going out on its own: the agent is waiting on something else.
 */
export type ChatComposerBlockers = {
  /** An `askUser` question or a credential form holds the composer's place. */
  askShown: boolean
  /** An approval panel holds the composer's place. */
  approvalShown: boolean
  /** The chat is closed and takes no new work. */
  historyLocked: boolean
  /** The host replaced the composer (e.g. a running agent's read-only bar). */
  inputOverridden: boolean
  /** The host hid the composer altogether. */
  inputHidden: boolean
}

/** Everything the queue's automatic send is decided from. */
export type PendingAutoDispatchInput = {
  pendingCount: number
  /** A turn is running in this chat. */
  busy: boolean
  paused: boolean
  /** A turn was seen running and has ended since the queue last went out. */
  turnEnded: boolean
  blockers: ChatComposerBlockers
}

/** What the queue remembers about the chat's turns between renders. */
export type PendingTurnState = {
  /** A turn was running at the last step. */
  wasBusy: boolean
  /** A turn was seen ending since the queue last went out — the queue may go out on its own. */
  turnEnded: boolean
}

export type PendingTurnInput = {
  busy: boolean
  /** The turn ended in an error. */
  failed: boolean
  /** Something holds the composer's place (an ask, an approval, …). */
  blocked: boolean
  pendingCount: number
}

export type PendingTurnStep = PendingTurnState & {
  /** Pause the queue: the turn it was waiting on failed. */
  pause: boolean
}

/** What "Send now" does to a running turn in this chat. */
export type PendingSendNowMode = 'queued-behind-turn' | 'interrupts-turn'

export type PendingStackInput = {
  busy: boolean
  paused: boolean
  mode: PendingSendNowMode
  count: number
}

/** The copy of the pending stack above the composer. */
export type PendingStackView = {
  title: string
  status: string
  sendLabel: string
  sendHint: string
}

export type ChatDraftListener = () => void

export type ChatDraftStoreOptions = {
  /** Where drafts survive a reload or a crash. Omit to keep them in memory only. */
  storage?: SyncKVStorage
  now?: () => number
  debounceMs?: number
}
