/** Heads the three choices Approve reveals. */
export const PROCESS_INTEGRATION_CHOOSER_HEAD = 'How should the approved work come in?'

/** What every choice has in common. */
export const PROCESS_INTEGRATION_CHOOSER_NOTE =
  'Test seams are left out. Next you choose who it lands as and the words it lands with.'

/** Heads the details of the way chosen. */
export const PROCESS_INTEGRATION_DETAILS_HEAD = {
  merge: 'Merge — who it is made as, and the merge commit’s message',
  squash: 'Merge as one commit — who it is made as, and its message',
  'pull-request': 'Open a pull request — the account, and what it says',
} as const

/** A conflict on landing: the agent that resolves it, and the work coming back to be confirmed. */
export const PROCESS_INTEGRATION_CONFLICT = {
  resolve: 'Resolve with an agent',
  resolveDetail:
    'A developer merges the base branch into the work and resolves the files, keeping both sides; the checks run, then you confirm how it lands.',
  openPullRequest: 'Open a pull request instead',
  resolving: (baseRef: string) => `An agent is resolving the conflict with ${baseRef}`,
  resolvingDetail: (baseRef: string) =>
    `It resolves the files, ${baseRef} is merged into the work and the checks run — then the work comes back to you to confirm how it lands.`,
  resolved: (baseRef: string) =>
    `The conflict with ${baseRef} is resolved — confirm how the work lands`,
  resolvedDetail: (baseRef: string, checks: string | undefined) =>
    `${baseRef} was merged into the work, resolving the files below${
      checks ? `, and the checks ran on it: ${checks}` : ''
    }. Approve to land it — the way, identity and message you chose before are kept.`,
} as const

export const PROCESS_INTEGRATION_CANCEL = 'Cancel'

export const PROCESS_INTEGRATION_RETRY = 'Try again'

/** Heads the choices a retry offers. */
export const PROCESS_INTEGRATION_RETRY_HEAD = 'Try again — how should the work come in?'

export const PROCESS_INTEGRATION_PR_LINK = 'Open the pull request'

export const PROCESS_INTEGRATION_COMPARE_LINK = 'Open a pull request'

export const PROCESS_INTEGRATION_NEVER_TRIED =
  'The story was approved, but its work branch was not brought in.'

export const PROCESS_INTEGRATION_BADGE = {
  integrating: 'Bringing the work in',
  awaiting: 'Approved — not merged',
} as const

/**
 * Approving work in a project with no git of its own — its history is one
 * Overseer keeps privately — said without git words: there is nothing to merge
 * into and nowhere to open a pull request, only the folder the work goes into.
 */
export const PROCESS_INTEGRATION_SHADOW = {
  label: 'Approve',
  detail: 'Brings the work into the project folder.',
  busy: 'Bringing the work into the project folder…',
  done: 'Brought into the project folder',
  alreadyIn: 'Nothing to bring in — the project folder already had this work',
  failed: 'Approved — not brought into the project folder',
  neverTried: 'The story was approved, but its work was not brought into the project folder.',
  awaitingBadge: 'Approved — not brought in',
} as const
