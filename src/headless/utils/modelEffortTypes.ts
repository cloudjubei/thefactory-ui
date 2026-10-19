import type { CliReasoningEffort, ModelInfo } from '../api'

/** A CLI model the effort switch reads: its levels, the person's choice and the defaults below it. */
export type CliEffortTarget = {
  runner: 'cli'
  /** The model picked; absent or unlisted, the CLI's own levels apply. */
  modelId?: string
  /** The CLI's models, each with the levels it offers. */
  models: readonly ModelInfo[]
  /** The CLI's own levels, for a model it does not list. */
  cliLevels: readonly string[]
  /** The effort chosen for this chat, activity or run. */
  choice?: string
  /** The default set for the picked model in settings. */
  modelDefault?: string
  /** The default set for the CLI in settings. */
  cliDefault?: string
}

/** An API config the effort switch reads: its model's levels, the choice and the config's default. */
export type ApiEffortTarget = {
  runner: 'api'
  provider?: string
  model?: string
  /** The effort chosen for this chat, activity or run. */
  choice?: string
  /** The config's default effort. */
  configDefault?: string
}

export type ModelEffortTarget = CliEffortTarget | ApiEffortTarget

/** The levels a model offers, the effort chosen of them, and the default that applies without one. */
export type ModelEffortChoice = {
  levels: CliReasoningEffort[]
  /** The choice, while the model offers it. */
  value?: CliReasoningEffort
  /** What runs without a choice, while the model offers it. */
  defaultValue?: CliReasoningEffort
}

/** An effort switch: the model's levels and choice, and how to change it (`undefined` = the default). */
export type ModelEffortSwitch = ModelEffortChoice & {
  onPick: (effort: CliReasoningEffort | undefined) => void
}

/** One model's row in the CLI form's per-model defaults: the levels it offers and its default. */
export type CliModelEffortRow = {
  modelId: string
  label: string
  levels: CliReasoningEffort[]
  /** The model's own default, while it offers it. */
  value?: CliReasoningEffort
}
