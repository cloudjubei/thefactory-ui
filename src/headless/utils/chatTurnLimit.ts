import { CHAT_TURN_LIMIT_START } from './chatTurnLimitConstants'
import type { ChatTurnLimit, ChatTurnLimitSettings } from './chatTurnLimitTypes'

/** The switch and slider for a chat's settings — the same on every transport. */
export function buildChatTurnLimit(settings: ChatTurnLimitSettings | undefined): ChatTurnLimit {
  return {
    limited: settings?.limitTurns === true,
    maxTurns: settings?.maxTurns ?? CHAT_TURN_LIMIT_START,
  }
}

/** The settings patch the switch produces: the switch, and the number it holds runs to. */
export function applyChatTurnLimit(
  limited: boolean,
  settings: ChatTurnLimitSettings | undefined,
): ChatTurnLimitSettings {
  return { limitTurns: limited, maxTurns: settings?.maxTurns ?? CHAT_TURN_LIMIT_START }
}
