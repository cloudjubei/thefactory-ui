/** Heads the three choices Approve reveals. */
export const PROCESS_INTEGRATION_CHOOSER_HEAD = 'How should the approved work come in?'

/** What every choice has in common. */
export const PROCESS_INTEGRATION_CHOOSER_NOTE =
  'Test seams are left out, and every commit is made as the project’s git account.'

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
