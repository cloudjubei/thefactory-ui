import type {
  ProcessDecisionClient,
  ProcessWaitAction,
  ProcessWaitSettledHow,
} from 'thefactory-tools/types'
import type { ProcessStatusTone } from './processView'

/**
 * Where a run's wait for other work stands, as its card says it: on its way to
 * its wait step (`ahead`), parked there (`waiting`), or over (`settled`).
 */
export type ProcessRunWaitState = 'ahead' | 'waiting' | 'settled'

/** One entry the run waits for, as git last read it. */
export interface ProcessRunWaitEntryView {
  label: string
  onBase: boolean
  /** "on dev · by its branch", or why it is not there yet. */
  line: string
}

/** A person's action on the wait the card offers now. */
export interface ProcessRunWaitActionView {
  action: ProcessWaitAction
  label: string
}

/** A run's wait for other work, arranged for its card — the same shape on a run, a leg and a sign-off. */
export interface ProcessRunWaitView {
  state: ProcessRunWaitState
  tone: ProcessStatusTone
  /** "Waits for ZNR-780 to reach dev before its proof", or how it settled: "ZNR-780 reached dev". */
  headline: string
  /** The facts after the headline: since when, that it carries on by itself, when and by whom it settled. */
  meta: string[]
  /** Each entry as git last read it; empty until it was read. */
  entries: ProcessRunWaitEntryView[]
  actions: ProcessRunWaitActionView[]
  /** The note of the person's last action on the wait. */
  note?: string
  /** A person's action is on its way: the card shows its outcome already. */
  pending: boolean
}

/** A person's action on a wait, sent and not answered yet. */
export interface ProcessWaitPending {
  action: ProcessWaitAction
  at: number
}

/** What a group sign-off says of a repo's wait. */
export interface GroupSignOffRepoWait {
  waitsFor: string[]
  waitingOn: string[]
  since?: number
  settled?: ProcessWaitSettledHow
}

/** What the confirm before an action on a wait says. */
export interface ProcessWaitConfirmView {
  title: string
  body: string
  confirm: string
  cancel: string
  noteLabel: string
  notePlaceholder: string
}

/** What a person's action on a wait sends. */
export interface ProcessWaitActionBody {
  decidedVia: ProcessDecisionClient
  note?: string
}
