/** Which stored secret an agent showed the user: an LLM config's key, a Git credential's token, a web-search provider's key. */
export type StoredSecretKind = 'llm-key' | 'git-token' | 'web-search-key'

/** The secret a `showStoredSecret` row lets the person reveal — which one, never its value. */
export type StoredSecretView = {
  kind: StoredSecretKind
  /** The config or credential id, or the web-search provider. */
  id: string
  name: string
  label: string
  /** Why the agent showed it, as it said. */
  purpose?: string
}

/** A stored secret fetched for the person who asked to see it, or word that it is no longer stored. */
export type StoredSecretReveal = { value: string } | { missing: true }
