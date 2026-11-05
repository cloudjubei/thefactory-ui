import type { ChatContextCheckpointEvent } from 'thefactory-tools/types'

import { CHAT_CONTEXT_CHECKPOINT_LOG_LIMIT } from './chatContextCheckpointLogConstants'

/**
 * The hidden checkpoints heard for each chat, for the Debug view alone. It lives
 * outside React state on purpose: a checkpoint is never a chat row, a turn or a
 * working state, so hearing one re-renders nothing.
 */
export class ChatContextCheckpointLog {
  private readonly _byChat = new Map<string, ChatContextCheckpointEvent[]>()

  record(event: ChatContextCheckpointEvent): void {
    const kept = this._byChat.get(event.chatContextId) ?? []
    this._byChat.set(
      event.chatContextId,
      [...kept, event].slice(-CHAT_CONTEXT_CHECKPOINT_LOG_LIMIT),
    )
  }

  of(chatContextId: string): ChatContextCheckpointEvent[] {
    return [...(this._byChat.get(chatContextId) ?? [])]
  }
}
