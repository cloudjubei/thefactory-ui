import type { ProcessRun } from 'thefactory-tools/types'
import type { ProcessAgentPauseView } from '../api/generated'

/** Why a step's agent paused, what a person can do, and when — as the run view carries it. */
export type ProcessAgentPause = ProcessAgentPauseView

/** A run as the backend's run view gives it: the run, and its paused agent when one is. */
export type ProcessRunWithPause = ProcessRun & { agentPause?: ProcessAgentPause }

/** What a person can do with a paused agent. */
export type AgentPauseAction = ProcessAgentPause['actions'][number]

/** A paused agent as the person has answered it so far, and what is said once it comes back. */
export type AgentPauseDecisionState = {
  /** The pause the run showed last. */
  pause?: ProcessAgentPause
  /** The action sent and not yet answered by the pause clearing — shown as done meanwhile. */
  pending?: { action: AgentPauseAction; entryId: string; stepId: string }
  /** The step whose agent came back by itself, and when. */
  cleared?: { stepId: string; at: number }
  /** Why the last action was refused. */
  error?: string
}

/** What moves a paused agent's state: the run as read, the person's action, and its answer. */
export type AgentPauseDecisionEvent =
  | { type: 'seen'; pause: ProcessAgentPause | undefined; at: number }
  | { type: 'decide'; action: AgentPauseAction }
  | { type: 'failed'; error: string }
  | { type: 'note-done' }

/** A button a paused step offers. */
export type AgentPauseButton = { action: AgentPauseAction; label: string; title?: string }

/** What the paused step shows under itself. */
export type AgentPauseStepView =
  | {
      kind: 'paused'
      stepId: string
      /** "Paused · computer asleep", on the step's own line. */
      line: string
      headline: string
      body: string
      /** Resume when the session can be carried on, then Retry step. */
      buttons: AgentPauseButton[]
      /** Offered when the run can be stopped; confirmed in place before it is sent. */
      stop?: { label: string; ask: string; confirm: string; keep: string }
      error?: string
    }
  | { kind: 'working'; stepId: string; text: string }
  | { kind: 'cleared'; stepId: string; title: string; text: string }
