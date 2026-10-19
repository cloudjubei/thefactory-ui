import type { CliReasoningEffort } from '../api'

/** Every effort level, least to most. */
export const EFFORT_LEVELS: readonly CliReasoningEffort[] = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
]

/** Each level as the switch names it. */
export const EFFORT_LEVEL_LABELS: Record<CliReasoningEffort, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'X-high',
  max: 'Max',
}

/** The switch's heading. */
export const EFFORT_SWITCH_LABEL = 'Effort'

/** The switch's option that leaves the effort to the default. */
export const EFFORT_DEFAULT_LABEL = 'Default'

/** A settings field's option that sets no default. */
export const EFFORT_NONE_LABEL = 'None'

/** The LLM config form's default-effort field. */
export const LLM_CONFIG_DEFAULT_EFFORT_LABEL = 'Default effort'

/** What the default-effort field sets. */
export const LLM_CONFIG_DEFAULT_EFFORT_HINT =
  'Used when a chat, run or activity picks no effort of its own.'

/** The CLI form's per-model default-effort field. */
export const CLI_MODEL_DEFAULT_EFFORT_LABEL = 'Default effort per model'

/** What the per-model field sets. */
export const CLI_MODEL_DEFAULT_EFFORT_HINT =
  'Over the CLI’s default, for the models that offer effort.'

/** The select value standing for no default (a select cannot hold an empty value). */
export const EFFORT_NONE_VALUE = '__none__'
