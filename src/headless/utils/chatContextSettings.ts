import { DEFAULT_COMPLETION_SETTINGS } from 'thefactory-tools/constants'

import {
  CHAT_HISTORY_SHARE_MAX,
  CHAT_HISTORY_SHARE_MIN,
  CHAT_NOTES_TURNS_MAX,
  CHAT_NOTES_TURNS_MIN,
} from './chatContextSettingsConstants'
import type { ChatContextSettingsStored, ChatContextSettingsView } from './chatContextSettingsTypes'

const within = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** The advanced sliders for a chat: what it stores, else what the host reads its absence as. Pure. */
export function buildChatContextSettings(
  settings: Partial<ChatContextSettingsStored> | undefined,
): ChatContextSettingsView {
  const fraction = settings?.seedCeilingFraction ?? DEFAULT_COMPLETION_SETTINGS.seedCeilingFraction
  const turns = settings?.cliContextStaleTurns ?? DEFAULT_COMPLETION_SETTINGS.cliContextStaleTurns
  return {
    historyShare: within(
      Math.round((fraction ?? 0) * 100),
      CHAT_HISTORY_SHARE_MIN,
      CHAT_HISTORY_SHARE_MAX,
    ),
    notesTurns: within(turns ?? 0, CHAT_NOTES_TURNS_MIN, CHAT_NOTES_TURNS_MAX),
  }
}

/** The settings patch for a history share, in percent. Pure. */
export function applyChatHistoryShare(
  percent: number,
): Pick<ChatContextSettingsStored, 'seedCeilingFraction'> {
  return {
    seedCeilingFraction: within(percent, CHAT_HISTORY_SHARE_MIN, CHAT_HISTORY_SHARE_MAX) / 100,
  }
}

/** The settings patch for the notes turns. Pure. */
export function applyChatNotesTurns(
  turns: number,
): Pick<ChatContextSettingsStored, 'cliContextStaleTurns'> {
  return { cliContextStaleTurns: Math.max(CHAT_NOTES_TURNS_MIN, Math.round(turns)) }
}
