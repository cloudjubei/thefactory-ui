import type { DataSource, DataSourceInput } from '../api/generated'

/** Flat, string-friendly form state for creating/editing a data source — shared by all clients. */
export interface LiveDataSourceForm {
  name: string
  recordType: string
  freshnessValue: string
  freshnessUnit: 'minutes' | 'hours' | 'days'
  autoUpdate: boolean
  url: string
  method: string
  itemsPath: string
  kind: 'sample' | 'snapshot'
  mapKey: string
  mapValue: string
  mapTime: string
  historyCap: string
}

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
const UNIT_MS: Record<LiveDataSourceForm['freshnessUnit'], number> = {
  minutes: MINUTE_MS,
  hours: HOUR_MS,
  days: DAY_MS,
}

export function emptySourceForm(): LiveDataSourceForm {
  return {
    name: '',
    recordType: '',
    freshnessValue: '1',
    freshnessUnit: 'days',
    autoUpdate: true,
    url: '',
    method: '',
    itemsPath: '',
    kind: 'sample',
    mapKey: '',
    mapValue: '',
    mapTime: '',
    historyCap: '',
  }
}

/** Split a freshness in ms into the largest whole unit (days → hours → minutes). */
function msToUnit(ms: number): { value: number; unit: LiveDataSourceForm['freshnessUnit'] } {
  if (ms > 0 && ms % DAY_MS === 0) return { value: ms / DAY_MS, unit: 'days' }
  if (ms > 0 && ms % HOUR_MS === 0) return { value: ms / HOUR_MS, unit: 'hours' }
  return { value: Math.max(1, Math.round(ms / MINUTE_MS)), unit: 'minutes' }
}

export function sourceToForm(source: DataSource): LiveDataSourceForm {
  const { value, unit } = msToUnit(source.freshness)
  const { adapter } = source
  return {
    name: source.name,
    recordType: source.recordType,
    freshnessValue: String(value),
    freshnessUnit: unit,
    autoUpdate: source.autoUpdate,
    url: adapter.fetch.url,
    method: adapter.fetch.method ?? '',
    itemsPath: adapter.itemsPath,
    kind: adapter.kind ?? 'sample',
    mapKey: adapter.map.key,
    mapValue: adapter.map.value ?? '',
    mapTime: adapter.map.time ?? '',
    historyCap: source.historyCap != null ? String(source.historyCap) : '',
  }
}

/** Returns the first validation error, or `null` when the form is submittable. */
export function validateSourceForm(form: LiveDataSourceForm): string | null {
  if (!form.name.trim()) return 'Name is required.'
  if (!form.recordType.trim()) return 'Record type is required.'
  if (!/^https?:\/\//i.test(form.url.trim())) return 'Fetch URL must start with http:// or https://'
  if (!form.itemsPath.trim()) return 'Items path is required.'
  if (!form.mapKey.trim()) return 'Map key is required.'
  if (form.kind === 'sample' && !form.mapValue.trim()) {
    return 'A sample source needs a map value path.'
  }
  const freshness = Number(form.freshnessValue)
  if (!Number.isFinite(freshness) || freshness <= 0) return 'Freshness must be a positive number.'
  return null
}

export function formToSourceInput(form: LiveDataSourceForm): DataSourceInput {
  const map: DataSourceInput['adapter']['map'] = { key: form.mapKey.trim() }
  if (form.mapValue.trim()) map.value = form.mapValue.trim()
  if (form.mapTime.trim()) map.time = form.mapTime.trim()

  const input: DataSourceInput = {
    name: form.name.trim(),
    recordType: form.recordType.trim(),
    freshness: Number(form.freshnessValue) * UNIT_MS[form.freshnessUnit],
    autoUpdate: form.autoUpdate,
    adapter: {
      fetch: {
        url: form.url.trim(),
        ...(form.method.trim() ? { method: form.method.trim() } : {}),
      },
      itemsPath: form.itemsPath.trim(),
      kind: form.kind,
      map,
    },
  }
  if (form.historyCap.trim()) {
    const cap = Number(form.historyCap)
    if (Number.isFinite(cap) && cap > 0) input.historyCap = Math.round(cap)
  }
  return input
}

/** Compact freshness label, e.g. `1d`, `6h`, `30m`. */
export function humanizeMs(ms: number): string {
  if (ms % DAY_MS === 0) return `${ms / DAY_MS}d`
  if (ms % HOUR_MS === 0) return `${ms / HOUR_MS}h`
  return `${Math.max(1, Math.round(ms / MINUTE_MS))}m`
}

/** A source is fresh when it refreshed within its `freshness` window. */
export function isSourceFresh(source: DataSource, now: number = Date.now()): boolean {
  if (!source.lastRefreshedAt) return false
  return now - new Date(source.lastRefreshedAt).getTime() < source.freshness
}
