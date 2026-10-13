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

/** What a chat's model chip reads to show its CLI side: the chat's binding, the clients' CLI settings, and a run's own picks. */
export type ChatChipCliInput = {
  /** The chat's CLI binding, when it runs on one. */
  cliRunner?: { tool: string; model?: string; credentialId?: string } | null
  activeCli: string | null
  activeCliCredentialId: string | null
  defaultModel: Readonly<Record<string, string | undefined>>
  /** The model picked for a run about to start, shown in place of the chat's. */
  overrideModel?: string
  /** The CLI picked for a run about to start, shown in place of the chat's. */
  overrideCli?: string
  /** The API was picked for a run about to start, over the chat's CLI. */
  overrideApi?: boolean
}

/** The CLI side a chat's model chip shows. */
export type ChatChipCliSelection = {
  useCli: boolean
  selectedCli: string | null
  selectedCliModelId: string | undefined
  credentialId: string | undefined
}
