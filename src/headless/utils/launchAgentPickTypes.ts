/**
 * The agent a person picked on a launch card for the run about to start —
 * never written back to the chat. Nothing picked means the chat's own agent.
 */
export type LaunchAgentPick = {
  /** The API was picked for the run, over the chat's agent. */
  api: boolean
  /** The CLI picked for the run, when it differs from the chat's. */
  cli?: string
  /** The CLI model picked for the run. */
  model?: string
  /** The login for {@link cli}. */
  credentialId?: string
}

/** What a launch's decision carries about its agent. */
export type LaunchAgentPickMetadata = {
  runner?: 'api' | 'cli'
  cliTool?: string
  cliModel?: string
  cliCredentialId?: string
}

/** What a launch card hands the host's model chip: the run's picks, and how to change them. */
export type LaunchModelChipSlot = {
  /** The model chosen for the run, or `undefined` while it is the chat's. */
  model: string | undefined
  onPick: (modelId: string) => void
  /** The CLI chosen for the run, or `undefined` while it is the chat's. */
  cli: string | undefined
  onPickCli: (cli: string, credentialId: string | undefined, model: string | undefined) => void
  /** The API was chosen for the run, over the chat's CLI. */
  api: boolean
  onPickApi: () => void
}

/** The CLI, model and sign-in an agent's launch asked for. */
export interface LaunchAgentAsked {
  cliTool?: string
  cliModel?: string
  cliCredentialId?: string
}

/** The CLI agent a launch's suggested setup is asked of; none is the API. */
export interface LaunchSuggestionAgent {
  cliTool?: string
  model?: string
  cliCredentialId?: string
}
