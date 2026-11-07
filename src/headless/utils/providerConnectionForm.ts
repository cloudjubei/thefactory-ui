import {
  JIRA_TOKEN_COPY,
  PROVIDER_CONNECTION_EMPTY_DRAFT,
  PROVIDER_CONNECTION_FALLBACK_TOKEN,
  PROVIDER_CONNECTION_KEEP_TOKEN_HINT,
  PROVIDER_CONNECTION_NEW_TOKEN_LABEL,
  PROVIDER_CONNECTION_PROBLEMS,
  PROVIDER_CONNECTION_SPECS,
  PROVIDER_OAUTH_COPY,
} from './providerConnectionFormConstants'
import type {
  JiraCloudIdStatus,
  JiraTokenType,
  ProviderConnectionDraft,
  ProviderConnectionSaving,
  ProviderConnectionSpec,
  ProviderConnectionStored,
  ProviderFieldCopy,
  ProviderOAuthStartBody,
} from './providerConnectionFormTypes'

/** The URLs `AzureDevOpsConnector` accepts. React Native's `URL` has no `hostname`, so they are read by hand. */
const AZURE_CLOUD_URL = /^https:\/\/dev\.azure\.com(\/[^/?#:@]+){1,2}\/?$/i
const AZURE_LEGACY_URL =
  /^https:\/\/[^./?#:@]+\.visualstudio\.com(\/defaultcollection\/[^/?#:@]+|\/[^/?#:@]+)?\/?$/i

/** The form the backend takes a Jira cloud id in. */
const JIRA_CLOUD_ID = /^[a-zA-Z0-9-]+$/

/** What a token with scopes routes by: a real site's UUID, which is never all zeros. */
const JIRA_SITE_CLOUD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALL_ZERO = /^[0-]+$/

/** The bare Atlassian Cloud site a token with scopes needs, read by hand for React Native. */
const JIRA_SITE_URL = /^https:\/\/[a-z0-9-]+\.atlassian\.net\/?$/i

const specOf = (provider: string): ProviderConnectionSpec | undefined =>
  Object.hasOwn(PROVIDER_CONNECTION_SPECS, provider)
    ? PROVIDER_CONNECTION_SPECS[provider]
    : undefined

/** What a provider's form asks for; a provider this client does not know asks for a token alone. */
export function providerConnectionSpec(provider: string): ProviderConnectionSpec {
  return specOf(provider) ?? { label: provider, token: PROVIDER_CONNECTION_FALLBACK_TOKEN }
}

export function providerConnectionLabel(provider: string): string {
  return providerConnectionSpec(provider).label
}

/** A connection a person signed in with: its token and site are the provider's, not theirs to edit. */
export function isOAuthConnection(connection: { tokenSource?: string }): boolean {
  return connection.tokenSource === 'oauth'
}

/** One line under a connection's name: provider, account, site, and whether it was signed in. */
export function providerConnectionLine(connection: {
  provider: string
  username?: string
  baseUrl?: string
  tokenSource?: string
}): string {
  return [
    providerConnectionLabel(connection.provider),
    connection.username,
    connection.baseUrl,
    isOAuthConnection(connection) ? PROVIDER_OAUTH_COPY.signedIn : undefined,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** The kind of token a connection holds. A connection from before there was a choice is classic. */
export function jiraTokenTypeOf(connection: { config?: Record<string, string> }): JiraTokenType {
  return connection.config?.jiraApiTokenMode === 'scoped' ? 'scoped' : 'classic'
}

export function isJiraCloudId(id: string): boolean {
  const trimmed = id.trim()
  return JIRA_SITE_CLOUD_ID.test(trimmed) && !ALL_ZERO.test(trimmed)
}

export function isJiraSiteUrl(url: string): boolean {
  return JIRA_SITE_URL.test(url.trim())
}

const usesScopedToken = (draft: ProviderConnectionDraft): boolean =>
  draft.provider === 'jira' && draft.tokenType === 'scoped'

/** The form as it opens. A stored token is write-only: nothing of it comes back. */
export function providerConnectionDraftOf(
  connection: ProviderConnectionStored | undefined,
): ProviderConnectionDraft {
  if (!connection) return PROVIDER_CONNECTION_EMPTY_DRAFT
  const tokenType = jiraTokenTypeOf(connection)
  return {
    ...PROVIDER_CONNECTION_EMPTY_DRAFT,
    name: connection.name,
    provider: connection.provider,
    username: connection.username ?? '',
    baseUrl: connection.baseUrl ?? '',
    cloudId: tokenType === 'scoped' ? (connection.config?.cloudId ?? '') : '',
    tokenType,
  }
}

/** The draft with a new site. A cloud id belongs to the site it was found on, so it goes too. */
export function providerConnectionDraftWithSite(
  draft: ProviderConnectionDraft,
  baseUrl: string,
): ProviderConnectionDraft {
  return { ...draft, baseUrl, ...(usesScopedToken(draft) ? { cloudId: '' } : {}) }
}

/** The site to ask for a cloud id: only while one is wanted and the site can answer. */
export function jiraCloudIdSiteOf(draft: ProviderConnectionDraft): string | undefined {
  const wanted = usesScopedToken(draft) && !draft.cloudId.trim() && isJiraSiteUrl(draft.baseUrl)
  return wanted ? draft.baseUrl.trim() : undefined
}

/** Why the cloud id as typed cannot work. Nothing typed yet is no problem: it may still be found. */
export function jiraCloudIdProblem(draft: ProviderConnectionDraft): string | undefined {
  return draft.cloudId.trim() && !isJiraCloudId(draft.cloudId)
    ? PROVIDER_CONNECTION_PROBLEMS.jiraCloudId
    : undefined
}

/** Where finding stands once nothing is being asked: only an id it found stays said. */
export function jiraCloudIdStatusAtRest(status: JiraCloudIdStatus): JiraCloudIdStatus {
  return status === 'found' ? 'found' : 'idle'
}

/** What the cloud id field says under it. An id the person typed needs no words. */
export function jiraCloudIdHint(status: JiraCloudIdStatus, cloudId: string): string | undefined {
  if (cloudId.trim()) return status === 'found' ? JIRA_TOKEN_COPY.cloudIdFound : undefined
  if (status === 'finding') return JIRA_TOKEN_COPY.cloudIdFinding
  return status === 'failed' ? JIRA_TOKEN_COPY.cloudIdNotFound : JIRA_TOKEN_COPY.cloudIdHint
}

/** Why the URL as typed cannot work. Nothing typed yet is no problem. */
export function providerBaseUrlProblem(draft: ProviderConnectionDraft): string | undefined {
  const url = draft.baseUrl.trim()
  if (!url) return undefined
  if (usesScopedToken(draft)) {
    return isJiraSiteUrl(url) ? undefined : PROVIDER_CONNECTION_PROBLEMS.jiraSite
  }
  if (draft.provider !== 'azure-devops') return undefined
  return AZURE_CLOUD_URL.test(url) || AZURE_LEGACY_URL.test(url)
    ? undefined
    : PROVIDER_CONNECTION_PROBLEMS.azureUrl
}

/** Whether the draft changes the kind of token: a stored one cannot stand in for the new kind. */
function changesTokenType(
  draft: ProviderConnectionDraft,
  stored: ProviderConnectionStored | undefined,
): boolean {
  return !!stored && draft.provider === 'jira' && draft.tokenType !== jiraTokenTypeOf(stored)
}

/** Why a token connection cannot be saved yet. */
export function providerConnectionDraftProblem(
  draft: ProviderConnectionDraft,
  { creating, stored }: ProviderConnectionSaving,
): string | undefined {
  const spec = providerConnectionSpec(draft.provider)
  if (!draft.name.trim()) return PROVIDER_CONNECTION_PROBLEMS.name
  if (spec.username && !draft.username.trim()) return PROVIDER_CONNECTION_PROBLEMS.username
  if (spec.baseUrl && !draft.baseUrl.trim()) return PROVIDER_CONNECTION_PROBLEMS.baseUrl
  const urlProblem = providerBaseUrlProblem(draft)
  if (urlProblem) return urlProblem
  if (usesScopedToken(draft) && !isJiraCloudId(draft.cloudId)) {
    return PROVIDER_CONNECTION_PROBLEMS.jiraCloudId
  }
  if (draft.token.trim()) return undefined
  if (creating) return PROVIDER_CONNECTION_PROBLEMS.token
  return changesTokenType(draft, stored) ? PROVIDER_CONNECTION_PROBLEMS.newToken : undefined
}

/** What the token field says: the words change with the kind of token and with what is required. */
export function providerTokenFieldCopy(
  draft: ProviderConnectionDraft,
  { creating, stored }: ProviderConnectionSaving,
): Pick<ProviderFieldCopy, 'label' | 'hint'> {
  const { label, hint } = providerConnectionSpec(draft.provider).token
  if (creating) {
    if (draft.provider !== 'jira') return { label, hint }
    const scoped = draft.tokenType === 'scoped'
    return { label, hint: scoped ? JIRA_TOKEN_COPY.scopedHint : JIRA_TOKEN_COPY.classicHint }
  }
  if (changesTokenType(draft, stored)) {
    return {
      label: PROVIDER_CONNECTION_NEW_TOKEN_LABEL(label).replace(' (optional)', ''),
      hint: JIRA_TOKEN_COPY.newTokenHint,
    }
  }
  return {
    label: PROVIDER_CONNECTION_NEW_TOKEN_LABEL(label),
    hint: PROVIDER_CONNECTION_KEEP_TOKEN_HINT,
  }
}

/**
 * The `config` a save sends, only when the token's kind or id changes: any other
 * field in it counts as a change of credentials, which a rename must not be.
 */
function jiraTokenConfigOf(
  draft: ProviderConnectionDraft,
  stored: ProviderConnectionStored | undefined,
): Record<string, string> | undefined {
  if (draft.provider !== 'jira') return undefined
  const cloudId = draft.cloudId.trim().toLowerCase()
  if (draft.tokenType === 'classic') return changesTokenType(draft, stored) ? {} : undefined
  const same = stored?.config?.cloudId?.toLowerCase() === cloudId
  return same && !changesTokenType(draft, stored)
    ? undefined
    : { jiraApiTokenMode: 'scoped', cloudId }
}

/** What is saved: only the fields the chosen provider uses. A blank token keeps the stored one. */
export function providerConnectionFieldsOf(
  draft: ProviderConnectionDraft,
  stored?: ProviderConnectionStored,
): {
  name: string
  provider: string
  username?: string
  baseUrl?: string
  token?: string
  config?: Record<string, string>
} {
  const spec = providerConnectionSpec(draft.provider)
  const username = draft.username.trim()
  const baseUrl = draft.baseUrl.trim()
  const token = draft.token.trim()
  const config = jiraTokenConfigOf(draft, stored)
  return {
    name: draft.name.trim(),
    provider: draft.provider.trim(),
    ...(spec.username && username ? { username } : {}),
    ...(spec.baseUrl && baseUrl ? { baseUrl } : {}),
    ...(token ? { token } : {}),
    ...(config ? { config } : {}),
  }
}

/** Why a sign-in cannot start yet. */
export function providerOAuthDraftProblem(draft: ProviderConnectionDraft): string | undefined {
  const oauth = providerConnectionSpec(draft.provider).oauth
  if (!oauth) return PROVIDER_CONNECTION_PROBLEMS.noOAuth
  if (!draft.name.trim()) return PROVIDER_CONNECTION_PROBLEMS.name
  return oauth.cloudId && !JIRA_CLOUD_ID.test(draft.cloudId.trim())
    ? PROVIDER_CONNECTION_PROBLEMS.cloudId
    : undefined
}

/** Whether a form offers sign-in for a provider: it has a sign-in, and the backend has it set up. */
export function offersProviderOAuth(
  provider: string,
  oauth: { setup: Readonly<Record<string, boolean>> } | undefined,
): boolean {
  return (
    specOf(provider)?.oauth !== undefined &&
    !!oauth &&
    Object.hasOwn(oauth.setup, provider) &&
    oauth.setup[provider] === true
  )
}

/** What a reconnect sends: the connection's own name, and the backend keeps its site. */
export function providerOAuthReconnectBody(connection: {
  id: string
  name: string
}): ProviderOAuthStartBody {
  return { name: connection.name, connectionId: connection.id }
}

export function providerOAuthStartBody(draft: ProviderConnectionDraft): ProviderOAuthStartBody {
  const needsCloudId = providerConnectionSpec(draft.provider).oauth?.cloudId === true
  return {
    name: draft.name.trim(),
    ...(needsCloudId ? { cloudId: draft.cloudId.trim() } : {}),
  }
}

/** Desktop and mobile hand this page to the OS, so nothing but https goes there. */
export function isProviderOAuthPage(url: string): boolean {
  return /^https:\/\/[^/\s]/i.test(url)
}

/** A failed sign-in in words a person can act on. */
export function providerOAuthFailure(message: string): string {
  if (/not configured/i.test(message)) return PROVIDER_OAUTH_COPY.notSetUp
  return message
}
