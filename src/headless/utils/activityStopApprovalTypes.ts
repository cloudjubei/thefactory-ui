import type { ActivityStopCard } from 'thefactory-tools/types'
import type { ToolAskCardView } from './toolAskCardTypes'

/** One fact the stop's card states: its label and the host's value. */
export type ActivityStopFact = { label: string; value: string }

/** One step's progress, in the units the activity reports. */
export type ActivityStopStepRow = { key: string; progress: string; status: string }

/** What the person sees before deciding a stop: the host's facts, never the agent's account. */
export type ActivityStopApprovalView = {
  ask: ToolAskCardView
  /** The card the host raised; absent when the ask carries none this client can read. */
  card?: ActivityStopCard
  facts: ActivityStopFact[]
  steps: ActivityStopStepRow[]
  /** The launch parameters, one line each, as JSON. */
  params: string[]
  /** Why there are no parameters to show, or which were left out. */
  paramsNotes: string[]
  /** Said when the host's facts could not be read. */
  unavailable?: string
}
