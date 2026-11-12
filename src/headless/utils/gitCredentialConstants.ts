/** WS topic announcing that a stored git credential was created, updated or deleted. */
export const GIT_CREDENTIALS_EVENT = 'gitCredentials:updated'

/**
 * Shown in place of a host on a credential stored before `host` was recorded.
 * Never render the raw value: an absent host must read as "we don't know",
 * not as `undefined`.
 */
export const GIT_CREDENTIAL_HOST_UNKNOWN = 'Host not recorded'

export const GIT_CREDENTIALS_TITLE = 'Git Credentials'

/**
 * The list is host-agnostic on purpose — GitHub OAuth is one method among
 * several, and a PAT for Azure DevOps / GitLab / Bitbucket is a first-class
 * citizen. The tip says so where the user is choosing.
 */
export const GIT_CREDENTIALS_TIP =
  'Works with any git host — GitHub, Azure DevOps, GitLab, Bitbucket. Use separate credentials for personal and work accounts.'

export const GIT_CREDENTIALS_EMPTY = 'No credentials yet. Click the + button to create one.'

/**
 * Field copy shared by the web and native `GitCredentialsForm` peers, so the
 * two cannot drift on which hosts the form claims to support.
 */
export const GIT_CREDENTIAL_NAME_HINT =
  'Label for these credentials, e.g. “GitHub — personal”, “Azure DevOps — work”'

export const GIT_CREDENTIAL_USERNAME_PLACEHOLDER = 'your-username'

export const GIT_CREDENTIAL_HOST_LABEL = 'Host (optional)'

export const GIT_CREDENTIAL_HOST_PLACEHOLDER = 'github.com'

export const GIT_CREDENTIAL_HOST_HINT =
  'The git host these credentials authenticate against, e.g. dev.azure.com. Leave blank for GitHub.'

export const GIT_CREDENTIAL_TOKEN_PLACEHOLDER = 'Paste your access token'

export const GIT_CREDENTIAL_PAT_NOTE =
  'Use an access token for any git host — Azure DevOps, GitLab, Bitbucket, or a fine-grained / CI token for GitHub.'

/**
 * The words offered wherever a git op fails because its credentials were
 * refused: the inline "Update credentials" button and the app-wide popup.
 * Host-neutral on purpose; the credentials may be for any git host.
 */
export const GIT_CREDENTIAL_FIX_TEXT = {
  update: 'Update credentials',
  dismiss: 'Dismiss',
  title: 'Git credentials needed',
  refused: (verb: string) =>
    `Couldn't ${verb}: the git credentials for this project don't have access to its repository.`,
  hint: "Update the access token in the project's Git settings, or pick credentials that have access to this repository.",
  repository: 'Repository:',
  details: 'Show technical details',
  anyOp: 'reach the repository',
  ops: {
    push: 'push',
    pull: 'pull',
    fetch: 'fetch',
    commit: 'commit and push',
  },
} as const
