/** A resource link surfaced from a tool result, with a human label for its chip. */
export interface ToolResultLink {
  link: string
  label: string
}

/**
 * Pull the `overseer://` resource links out of a tool result so an interactive tool preview (F.3) can
 * render each as a clickable chip that routes via `navigateToResource` (F.2). Handles the F.1 generic
 * shapes — `queryProjectData` (`{ records: [...] }`) and `updateProjectRecord` (`{ record }`) — where
 * each record carries a `resourceLink` and a label derived from its content title/name, key, or type.
 * Pure + defensive: any other shape yields `[]`. Deduped by link (first label wins).
 */
export function toolResultResourceLinks(result: unknown): ToolResultLink[] {
  const records = collectRecords(result)
  const out: ToolResultLink[] = []
  const seen = new Set<string>()
  for (const record of records) {
    const link = (record as { resourceLink?: unknown }).resourceLink
    if (typeof link !== 'string' || !link || seen.has(link)) continue
    seen.add(link)
    out.push({ link, label: recordLabel(record) })
  }
  return out
}

function collectRecords(result: unknown): Array<Record<string, unknown>> {
  if (!result || typeof result !== 'object') return []
  const r = result as { records?: unknown; record?: unknown }
  if (Array.isArray(r.records)) {
    return r.records.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
  }
  if (r.record && typeof r.record === 'object') return [r.record as Record<string, unknown>]
  return []
}

function recordLabel(record: Record<string, unknown>): string {
  const content = record.content
  if (content && typeof content === 'object') {
    const c = content as { title?: unknown; name?: unknown }
    if (typeof c.title === 'string' && c.title) return c.title
    if (typeof c.name === 'string' && c.name) return c.name
  }
  if (typeof record.key === 'string' && record.key) return record.key
  if (typeof record.type === 'string' && record.type) return record.type
  return 'record'
}
