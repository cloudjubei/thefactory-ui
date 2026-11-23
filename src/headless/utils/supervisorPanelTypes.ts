import type { ProcessManagerInterventionCard } from 'thefactory-tools/types'

import type { GetProjectSupervisorResponse, ListStopsResponse } from '../api/generated'
import type { ManagerInterventionStanding } from './managerCardsTypes'

/** A scope's supervisor as its route answers: the switch, what it did, and its fallback model. */
export type SupervisorRecord = GetProjectSupervisorResponse

/** One thing the supervisor did, as its record keeps it. */
export type SupervisorAction = SupervisorRecord['actions'][number]

/** One stop in a scope, with what the supervisor makes of it. */
export type ScopeStop = ListStopsResponse['stops'][number]

/** One thing the supervisor did, as the manager's "Handled" card reads it. */
export interface SupervisorActionView {
  id: string
  at: number
  card: ProcessManagerInterventionCard
  standing: ManagerInterventionStanding
  runId?: string
  projectId?: string
}

/** One answer the supervisor prepared for a stop it hands over. */
export interface SupervisorAnswerView {
  choice: string
  label: string
  note?: string
  recommended: boolean
}

/** A stop the supervisor hands to the person, with its answers ready. */
export interface SupervisorAskView {
  key: string
  runId: string
  rootRunId: string
  projectId: string
  title: string
  /** Where it stopped: the step, else the stop's reason. */
  where: string
  question: string
  /** Best first: the recommended answer, then the others. */
  answers: SupervisorAnswerView[]
  /** Tool calls in the run waiting on an approval. */
  toolAsks: number
}

/** The supervisor panel of one scope. */
export interface SupervisorPanelView {
  enabled: boolean
  switchLabel: string
  switchDetail: string
  /** The model it moves a run to on a credit or rate stop, when one is set. */
  fallbackLine?: string
  /** Newest first. */
  actions: SupervisorActionView[]
  asks: SupervisorAskView[]
}
