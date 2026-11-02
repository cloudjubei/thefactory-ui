import type { ProcessParkAction } from 'thefactory-tools/types'

import { SIGNOFF_REJECT_CONFIRM, SIGNOFF_REJECT_CONFIRM_LABEL } from './signoffPageConstants'

/** The answers shown as quiet links unless the manager picked one: carrying on unchecked, and the endings. */
export const PARK_MINOR_CHOICES: ReadonlySet<ProcessParkAction> = new Set([
  'continue',
  'abandon',
  'reject',
  'close-unmerged',
])

/** The choices an answer in the person's own words goes with, first offered first. */
export const PARK_OWN_ANSWER_CHOICES: readonly ProcessParkAction[] = [
  'more-info',
  'request-changes',
  'send-to-developer',
  'retry',
]

/** Whom an answer's words go to, by its choice. */
export const PARK_ANSWER_NOTE_LABELS: Partial<Record<ProcessParkAction, string>> = {
  delegate: 'Brief for the agent',
  'request-changes': 'Note for the fix',
  'more-info': 'Answer for the agent',
  resolved: 'Answer for the agent',
  allow: 'Answer for the agent',
  'allow-site': 'Answer for the agent',
  'send-to-developer': 'Note for the developer',
  'accept-dropped-change': 'Why it was right',
}

/** The caption of words whose choice names no one in particular. */
export const PARK_ANSWER_NOTE_LABEL = 'Note for the agent'

/** The endings an answer asks about first. */
export const PARK_ANSWER_CONFIRM: Partial<
  Record<ProcessParkAction, { text: string; label: string }>
> = {
  abandon: {
    text: 'Stop this run here? Nothing already brought in is undone, and you can revive it later.',
    label: 'Stop the run',
  },
  reject: { text: SIGNOFF_REJECT_CONFIRM, label: SIGNOFF_REJECT_CONFIRM_LABEL },
}

/** The card's words around the answers. */
export const PARK_ANSWERS_COPY = {
  heading: 'The manager’s answers',
  headingPlain: 'Your choices',
  pick: 'Manager’s pick',
  or: 'Or:',
  also: 'Also:',
  send: 'Send',
  editFirst: 'Edit first',
  ownAnswer: 'Write my own answer',
  askManager: 'Ask the manager',
  needsYou: 'Needs you',
  why: 'Why',
  hideWhy: 'Hide why',
  manager: 'Manager',
  chooseAtTop: 'Choose at the top ↑',
  stoppedHere: 'Stopped here — what happens next is chosen at the top.',
  moreTries: { helps: 'More tries would help', pointless: 'More tries won’t help' },
  retryAsIs: 'Run this step again, on the turn limit set below.',
  answersComing: 'You’ll get its answers to choose from here — nothing to write.',
  cancel: 'Cancel',
} as const
