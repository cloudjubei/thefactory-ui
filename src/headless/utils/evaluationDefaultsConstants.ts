/** The project metadata key the defaults are kept under. */
export const EVALUATION_DEFAULTS_METADATA_KEY = 'evaluationDefaults'

/** The value a choice takes while it is not set. */
export const EVALUATION_DEFAULT_NONE = '__none__'

/** The project editor's evaluation defaults copy. */
export const EVALUATION_DEFAULTS_COPY = {
  title: 'Evaluation defaults',
  hint: 'Used when an evaluation launch leaves a setting out.',
  none: 'None set — tab defaults apply',
  tabDefault: (value: string) => `${value} (tab default)`,
  stageNone: 'None — the agent names it',
  focusNone: 'None picked — every capability',
  fixturesNone: 'None picked — every fixture',
  concurrencyHint: (max: number) => `1 to ${max}`,
  concurrencyError: (max: number) => `Concurrency must be a whole number from 1 to ${max}.`,
  modelKinds: { host: 'Host default', cli: 'CLI', api: 'API config' },
  cliLabel: 'CLI',
  cliPlaceholder: 'Pick a CLI',
  modelIdLabel: 'Model id',
  modelIdPlaceholder: 'Its default model',
  llmConfigLabel: 'API config id',
  llmConfigPlaceholder: 'API config id',
  clear: 'Clear defaults',
} as const
