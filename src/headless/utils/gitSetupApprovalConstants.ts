export const GIT_SETUP_TOOL_NAME = 'setupProjectGitRepo'

/** Characters GitHub allows in a repository name. */
export const GITHUB_REPO_NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/

/** Characters GitHub allows in an account or organisation name. */
export const GITHUB_OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/

export const GIT_SETUP_COPY = {
  waiting: 'Waiting for you to approve the GitHub repository',
  openOnGitHub: 'Open on GitHub',
  nothingToDo: 'Git was already set up — nothing to do',
  needsCredential: 'Needs a git credential first',
  failed: 'Setting up git and GitHub failed',
  yourAccount: 'your GitHub account',
} as const

/** What a tool row says while its call waits on the user's decision elsewhere. */
export const TOOL_AWAITING_DECISION_LABEL = 'Waiting for you'
