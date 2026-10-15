import type { ChatContext } from '../api'
import type { RunModel } from './runModel'
import type { LaunchAgentPick, LaunchModelChipSlot } from './launchAgentPickTypes'

/** A change of the run's model waiting for the step at work, as the run's header names it. */
export type RunModelPending = {
  /** What the agent at work runs on. */
  from: string
  /** What the next step runs on. */
  to: string
}

/** The run's model chip: what the run runs on, whether it can change, and when a change applies. */
export type RunModelChipView = {
  /** What the run's next steps run on; absent when its launch named nothing. */
  model: RunModel | undefined
  /** The run has not ended, so its model can still change. */
  editable: boolean
  /** A change made while an agent was at work, waiting for its step to finish. */
  pending?: RunModelPending
  /** When a change reaches the run's agents, as the chip's picker says it. */
  note: string
  /** What the run runs on now, as the chooser chip shows it. */
  pick: LaunchAgentPick
}

/** What a change of the run's model sends: the side, and the CLI, model and login picked. */
export type RunModelChangeBody = {
  runner: 'api' | 'cli'
  cliTool?: string
  cliModel?: string
  cliCredentialId?: string
}

/** What a run's page hands the host's chooser chip: the run's picks and how to change them. */
export type RunModelChipSlot = LaunchModelChipSlot & {
  /** The chat the chip reads the CLIs and their logins through — the run's own. */
  chatContext: ChatContext
  /** When a pick takes effect, for the chip's picker. */
  note: string
}
