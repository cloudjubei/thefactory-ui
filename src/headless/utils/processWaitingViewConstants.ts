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

/** The card's line while the ask is on its way to another agent, before its chat exists. */
export const WAITING_DELEGATING_HEADING = 'Handing this to another agent…'

/** The card's line once another agent has the ask. */
export const WAITING_DELEGATED_HEADING = 'Another agent is working on this'

export const WAITING_DELEGATED_DETAIL =
  'It reads the run, does what it can and tells you in its chat what only you can do. Once it’s sorted, answer here and the agent carries on.'

export const WAITING_DELEGATED_OPEN = 'Open the chat'

/** A card's heading when the agent left several requests waiting — the agent's label goes first. */
export const WAITING_REQUESTS_HEADING = 'needs your approval on several requests'

/** What a card of several requests says in place of the agent's words. */
export const WAITING_REQUESTS_WORDS = (open: number, total: number) =>
  `Decide each request on its own, or answer ${open === total ? 'them all' : `the ${open} still open`} at once below — the agent carries on once every one is decided.`

/** What a decided request of several says, by how it was decided. */
export const WAITING_REQUEST_DECIDED = {
  allow: 'Allowed',
  'allow-site': 'Allowed — site trusted for good',
  decline: 'Declined',
  withdrawn: 'Withdrawn',
} as const
