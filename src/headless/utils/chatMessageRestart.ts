import { MESSAGE_RESTART_BUSY_LABEL, MESSAGE_RESTART_LABEL } from './chatMessageRestartConstants'
import type { MessageRestartControl, MessageRestartInput } from './chatMessageRestartTypes'

/**
 * What the restart control on a chat row does, or `undefined` when the row must
 * not offer one. Shared by the web and native message lists so both clients
 * offer the re-run under the same rules.
 *
 * The trigger is the message shape, not an error flag: a failed turn's error
 * lives in session-local live state and is gone after a reload, whereas "the
 * conversation ends on my message and nothing answered it" is visible to every
 * client at any time.
 */
export function describeLastUserMessageRestart(
  input: MessageRestartInput,
): MessageRestartControl | undefined {
  if (!input.hasRestartAction) return undefined
  if (!input.isLast) return undefined
  if (input.role !== 'user') return undefined

  return {
    label: input.turnInFlight ? MESSAGE_RESTART_BUSY_LABEL : MESSAGE_RESTART_LABEL,
    disabled: input.turnInFlight,
  }
}

/**
 * Whether a chat's stored messages end on a turn that can be re-run in place —
 * the same rule the control renders on, applied by the ACTION at click time.
 * The two are separate because the messages can move between the render and the
 * click (another client's turn landing, a background refresh), and re-running a
 * conversation whose tail has since changed would run the wrong prompt.
 */
export function isRestartableChatTail(messages: readonly { role: string }[] | undefined): boolean {
  if (!messages || messages.length === 0) return false
  return messages[messages.length - 1]?.role === 'user'
}
