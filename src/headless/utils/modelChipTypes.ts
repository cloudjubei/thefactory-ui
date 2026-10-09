/** An LLM config as a model chip reads it. */
export type ModelChipConfigLike = {
  provider?: string
  model?: string
}

/** What a model chip is showing for. */
export type ModelChipLabelInput = {
  /** The provider the caller names, ahead of the active config's. */
  provider?: string
  /** The model the caller names — a CLI model id when {@link useCli}. */
  model?: string
  activeConfig?: ModelChipConfigLike | null
  /** The chat runs on a CLI agent rather than an API model. */
  useCli?: boolean
  activeCli?: string | null
  /** The CLI's models, to name {@link model} by its label. */
  cliModels?: readonly { id: string; label?: string }[]
  /** The chip opens a picker: an empty one invites a choice instead of saying "unknown". */
  editable?: boolean
  /** The CLI's sign-in needs renewing — said in the title. */
  reauthMessage?: string
}

/** A model chip's two lines and the whole of what it shows, for its tooltip and accessible label. */
export type ModelChipLabel = {
  provider: string
  model: string
  title: string
}
