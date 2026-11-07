import type {
  JiraTokenType,
  ProviderConnectionDraft,
  ProviderConnectionFormLayout,
  ProviderConnectionMethod,
  ProviderConnectionSpec,
} from './providerConnectionFormTypes'

/** A token with scopes is the kind that can write, so a new connection opens on it. */
export const JIRA_DEFAULT_TOKEN_TYPE: JiraTokenType = 'scoped'

export const JIRA_TOKEN_TYPES: readonly { value: JiraTokenType; label: string }[] = [
  { value: 'scoped', label: 'With scopes' },
  { value: 'classic', label: 'Classic' },
]

export const JIRA_TOKEN_COPY = {
  typeLabel: 'Token type',
  scopedHint:
    'Made with “Create API token with scopes”. It needs read:jira-work, write:jira-work and read:jira-user.',
  classicHint: 'A classic token reads tickets, but cannot post to Jira or move a ticket.',
  newTokenHint: 'A new token type needs a new token.',
  cloudIdLabel: 'Cloud id',
  cloudIdPlaceholder: '1324a887-45db-1bf4-1e99-ef0ff456d421',
  cloudIdHint: 'Filled in from your site URL.',
  cloudIdFinding: 'Finding it on your site…',
  cloudIdFound: 'Found on your site.',
  cloudIdNotFound:
    'Could not find it. Copy cloudId from https://your-site.atlassian.net/_edge/tenant_info.',
} as const

export const PROVIDER_CONNECTION_EMPTY_DRAFT: ProviderConnectionDraft = {
  name: '',
  provider: 'github',
  username: '',
  token: '',
  baseUrl: '',
  cloudId: '',
  tokenType: JIRA_DEFAULT_TOKEN_TYPE,
}

/** The ticket providers a connection can use, in the order the pickers show them. */
export const PROVIDER_CONNECTION_OPTIONS = [
  { value: 'github', label: 'GitHub Issues' },
  { value: 'jira', label: 'Jira' },
  { value: 'azure-devops', label: 'Azure DevOps' },
] as const

export const PROVIDER_CONNECTION_SPECS: Readonly<Record<string, ProviderConnectionSpec>> = {
  github: {
    label: 'GitHub Issues',
    token: {
      label: 'API token',
      hint: 'A GitHub PAT with the Issues / repo scope.',
      placeholder: 'ghp_… / github_pat_…',
    },
    oauth: { action: 'Connect with GitHub', cloudId: false },
  },
  jira: {
    label: 'Jira',
    username: {
      label: 'Account email',
      hint: 'Jira authenticates with your account email + an API token.',
      placeholder: 'you@company.com',
    },
    baseUrl: {
      label: 'Site URL',
      hint: 'Your Jira Cloud site, e.g. https://acme.atlassian.net.',
      placeholder: 'https://your-domain.atlassian.net',
    },
    token: {
      label: 'API token',
      hint: 'A Jira API token from id.atlassian.com.',
      placeholder: 'Jira API token',
    },
    oauth: { action: 'Connect with Jira', cloudId: true },
  },
  'azure-devops': {
    label: 'Azure DevOps',
    baseUrl: {
      label: 'Organization or project URL',
      hint: 'Your organization, or one project in it.',
      placeholder: 'https://dev.azure.com/your-org/your-project',
    },
    token: {
      label: 'Personal access token',
      hint: 'A PAT with the Work Items (Read) scope.',
      placeholder: 'Personal access token',
    },
  },
}

/** A provider this client has no words for: a stored one is kept, and a token is all it asks. */
export const PROVIDER_CONNECTION_FALLBACK_TOKEN = {
  label: 'API token',
  hint: 'The token this provider gave you.',
  placeholder: 'API token',
}

export const PROVIDER_CONNECTION_KEEP_TOKEN_HINT = 'Leave blank to keep the current token.'

export const PROVIDER_CONNECTION_NEW_TOKEN_LABEL = (label: string): string =>
  `New ${label.replace(/^[A-Z](?=[a-z])/, (first) => first.toLowerCase())} (optional)`

export const PROVIDER_CONNECTION_PROBLEMS = {
  name: 'Give the connection a name.',
  token: 'Paste a token.',
  username: 'Enter the account email.',
  baseUrl: 'Enter the URL.',
  azureUrl: 'Use https://dev.azure.com/your-org, with a project if you want one.',
  cloudId: 'Enter the Jira cloud id.',
  jiraCloudId: 'Enter the cloud id, a UUID.',
  jiraSite: 'A token with scopes needs an Atlassian site, like https://your-site.atlassian.net.',
  newToken: 'Paste a new token.',
  noOAuth: 'This provider has no sign-in. Use a token.',
} as const

export const PROVIDER_CONNECTION_FORM_LAYOUTS: readonly ProviderConnectionFormLayout[] = [
  'choice',
  'button-first',
  'link-below',
]

/** The layout that ships. */
export const PROVIDER_CONNECTION_DEFAULT_LAYOUT: ProviderConnectionFormLayout = 'choice'

export const PROVIDER_CONNECTION_FORM_LAYOUT_LABELS: Record<ProviderConnectionFormLayout, string> =
  {
    choice: 'Two choices',
    'button-first': 'Button above',
    'link-below': 'Link below',
  }

/** The method a new connection opens on: a token always works, and sign-in needs the backend set up. */
export const PROVIDER_CONNECTION_DEFAULT_METHOD: ProviderConnectionMethod = 'token'

export const PROVIDER_OAUTH_COPY = {
  methodLabel: 'How to connect',
  tokenMethod: 'API token',
  cloudIdLabel: 'Jira cloud id',
  cloudIdHint: 'Find it at https://your-site.atlassian.net/_edge/tenant_info.',
  cloudIdPlaceholder: '1324a887-45db-1bf4-1e99-ef0ff456d421',
  orDivider: 'or',
  useToken: 'Use a token instead',
  useSignIn: (action: string) => `${action} instead`,
  waitingTitle: 'Finish in your browser',
  waitingBody: 'Sign in there. This moves on by itself once you have.',
  openAgain: 'Open the page again',
  backOut: 'Cancel sign-in',
  connected: (provider: string) =>
    `Connected with ${provider}. To use another account, add a new connection.`,
  signedIn: 'Signed in',
  reconnect: 'Reconnect',
  reconnectHint: 'Sign in again to renew this connection. Everything using it stays connected.',
  notSetUp: 'Sign-in isn’t set up on this backend yet. Use a token instead.',
  declined: 'The sign-in was cancelled. Nothing changed.',
  lost: 'That sign-in is no longer open. Start it again.',
  badPage: 'The backend gave a sign-in page that can’t be opened.',
  startFailed: 'Could not start the sign-in. Try again.',
  finishFailed: 'The sign-in did not finish. Start it again.',
} as const
