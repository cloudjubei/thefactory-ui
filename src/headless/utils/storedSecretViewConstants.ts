import type { StoredSecretKind } from './storedSecretViewTypes'

/** The agent tool that shows the person a stored secret on its row. */
export const SHOW_STORED_SECRET_TOOL_NAME = 'showStoredSecret'

/** What each kind of stored secret is called on its card. */
export const STORED_SECRET_LABELS: Record<StoredSecretKind, string> = {
  'llm-key': 'LLM API key',
  'git-token': 'Git token',
  'web-search-key': 'Web-search key',
}

export const STORED_SECRET_COPY = {
  only: 'Only you can see this — the agent never does.',
  missing: 'No longer stored — it was removed or replaced.',
  confirmTitle: 'Reveal the stored secret?',
  confirmDescription: 'It will be visible on screen until you leave this chat.',
} as const
