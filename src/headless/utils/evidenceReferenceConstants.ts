import type { ReviewEvidenceKind } from '../api/generated'
import type { ProcessStatusTone } from './processView'

/** Every word an evidence chip, its preview and its view say. */
export const EVIDENCE_REFERENCE_COPY = {
  evidence: 'Evidence',
  issue: 'Run-through issue',
  happened: 'Happened',
  where: 'Where',
  from: 'From',
  open: 'Open',
  openScreenshot: 'Open screenshot',
  play: 'Play',
  playAt: (time: string) => `Play ${time}`,
  inRecording: (time: string) => `${time} in the recording`,
  openedAt: 'Opened at',
  recording: 'Recording',
  notKept: 'not kept',
  goneTitle: 'No longer kept',
  goneWhy: 'Why',
  goneReason: 'Cleared with the run it came from.',
  goneBody: 'This item was cleared with the run it came from. The text that cited it is unchanged.',
  citedAs: 'Cited as',
  failedTitle: 'Can’t be shown right now',
  failedBody: 'It could not be read. Try again in a moment.',
  loading: 'Loading…',
  copyReference: 'Copy reference',
  copied: 'Copied',
  back: 'Back',
} as const

/** What a filed item is called over its title, by its kind. */
export const EVIDENCE_KIND_CAPTION: Record<ReviewEvidenceKind, string> = {
  screenshot: 'Screenshot',
  recording: 'Recording',
  report: 'Report',
  log: 'Log',
  file: 'File',
  trace: 'Trace',
}

/** An issue's severity as a pill's tone — the run-through tab's colours. */
export const EVIDENCE_SEVERITY_TONE: Record<
  'blocker' | 'major' | 'minor' | 'nit',
  ProcessStatusTone
> = {
  blocker: 'stuck',
  major: 'stuck',
  minor: 'working',
  nit: 'empty',
}

/** How many evidence items one session keeps read. */
export const EVIDENCE_REFERENCE_CAPACITY = 200

/** A held item is read again this long before its media grant runs out. */
export const EVIDENCE_REFERENCE_RENEW_BEFORE_MS = 30_000

/** How many characters of an item's id a citation that names it shows. */
export const EVIDENCE_REFERENCE_SHORT_ID = 8
