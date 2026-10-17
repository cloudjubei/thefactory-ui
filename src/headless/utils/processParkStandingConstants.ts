import type { ProcessResumeChoice, ProcessRunStatus } from 'thefactory-tools/types'

/** What an answer to a park did, as a closing line says it after who gave it. */
export const PROCESS_PARK_ANSWER_WORDS: Record<ProcessResumeChoice, string> = {
  allow: 'allowed it',
  'allow-site': 'allowed it and trusted the site',
  resolved: 'marked it resolved',
  'more-info': 'answered it',
  retry: 'had it tried again',
  continue: 'let it carry on',
  abandon: 'abandoned the run',
  approve: 'approved it',
  'request-changes': 'asked for changes',
  reject: 'rejected it',
  'update-base': 'brought the base in',
  'resolve-base-conflict': 'sent it to resolve the conflict',
  'change-proof': 'changed what proves it',
  'send-to-developer': 'sent it back to the developer',
  recheck: 'ran the checks again',
  'close-unmerged': 'closed the run without merging',
}

/** Who answered a park, as a closing line names them. */
export const PROCESS_PARK_ANSWERED_BY = {
  person: 'you',
  manager: 'the manager',
  runChatAgent: 'the run’s chat agent',
  chatAgent: 'a chat agent',
} as const

/** The line closing what was raised on a park once it was answered. */
export const PROCESS_PARK_HANDLED = (answer: string, at: string): string =>
  `Handled — ${answer} · ${at}`

/** The line closing what was raised on a sign-off once it was decided. */
export const PROCESS_PARK_DECIDED = (answer: string, at: string): string =>
  `Decided — ${answer} · ${at}`

/** The line closing what was raised on a park that went away with no answer recorded, by where the run is now. */
export const PROCESS_PARK_SUPERSEDED: Record<ProcessRunStatus, string> = {
  pending: 'Superseded — the run moved on',
  running: 'Superseded — the run moved on',
  parked: 'Superseded — the run moved on',
  succeeded: 'Superseded — the run finished',
  failed: 'Superseded — the run stopped',
  cancelled: 'Superseded — the run was stopped',
}
