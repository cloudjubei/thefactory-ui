import { SUPERSEDED_FILINGS_LABEL } from './supersededFilingsConstants'
import type { FilingSupersededBy } from './supersededFilingsTypes'

const KIND_WORDS: Record<string, readonly [string, string]> = {
  screenshot: ['screenshot', 'screenshots'],
  recording: ['recording', 'recordings'],
  report: ['report', 'reports'],
  log: ['log', 'logs'],
  file: ['file', 'files'],
  trace: ['trace', 'traces'],
}

/**
 * The attempt that replaced this filing, when a fresh retry marked it
 * superseded. Anything else — no mark, a blank id — is current. A carry-on
 * retry never sets the mark, so its filings stay current.
 */
export function filingSupersededBy(ref: object): FilingSupersededBy | undefined {
  if (!('supersededBy' in ref)) return undefined
  const mark = (ref as { supersededBy?: unknown }).supersededBy
  if (!mark || typeof mark !== 'object') return undefined
  const attemptId = (mark as { attemptId?: unknown }).attemptId
  if (typeof attemptId !== 'string') return undefined
  const id = attemptId.trim()
  return id ? { attemptId: id } : undefined
}

/** Whether a filing was replaced by a later try. */
export function isSupersededFiling(ref: object): boolean {
  return filingSupersededBy(ref) !== undefined
}

function createdAtOf(ref: object): number {
  const at = (ref as { createdAt?: unknown }).createdAt
  return typeof at === 'number' ? at : 0
}

/**
 * Current filings, in the order they were given, then the ones a later try
 * replaced, newest first. Callers show the current list and fold the second.
 */
export function partitionFilings<T extends { ref: object }>(
  items: readonly T[],
): { current: T[]; superseded: T[] } {
  const current: T[] = []
  const superseded: T[] = []
  for (const item of items) {
    if (isSupersededFiling(item.ref)) superseded.push(item)
    else current.push(item)
  }
  superseded.sort((a, b) => createdAtOf(b.ref) - createdAtOf(a.ref))
  return { current, superseded }
}

function kindWord(kind: string, count: number): string {
  const words = KIND_WORDS[kind]
  if (!words) return count === 1 ? kind : `${kind}s`
  return count === 1 ? words[0] : words[1]
}

/** "1 report · 1 screenshot" — what the collapsed row says is inside, in list order. */
export function supersededFilingsSummary(filings: readonly { ref: { kind: string } }[]): string {
  const counts = new Map<string, number>()
  const order: string[] = []
  for (const filing of filings) {
    if (!counts.has(filing.ref.kind)) order.push(filing.ref.kind)
    counts.set(filing.ref.kind, (counts.get(filing.ref.kind) ?? 0) + 1)
  }
  return order
    .map((kind) => `${counts.get(kind)} ${kindWord(kind, counts.get(kind) ?? 0)}`)
    .join(' · ')
}

/** The collapsed row: the label, then what it holds. */
export function supersededFilingsHeading(filings: readonly { ref: { kind: string } }[]): string {
  const summary = supersededFilingsSummary(filings)
  return summary ? `${SUPERSEDED_FILINGS_LABEL} · ${summary}` : SUPERSEDED_FILINGS_LABEL
}
