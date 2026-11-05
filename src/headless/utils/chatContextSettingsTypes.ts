import type { CompletionSettings } from 'thefactory-tools/types'

/** The settings a chat's context is kept within, as stored. */
export type ChatContextSettingsStored = Pick<
  CompletionSettings,
  'seedCeilingFraction' | 'cliContextStaleTurns'
>

/** The advanced section's two sliders. */
export type ChatContextSettingsView = {
  /** The share of the window, in percent. */
  historyShare: number
  notesTurns: number
}
