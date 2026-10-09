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

/** The landing's "build and type-check the result first" option, on the sign-off and on an agent's card. */
export const PROCESS_INTEGRATION_CHECK_MERGE = {
  label: (baseRef: string) => `Build and type-check the result before it lands on ${baseRef}`,
  hint: (baseRef: string) =>
    `The merge is made in a scratch copy and the project's build and type check run on it; ${baseRef} moves only if they pass. Nothing is built when what lands is exactly what the work's own checks ran on.`,
  line: ', built and type-checked first',
  busy: (baseRef: string) =>
    `Building and type-checking the merged result — ${baseRef} moves only if they pass.`,
} as const
