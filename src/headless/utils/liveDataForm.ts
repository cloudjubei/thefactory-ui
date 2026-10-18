import type {
  DataSource,
  DataSourceAdapter,
  DataSourceFetchAdapter,
  DataSourceInput,
  DataSourcePatch,
  DataSourceTaskAdapter,
} from '../api/generated'

/** Flat, string-friendly form state for creating/editing a data source — shared by all clients. */
export interface LiveDataSourceForm {
  /** `task` for a source a project declares: only its schedule is editable. */
  adapterKind: 'fetch' | 'task'
  /** The task source's script and arguments, shown read-only; empty for a fetch source. */
  taskScript: string
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
    adapterKind: 'fetch',
    taskScript: '',
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

export function isTaskAdapter(adapter: DataSourceAdapter): adapter is DataSourceTaskAdapter {
  return 'task' in adapter
}

/** A source a project declares in its `package.json` (`factory.liveData`), run as one of its scripts. */
export function isTaskSource(source: DataSource): boolean {
  return isTaskAdapter(source.adapter)
}

export function sourceToForm(source: DataSource): LiveDataSourceForm {
  const { value, unit } = msToUnit(source.freshness)
  const { adapter } = source
  const task = isTaskAdapter(adapter) ? adapter.task : null
  const fetch = isTaskAdapter(adapter) ? null : adapter.fetch
  return {
    adapterKind: task ? 'task' : 'fetch',
    taskScript: task ? [task.script, ...(task.args ?? [])].join(' ') : '',
    name: source.name,
    recordType: source.recordType,
    freshnessValue: String(value),
    freshnessUnit: unit,
    autoUpdate: source.autoUpdate,
    url: fetch?.url ?? '',
    method: fetch?.method ?? '',
    itemsPath: adapter.itemsPath,
    kind: adapter.kind ?? 'sample',
    mapKey: adapter.map.key,
    mapValue: adapter.map.value ?? '',
    mapTime: adapter.map.time ?? '',
    historyCap: source.historyCap != null ? String(source.historyCap) : '',
  }
}

const FRESHNESS_INVALID = 'Freshness must be a positive number.'

function freshnessMs(form: LiveDataSourceForm): number {
  return Number(form.freshnessValue) * UNIT_MS[form.freshnessUnit]
}

/** Returns the first validation error, or `null` when the form is submittable. */
export function validateSourceForm(form: LiveDataSourceForm): string | null {
  if (form.adapterKind === 'task') {
    const freshness = Number(form.freshnessValue)
    return Number.isFinite(freshness) && freshness > 0 ? null : FRESHNESS_INVALID
  }
  if (!form.name.trim()) return 'Name is required.'
  if (!form.recordType.trim()) return 'Record type is required.'
  if (!/^https?:\/\//i.test(form.url.trim())) return 'Fetch URL must start with http:// or https://'
  if (!form.itemsPath.trim()) return 'Items path is required.'
  if (!form.mapKey.trim()) return 'Map key is required.'
  if (form.kind === 'sample' && !form.mapValue.trim()) {
    return 'A sample source needs a map value path.'
  }
  const freshness = Number(form.freshnessValue)
  if (!Number.isFinite(freshness) || freshness <= 0) return FRESHNESS_INVALID
  return null
}

export function formToSourceInput(
  form: LiveDataSourceForm,
): DataSourceInput & { adapter: DataSourceFetchAdapter } {
  const map: DataSourceFetchAdapter['map'] = { key: form.mapKey.trim() }
  if (form.mapValue.trim()) map.value = form.mapValue.trim()
  if (form.mapTime.trim()) map.time = form.mapTime.trim()

  const input: DataSourceInput & { adapter: DataSourceFetchAdapter } = {
    name: form.name.trim(),
    recordType: form.recordType.trim(),
    freshness: freshnessMs(form),
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

/**
 * The PATCH an edit form saves. A task source accepts only its schedule (`freshness`,
 * `autoUpdate`) — its wiring comes from the project's `package.json` — so only those are sent.
 */
export function formToSourcePatch(form: LiveDataSourceForm): DataSourcePatch {
  if (form.adapterKind === 'task')
    return { freshness: freshnessMs(form), autoUpdate: form.autoUpdate }
  return formToSourceInput(form)
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
