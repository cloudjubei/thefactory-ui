import type { ProcessRun } from 'thefactory-tools/types'
import type { ProcessStatusTone } from './processView'

/** Where a current run sits in the Processes list: what it waits on, or what it is doing. */
export type ProcessRunAttentionSectionId =
  | 'needs-you'
  | 'sign-off'
  | 'running'
  | 'merging'
  | 'waiting'

/** How a section of the Processes list's Current tab is headed. */
export interface ProcessRunAttentionSectionHead {
  id: ProcessRunAttentionSectionId
  label: string
  /** Its count is a numbered badge — the runs wait on the person — rather than a plain count. */
  counted: boolean
  /** The tone its runs' badges carry, which its heading is drawn in. */
  tone: ProcessStatusTone
}

/** One section of the Processes list's Current tab, with its runs in the order given. */
export interface ProcessRunAttentionSection<
  T extends ProcessRun = ProcessRun,
> extends ProcessRunAttentionSectionHead {
  runs: T[]
}

/** A row of the Processes list, arranged for one render. */
export interface ProcessRunListRow {
  /** The run's own title — never its step chain, unless it has no title. */
  title: string
  /** What it needs from the person, what it is doing, or — once it is history — how it ended. */
  line: string
  /** The status dot's tone: the run's badge tone. */
  tone: ProcessStatusTone
  /** The Current section it sits in; absent for a run that is history. */
  section?: ProcessRunAttentionSectionId
  /** The line asks something of the person, so it is drawn emphasised. */
  asks: boolean
  /** Work is going on — running, or merging — so the row shows it is live. */
  live: boolean
  /** Its own chat holds a reply the person has not read: the row carries a dot. */
  fresh: boolean
}
