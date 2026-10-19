import type { ToolAllocationUnattributedReason } from 'thefactory-tools/types'

export const DAILY_USAGE_UNKNOWN = 'unknown'
export const DAILY_USAGE_NONE = '—'
/** After a figure that leaves some calls out: `$0.50 + unknown`. */
export const DAILY_USAGE_PART_UNKNOWN = '+ unknown'
/** Before a list-price value: an estimate, never a charge. */
export const DAILY_USAGE_ESTIMATE_MARK = '≈'

export const DAILY_USAGE_SOURCE_LABELS: Record<'api' | 'cli', string> = { api: 'API', cli: 'CLI' }

export const DAILY_USAGE_ANOMALY_TITLES: Record<'spike' | 'drop', string> = {
  spike: 'Cache reads up',
  drop: 'Cache reads down',
}

export const DAILY_USAGE_UNATTRIBUTED_LABELS: Record<ToolAllocationUnattributedReason, string> = {
  'no-tool-calls': 'No tool calls',
  'no-metadata': 'Before tool tracking',
  'cli-run-level': 'CLI runs',
}

/** The day ranges a person picks between. */
export const DAILY_USAGE_RANGE_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
] as const

export const DAILY_USAGE_DEFAULT_DAYS = 7

export const DAILY_USAGE_TEXT = {
  title: 'Usage',
  intro:
    'What LLM calls spent each UTC day. Charged is what was billed; unknown is a charge no one stated — a plan can bill overage — never $0. ≈ marks a list-price estimate.',
  total: 'Total',
  rebuild: 'Rebuild',
  reading: 'Reading…',
  empty: 'No usage summarized for these days yet.',
  models: 'By model',
  tools: 'By tool',
  toolsNote: "A tool's share is the spend of the responses that asked for it, not of running it.",
  unattributed: 'Not split by tool',
  anomalies: 'Cache',
  columns: {
    model: 'Model',
    calls: 'Calls',
    charged: 'Charged',
    listValue: 'List value',
    input: 'Input',
    output: 'Output',
    cacheRead: 'Cache read',
    cacheWrite: 'Cache write',
    cacheShare: 'Cache share',
  },
} as const

export const DAILY_USAGE_LOAD_FAILED = 'Could not read usage'
export const DAILY_USAGE_REBUILD_FAILED = 'Could not rebuild usage'
export const DAILY_USAGE_UPDATED_EVENT = 'usage:summaries-updated'
