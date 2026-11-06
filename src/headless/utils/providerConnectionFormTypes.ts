/** The two kinds of Jira API token a person can make at id.atlassian.com. */
export type JiraTokenType = 'scoped' | 'classic'

/** What the connection form holds while it is filled in. A stored token never comes back into it. */
export type ProviderConnectionDraft = {
  name: string
  provider: string
  username: string
  token: string
  baseUrl: string
  cloudId: string
  tokenType: JiraTokenType
}

/** What the form reads of the connection it edits. */
export type ProviderConnectionStored = {
  name: string
  provider: string
  username?: string
  baseUrl?: string
  tokenSource?: string
  config?: Record<string, string>
}

/** What the form knows of the save it is checking. */
export type ProviderConnectionSaving = { creating: boolean; stored?: ProviderConnectionStored }

/** How far finding a site's cloud id has got. */
export type JiraCloudIdStatus = 'idle' | 'finding' | 'found' | 'failed'

/** How a person connects: paste a token, or sign in with the provider. */
export type ProviderConnectionMethod = 'token' | 'oauth'

/** How the form offers sign-in beside a token. */
export type ProviderConnectionFormLayout = 'choice' | 'button-first' | 'link-below'

/** A field's words for one provider. */
export type ProviderFieldCopy = {
  label: string
  hint: string
  placeholder: string
}

/** What one provider's form asks for. */
export type ProviderConnectionSpec = {
  label: string
  username?: ProviderFieldCopy
  baseUrl?: ProviderFieldCopy
  token: ProviderFieldCopy
  /** Sign-in, where the backend has it. `cloudId`: the sign-in needs the Jira cloud id. */
  oauth?: { action: string; cloudId: boolean }
}

/** The page a sign-in ended on, as a person pasted it. */
export type ProviderOAuthReturn =
  | { kind: 'code'; code: string; state: string }
  | { kind: 'refused'; reason: string }
  | { kind: 'unreadable' }

/** What starting a sign-in sends. */
export type ProviderOAuthStartBody = { name: string; cloudId?: string }

/** Where a sign-in stands. It holds no code: that goes from the paste straight to the backend. */
export type ProviderOAuthState =
  | { step: 'ready' | 'opening' | 'finishing' | 'done'; error: string | null }
  | { step: 'waiting'; page: string; error: string | null }

/** The two backend calls of a sign-in. */
export type ProviderOAuthActions<C = unknown> = {
  start: (provider: string, body: ProviderOAuthStartBody) => Promise<string>
  finish: (provider: string, body: { code: string; state: string }) => Promise<C>
}
