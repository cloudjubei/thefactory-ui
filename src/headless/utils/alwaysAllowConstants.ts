/** The choice that keeps an always-allow to the chat it was given in — the default. */
export const ALWAYS_ALLOW_IN_CHAT_LABEL = 'Always allow in this chat'

/** The choice that applies an always-allow to every chat, whichever model or sign-in. */
export const ALWAYS_ALLOW_EVERYWHERE_LABEL = 'Always allow everywhere'

/** A row marked to be always allowed in this chat once the turn resumes. */
export const ALWAYS_ALLOWED_IN_CHAT_LABEL = 'Always allowed in this chat ✓'

/** A row marked to be always allowed everywhere once the turn resumes. */
export const ALWAYS_ALLOWED_EVERYWHERE_LABEL = 'Always allowed everywhere ✓'

/** Where an everywhere grant applies, in one line. */
export const ALWAYS_ALLOW_EVERYWHERE_REACH = 'every chat, with any model or sign-in'

/** The words a rule ends with for where it applies. */
export const GRANT_SCOPE_WORDS = { chat: 'in this chat', everywhere: 'everywhere' } as const

/** Why the menu button is there, for a screen reader and its tooltip. */
export const ALWAYS_ALLOW_MENU_LABEL = (tool: string): string =>
  `Choose where to always allow ${tool}`
