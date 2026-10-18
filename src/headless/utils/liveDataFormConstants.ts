export const LIVE_DATA_TASK_SOURCE_NOTE =
  'Declared in the project’s package.json. Only its schedule can change here.'

export const LIVE_DATA_FORM_LABELS = {
  name: 'Name',
  script: 'Script',
  freshness: 'Freshness',
  unit: 'Unit',
  autoUpdate: 'Auto-update on a schedule',
} as const

export const LIVE_DATA_FRESHNESS_UNITS = ['minutes', 'hours', 'days'] as const
