import type { AccessRecord } from 'thefactory-tools/types'

import { ACCESS_RECORD_COPY } from './accessRecordViewConstants'
import type {
  AccessRecordRowView,
  AccessRecordRun,
  AccessRecordSectionView,
} from './accessRecordViewTypes'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const TEXT_FIELDS = ['who', 'what', 'targetProjectId', 'tool', 'why'] as const

function isAccessRecord(value: unknown): value is AccessRecord {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Partial<AccessRecord>
  if (!TEXT_FIELDS.every((key) => typeof entry[key] === 'string' && entry[key].trim().length > 0)) {
    return false
  }
  return typeof entry.at === 'number' && Number.isFinite(entry.at)
}

function sameAccessRecord(a: AccessRecord, b: AccessRecord): boolean {
  return (
    a.who === b.who &&
    a.what === b.what &&
    a.targetProjectId === b.targetProjectId &&
    a.tool === b.tool &&
    a.why === b.why &&
    a.at === b.at
  )
}

/** When an access record happened, in UTC, so every client shows the same clock. */
export function formatAccessRecordAt(at: number): string {
  if (!Number.isFinite(at)) return ''
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return ''
  const day = date.getUTCDate()
  const month = MONTHS[date.getUTCMonth()] ?? ''
  const year = date.getUTCFullYear()
  const hour = String(date.getUTCHours()).padStart(2, '0')
  const minute = String(date.getUTCMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, ${hour}:${minute} UTC`
}

function whoLabel(who: string): string {
  const known = ACCESS_RECORD_COPY.who[who as keyof typeof ACCESS_RECORD_COPY.who]
  return known ?? who.trim()
}

function targetLabel(id: string, names: Readonly<Record<string, string>> | undefined): string {
  const name = names?.[id]?.trim()
  if (!name || name === id) return id
  return `${name} (${id})`
}

function kept(records: readonly AccessRecord[] | undefined): AccessRecord[] {
  const out: AccessRecord[] = []
  for (const entry of records ?? []) {
    if (!isAccessRecord(entry)) continue
    if (out.some((existing) => sameAccessRecord(existing, entry))) continue
    out.push(entry)
  }
  out.sort((a, b) => a.at - b.at)
  return out
}

/**
 * Access records on `rootId` and every run launched under it, oldest first,
 * without an exact duplicate. A value that is not an access record is left
 * out. With no root, every loaded run is read — a list that has records and
 * no story run to hang them on still shows them. Pure.
 */
export function accessRecordsUnder(
  runs: readonly AccessRecordRun[],
  rootId: string | undefined,
): AccessRecord[] {
  const inTree = new Set<string>()
  if (rootId) {
    inTree.add(rootId)
    let grew = true
    while (grew) {
      grew = false
      for (const run of runs) {
        if (run.parentRunId && inTree.has(run.parentRunId) && !inTree.has(run.id)) {
          inTree.add(run.id)
          grew = true
        }
      }
    }
  }
  const records: AccessRecord[] = []
  for (const run of runs) {
    if (rootId && !inTree.has(run.id)) continue
    records.push(...kept(run.accessRecords))
  }
  return kept(records)
}

/** Project ids to the titles a caller already has, for the target line. */
export function accessRecordProjectNames(
  projects: readonly { id: string; title?: string }[],
): Record<string, string> {
  const names: Record<string, string> = {}
  for (const project of projects) {
    const title = project.title?.trim()
    if (title) names[project.id] = title
  }
  return names
}

/**
 * The access trail as the report and the run page show it. Absent when nothing
 * valid was recorded. Oldest first. Pure.
 */
export function accessRecordSection(
  records: readonly AccessRecord[] | undefined,
  projectNames?: Readonly<Record<string, string>>,
): AccessRecordSectionView | undefined {
  const rows = kept(records)
  if (rows.length === 0) return undefined
  const body: AccessRecordRowView[] = rows.map((entry, index) => ({
    key: `${entry.at}:${entry.tool}:${entry.targetProjectId}:${index}`,
    who: whoLabel(entry.who),
    what: entry.what.trim(),
    target: targetLabel(entry.targetProjectId.trim(), projectNames),
    tool: entry.tool.trim(),
    why: entry.why.trim(),
    when: formatAccessRecordAt(entry.at),
  }))
  return {
    title: ACCESS_RECORD_COPY.title,
    summary: ACCESS_RECORD_COPY.summary(body.length),
    rows: body,
  }
}
