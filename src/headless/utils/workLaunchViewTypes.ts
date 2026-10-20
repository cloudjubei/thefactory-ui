import type { ProcessTurnLimit, WorkLaunchMode } from 'thefactory-tools/types'

/** How a person chose to start work: a process run with the launch card's picks, or in a chat. */
export interface WorkLaunchChoice {
  mode: WorkLaunchMode
  /** The launch card's picks (process), or the agent picked for the chat (chat). */
  decision?: Record<string, unknown>
}

/** One way to start work, as the choice shows it. */
export interface WorkLaunchOptionView {
  mode: WorkLaunchMode
  label: string
  hint: string
  /** Offered first: the way work last started in the project. */
  preselected: boolean
}

/** One setting an agent suggested for a process run, as the launch card lists it. */
export interface LaunchSuggestionRow {
  key:
    | 'processId'
    | 'featureProcessId'
    | 'proofKinds'
    | 'codeReview'
    | 'turnLimit'
    | 'model'
    | 'baseBranch'
  label: string
  value: string
  reason: string
}

/** What applying a suggestion sets on the launch card: each pick it proposed. */
export interface LaunchSuggestionPicks {
  processId?: string
  featureProcessId?: string
  baseBranch?: string
  model?: string
  turnLimit?: { limited: boolean; maxTurns: number }
}

/** What a "start work" acts on: a story, a feature of it, or a feature request's placed work. */
export interface StartWorkTarget {
  projectId: string
  storyId: string
  /** Only these of the story's pending features — a feature's own Run. */
  featureIds?: readonly string[]
  /** The feature request whose work this is — accepted, or started again. */
  request?: { id: string; again: boolean }
  /**
   * The process the work runs by, decided before the start opened: no choice of a process run or
   * the chat, and the launch card keeps this process — the person picks the agent.
   */
  processId?: string
}

/** Where a start went, for the host to open. */
export type StartWorkOutcome =
  | { mode: 'chat'; chatContextId: string }
  | { mode: 'process'; processRunId?: string; chatContextId?: string }

/** A launch card as it stands, for an agent to suggest its setup from. */
export interface LaunchSuggestionInput {
  projectId: string | undefined
  storyId: string | undefined
  featureIds?: readonly string[]
  processId?: string
  featureProcessId?: string
  baseBranch?: string
  /** The side the run works on; the suggestion is asked of the same agent. */
  runner: 'api' | 'cli'
  /** The CLI picked on the card, when the run works on one. */
  cliTool?: string
  model?: string
  /** The CLI sign-in picked on the card. */
  cliCredentialId?: string
  /** The chat the card is shown in; its agent is the one asked. */
  chatContextId?: string
  models?: readonly string[]
  turnLimit?: ProcessTurnLimit
}

/** What asking for a suggested setup sends. */
export interface LaunchSuggestionBody {
  projectId: string
  storyId: string
  runner: 'api' | 'cli'
  featureIds?: string[]
  processId?: string
  featureProcessId?: string
  baseBranch?: string
  cliTool?: string
  model?: string
  cliCredentialId?: string
  chatContextId?: string
  models?: string[]
  turnLimit?: ProcessTurnLimit
}
