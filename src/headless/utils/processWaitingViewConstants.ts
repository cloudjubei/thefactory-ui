/** A permission's heading, by the kind of request — the agent's label goes first. */
export const WAITING_PERMISSION_HEADINGS: Readonly<Record<string, string>> = {
  'network-unlock': 'needs network access',
  'install-package': 'needs to install a package',
  'external-fetch': 'needs to fetch a page',
  'workspace-limit-raise': 'needs more workspace space',
}

/** A permission's heading for a request of any other kind. */
export const WAITING_PERMISSION_HEADING = 'needs your approval'

export const WAITING_QUESTION_HEADING = 'has a question'

export const WAITING_BLOCKER_HEADING = 'is blocked'

/** What each detail of a request is called on the card. */
export const WAITING_DETAIL_LABELS = {
  host: 'Host',
  packageName: 'Package',
  url: 'URL',
  tool: 'Tool',
} as const

export const WAITING_DELEGATED_LABEL = 'Delegated to another agent — open the chat'
