import type { ModelInfo } from '../api'
import type { CliAuthWarning } from './cliRunner'
import type { ModelEffortSwitch } from './modelEffortTypes'

/** An LLM config as the overview model chip lists it — every one, with a key or without. */
export interface ProjectOverviewModelConfig {
  id: string
  name?: string
  provider?: string
  model?: string
  defaultEffort?: string
}

/** What the overview model chip shows for the stored choice. */
export interface ProjectOverviewModelView {
  /** Nothing chosen, or a choice the backend cannot use: its config gone, its CLI switched off. */
  off: boolean
  useCli: boolean
  activeConfig: ProjectOverviewModelConfig | null
  cli: string | null
  cliModelId: string | undefined
  credentialId: string | undefined
  effort: string | undefined
}

/** The overview model as the shared model chip takes it: the choice shown, and how to change it. */
export interface ProjectOverviewModelChipWiring {
  /** True until the stored choice is read; the chip cannot be changed meanwhile. */
  loading: boolean
  off: boolean
  onPickOff: () => void
  configs: ProjectOverviewModelConfig[]
  activeConfig: ProjectOverviewModelConfig | null
  onPickConfig: (llmConfigId: string) => void
  useCli: boolean
  onToggleUseCli: (next: boolean) => void
  enabledClis: string[]
  activeCli: string | null
  onPickCli: (cli: string) => void
  cliModels: ModelInfo[]
  cliModelId: string | undefined
  onPickCliModel: (modelId: string) => void
  authWarning: CliAuthWarning
  effort: ModelEffortSwitch
  /** Why the last switch to API or CLI chose nothing: that side has nothing to choose. */
  switchError: string | null
}
