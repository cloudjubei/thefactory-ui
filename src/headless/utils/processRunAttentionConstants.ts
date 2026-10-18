import { PROCESS_RUN_WORDS } from './processViewConstants'
import type { ProcessRunAttentionSectionHead } from './processRunAttentionTypes'

/** The Current tab's sections, in the order they are drawn, each in the tone its runs' badges carry. */
export const PROCESS_RUN_ATTENTION_SECTIONS: readonly ProcessRunAttentionSectionHead[] = [
  { id: 'needs-you', label: PROCESS_RUN_WORDS.needsYou, counted: true, tone: 'on_hold' },
  { id: 'sign-off', label: PROCESS_RUN_WORDS.signOff, counted: true, tone: 'review' },
  { id: 'running', label: PROCESS_RUN_WORDS.running, counted: false, tone: 'running' },
  { id: 'merging', label: PROCESS_RUN_WORDS.merging, counted: false, tone: 'working' },
  { id: 'waiting', label: PROCESS_RUN_WORDS.waiting, counted: false, tone: 'queued' },
]

/** The verb each kind of need opens with. */
export const PROCESS_RUN_NEED_VERBS = {
  answer: 'Answer',
  approve: 'Approve',
  unblock: 'Unblock',
  decide: 'Decide',
  retry: 'Retry',
  sendBack: 'Send back',
} as const

/** What a permission asks for, by the kind of request — after "Approve:". */
export const PROCESS_RUN_NEED_PERMISSIONS: Readonly<
  Record<string, (request: { host?: string; packageName?: string; url?: string }) => string>
> = {
  'network-unlock': (r) => `network access to ${r.host ?? 'a host'}`,
  'install-package': (r) => `install ${r.packageName ?? 'a package'}`,
  'external-fetch': (r) => `fetch ${r.url ?? 'a page'}`,
  'workspace-limit-raise': () => 'more workspace space',
}

/** How a stopped step's decision is said, by why the run stopped — after "Decide:". */
export const PROCESS_RUN_NEED_DECISIONS = {
  'step-failed': (step: string) => `${step} did not pass`,
  'loop-exhausted': (step: string) => `${step} kept failing`,
  'step-errored': (step: string) => `${step} did not complete`,
  'step-unchecked': (step: string) => `${step} checked nothing`,
  'turn-limit': (step: string) => `${step} ran out of turns`,
  'budget-spent': () => 'the budget is spent',
  'time-spent': () => 'the time limit is up',
} as const

/** A step that failed more than once, said with how often. */
export const PROCESS_RUN_NEED_FAILED_TIMES = (times: number, step: string): string =>
  `failed ${times === 2 ? 'twice' : `${times} times`} on ${step}`

/** A park on a conflict with the base branch — after "Decide:". */
export const PROCESS_RUN_NEED_BASE_CONFLICT = (baseRef: string): string =>
  `conflicts with ${baseRef}`

/** What trying again means when approved work did not come in — after "Retry:". */
export const PROCESS_RUN_NEED_NOT_MERGED = {
  git: (baseRef: string) => `not merged into ${baseRef}`,
  pullRequest: 'the pull request was not opened',
  shadow: 'not brought into the project folder',
} as const

/** Asks waiting in the run's own chat — after "Answer:". */
export const PROCESS_RUN_NEED_CHAT_ASKS = (count: number): string =>
  count === 1 ? 'a card in its chat' : `${count} cards in its chat`

/** A request for changes with no words of its own — after "Send back:". */
export const PROCESS_RUN_NEED_SEND_BACK_NO_NOTE = 'your requested changes'

/** How the sign-off's evidence is summed up on a row. */
export const PROCESS_RUN_NEED_SIGN_OFF = {
  checks: (passed: number, total: number) => `Checks ${passed}/${total}`,
  review: {
    approved: 'review clean',
    'changes-requested': 'review asks for changes',
    rejected: 'review rejects it',
  },
  ready: 'Ready for your decision',
} as const

/** A step on its second or later attempt. */
export const PROCESS_RUN_NEED_ATTEMPT = (attempt: number): string => `attempt ${attempt}`

/** What a count of runs waiting on the person says on hover. */
export const PROCESS_RUN_WAITING_TITLE = (count: number): string =>
  `${count} ${count === 1 ? 'run waits' : 'runs wait'} on you`

/** What a row's dot says: its run's own chat holds a reply the person has not read. */
export const PROCESS_RUN_FRESH_TITLE = 'Its chat has a reply you have not read'
