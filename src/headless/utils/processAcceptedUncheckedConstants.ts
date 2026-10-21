import type { ProcessDecidedBy } from 'thefactory-tools/types'

import type { ProcessStatusTone } from './processView'

/** What a step the run carried on past without proof is called wherever its status shows. */
export const PROCESS_ACCEPTED_UNCHECKED_LABEL = 'Accepted unchecked'

/** Its tone: the gold the unchecked chips and the "Not checked" sign-off wear — never done's green. */
export const PROCESS_ACCEPTED_UNCHECKED_TONE: ProcessStatusTone = 'review'

/** Its word on a feature's stage chip. */
export const PROCESS_ACCEPTED_UNCHECKED_NOTE = 'accepted unchecked'

/** Who carried a step on past, as a line names them. */
export const PROCESS_ACCEPTED_BY: Record<ProcessDecidedBy, string> = {
  person: 'you',
  manager: 'the manager',
  agent: 'an agent',
}

/** How a line about steps accepted unchecked ends. */
export const PROCESS_ACCEPTED_NEVER_PROVEN = 'never proven'

/** The folded `✓ N done` chip's hover, when it holds steps accepted unchecked. */
export const PROCESS_ACCEPTED_UNCHECKED_COUNT = (count: number): string =>
  `${count} ${PROCESS_ACCEPTED_UNCHECKED_LABEL.toLowerCase()}`
