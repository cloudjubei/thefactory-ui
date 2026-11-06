import type { AccessRecord } from 'thefactory-tools/types'

/** One line of the access trail, as the report and the run page draw it. */
export type AccessRecordRowView = {
  key: string
  /** Who did it, in words. */
  who: string
  /** What they did, as the record stored it. */
  what: string
  /** The project it reached: its name when known, then its id. */
  target: string
  /** The tool or action. */
  tool: string
  /** Why it was allowed. */
  why: string
  /** When, in UTC, the same on every client. */
  when: string
}

/** The access trail when a run recorded any. Absent when it recorded none. */
export type AccessRecordSectionView = {
  title: string
  summary: string
  rows: AccessRecordRowView[]
}

/** A run the trail is read from: itself and, under a story run, the runs it launched. */
export type AccessRecordRun = {
  id: string
  parentRunId?: string
  accessRecords?: readonly AccessRecord[]
}
