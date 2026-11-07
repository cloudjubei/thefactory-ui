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

/** What starting a sign-in sends. `connectionId` renews that connection in place. */
export type ProviderOAuthStartBody = { name: string; cloudId?: string; connectionId?: string }

/** A sign-in the backend opened: the page for the browser, and what its end is told under. */
export type ProviderOAuthStarted = { page: string; signInId: string }

/** How a sign-in stands, as the backend tells it. */
export type ProviderSignInReport = {
  signInId: string
  status: 'waiting' | 'signed-in' | 'declined' | 'failed'
  connectionId?: string
}

/** Where a sign-in stands here. The code goes from the provider to the backend, past every client. */
export type ProviderOAuthState =
  | { step: 'ready' | 'opening' | 'done'; error: string | null }
  | { step: 'waiting'; page: string; signInId: string; error: string | null }

/** What a form needs of the backend's sign-in. */
export type ProviderOAuthActions = {
  /** Which providers can be signed in with. One not named here cannot. */
  setup: Readonly<Record<string, boolean>>
  start: (provider: string, body: ProviderOAuthStartBody) => Promise<ProviderOAuthStarted>
  /** Where a sign-in stands; `undefined` when the backend no longer holds it. */
  read: (signInId: string) => Promise<ProviderSignInReport | undefined>
  /** The person backed out: a browser that still comes back changes nothing. */
  withdraw: (signInId: string) => Promise<void>
  /** Told when a sign-in ends in the browser. Answers how to stop listening. */
  onReport: (listener: (report: ProviderSignInReport) => void) => () => void
  /** Told when the socket is back: what went out meanwhile was lost. */
  onReconnect: (listener: () => void) => () => void
}
