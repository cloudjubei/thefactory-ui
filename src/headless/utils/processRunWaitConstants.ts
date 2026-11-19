import type {
  ProcessWaitAction,
  ProcessWaitForHow,
  ProcessWaitSettledHow,
} from 'thefactory-tools/types'
import type { ProcessStatusTone } from './processView'

/** The tone of a wait that is still open: queued, like work that carries on by itself. */
export const PROCESS_RUN_WAIT_TONE: ProcessStatusTone = 'queued'

/** The longest note a person's action on a wait takes. */
export const PROCESS_WAIT_NOTE_MAX_CHARS = 2000

/** What a run's wait for other work says, on a run, a leg, a sign-off and a list row alike. */
export const PROCESS_RUN_WAIT_COPY = {
  label: 'Waiting',
  waits: (labels: string, base: string) => `Waits for ${labels} to reach ${base} before its proof`,
  since: (at: string) => `since ${at}`,
  carriesOn: 'carries on by itself',
  at: (at: string) => `at ${at}`,
  by: (who: string) => `by ${who}`,
  onBase: (base: string, how: string) => `on ${base} · by its ${how}`,
  reached: (labels: string, base: string) => `${labels} reached ${base}`,
  continued: 'Continued without waiting',
  dropped: 'Stopped waiting',
  base: 'the base branch',
  separator: ' · ',
  stepWaiting: 'Waiting on other work',
  target: (kind: string, value: string) => `${kind} ${value}`,
} as const

/** How an entry was found on the base, in the words after "by its". */
export const PROCESS_WAIT_HOW_WORDS: Record<ProcessWaitForHow, string> = {
  branch: 'branch',
  commit: 'commit',
  'pull-request': 'merged pull request',
}

/** What each settled wait's card is toned. */
export const PROCESS_WAIT_SETTLED_TONE: Record<ProcessWaitSettledHow, ProcessStatusTone> = {
  'on-base': 'done',
  continued: 'empty',
  dropped: 'empty',
}

/** The button for each action on a wait. */
export const PROCESS_WAIT_ACTION_LABELS: Record<ProcessWaitAction, string> = {
  'continue-now': 'Continue now',
  'stop-waiting': 'Stop waiting',
  'wait-again': 'Wait again',
}

/** How a person's action settles the wait it acts on; Wait again opens it. */
export const PROCESS_WAIT_ACTION_SETTLES: Record<
  ProcessWaitAction,
  Exclude<ProcessWaitSettledHow, 'on-base'> | undefined
> = {
  'continue-now': 'continued',
  'stop-waiting': 'dropped',
  'wait-again': undefined,
}

/** What the confirm before each action on a wait says. */
export const PROCESS_WAIT_CONFIRM_COPY = {
  'continue-now': {
    title: 'Continue now?',
    body: (labels: string, base: string) =>
      `Carries on without waiting for ${labels}: brings ${base} in, checks again, then the proof.`,
  },
  'stop-waiting': {
    title: 'Stop waiting?',
    body: (labels: string) => `Goes on to the proof without ${labels}. Nothing is brought in.`,
  },
  'wait-again': {
    title: 'Wait again?',
    body: (labels: string, base: string) =>
      `Waits for ${labels} to reach ${base} again before the proof.`,
  },
  cancel: 'Cancel',
  noteLabel: 'Note (optional)',
  notePlaceholder: 'Why, for the record',
} as const
