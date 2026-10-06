export const PROCESS_INTEGRATION_FORM_NO_IDENTITY =
  'Choose who the commits are made as. If none is offered, add a git credential with a name and an email first.'

export const PROCESS_INTEGRATION_FORM_NO_MESSAGE = 'Write the commit message.'

export const PROCESS_INTEGRATION_FORM_NO_ACCOUNT =
  'Choose the account the pull request is opened as. If none is offered, add a git credential for this repository’s host first.'

export const PROCESS_INTEGRATION_FORM_NO_TITLE = 'Give the pull request a title.'

/** Where the preview says the work shows, by the remote's host. */
export const PROCESS_INTEGRATION_PREVIEW_HOSTS: ReadonlyArray<{ test: RegExp; name: string }> = [
  { test: /(^|\.)github\.com$/, name: 'GitHub' },
  { test: /(^|\.)(dev\.azure\.com|visualstudio\.com)$/, name: 'Azure DevOps' },
  { test: /(^|\.)gitlab\.com$/, name: 'GitLab' },
  { test: /(^|\.)bitbucket\.org$/, name: 'Bitbucket' },
]

export const PROCESS_INTEGRATION_PREVIEW_NOWHERE = 'As it will show in the history'

export const PROCESS_INTEGRATION_PREVIEW_NO_ONE = 'No one chosen to commit as'

/** The most entries a preview lists. */
export const PROCESS_INTEGRATION_PREVIEW_MAX_ENTRIES = 6

/** The form's labels. */
export const PROCESS_INTEGRATION_FORM_LABELS = {
  identity: 'Commit as',
  message: 'Commit message',
  account: 'Open it as',
  prTitle: 'Title',
  prBody: 'Description',
  back: 'Back',
  land: 'Approve and land it',
  confirm: 'Land it',
  more: (count: number) => `and ${count} more commit${count === 1 ? '' : 's'}`,
  loading: 'Reading who it can land as…',
} as const
