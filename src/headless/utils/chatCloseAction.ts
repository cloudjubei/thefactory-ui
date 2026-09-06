import type { ChatContext } from '../api/generated'
import type { ChatClosure } from './chatClosure'

/** What the chat's "wrap this up" control should do and say. */
export type ChatCloseAction = {
  /**
   * `'consolidate'` summarises the work into a NEW chat to carry on in, then
   * closes this one keeping every message; `'clear'` empties it in place. An
   * agent-run chat is only ever offered `'consolidate'`.
   */
  kind: 'consolidate' | 'clear'
  label: string
  /** Confirmation text. Says plainly what survives. */
  confirm: string
  /** True when the action is already done and should read as such. */
  done: boolean
}

/** Agent-run chats hold the record of how work was implemented. */
function isAgentRunChat(context: Pick<ChatContext, 'type'>): boolean {
  return context.type === 'AGENT_RUN_STORY' || context.type === 'AGENT_RUN_FEATURE'
}

/**
 * The close-down control for a chat.
 *
 * An agent-run chat is never offered "clear": its messages ARE the record of how
 * the work was implemented, and that is the valuable part — the thing worth
 * keeping long after the run itself stops mattering. Archiving retires it while
 * keeping all of it; clearing would destroy exactly what someone would come back
 * to read.
 */
export function chatCloseAction(
  context: Pick<ChatContext, 'type'>,
  closure: ChatClosure,
): ChatCloseAction {
  if (isAgentRunChat(context)) {
    return {
      kind: 'consolidate',
      label: closure.locked ? 'Closed' : 'Close & summarise',
      confirm:
        'Close this chat down? A new chat is created with a summary of what happened, and every message here is kept as the record of how the work was done — nothing is deleted.',
      done: closure.locked,
    }
  }
  return {
    kind: 'clear',
    label: 'Clear messages',
    confirm: 'Clear all messages in this chat? This cannot be undone.',
    done: false,
  }
}
