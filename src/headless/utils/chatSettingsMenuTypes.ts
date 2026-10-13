/** One thing the chat settings menu can do. */
export type ChatSettingsMenuKey =
  | 'notify'
  | 'tune'
  | 'archive'
  | 'prompt'
  | 'costs'
  | 'dynamic-context'
  | 'debug'
  | 'clear'
  | 'delete'

/** The group a row sits in: the chat's own settings, the developer tools, or what cannot be undone. */
export type ChatSettingsMenuSection = 'chat' | 'developer' | 'danger'

/** One row of the chat settings menu. */
export type ChatSettingsMenuItem = {
  key: ChatSettingsMenuKey
  label: string
  /** The value it sits at, drawn after the label — `When it needs me ›`. */
  hint?: string
  section: ChatSettingsMenuSection
}

/** What the chat settings menu is built from. */
export type ChatSettingsMenuInput = {
  /** The chat's notification level in words. Absent hides "Notify me". */
  notifyLevel?: string
  /** Whether turn limit and tools can change now — not while an agent run works. */
  canTune: boolean
  /** Whether the chat is hidden from the chat list. Absent hides the archive row. */
  listHidden?: boolean
  /** The "Show developer tools" preference: adds the developer rows. */
  showDeveloperTools: boolean
  /** The clear control's words (`Clear messages`). Absent when the chat cannot be cleared. */
  clearLabel?: string
  canDelete: boolean
  /** An Assistant conversation: its archive and delete rows speak of a conversation. */
  assistant?: boolean
}
