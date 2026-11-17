import type { ProcessTurnLimit } from 'thefactory-tools/types'

import type { ProcessRetryDefinitionChoice } from './processRetryDefinitionsTypes'

/** A turn-limit switch and slider as a surface renders them, with what the limit means there. */
export interface ProcessTurnLimitView {
  limited: boolean
  maxTurns: number
  label: string
  sliderLabel: string
  hint: string
  min: number
  max: number
}

/** How a retried step starts and the turn limit it runs on, as the person picked them at a park. */
export interface ProcessRetryPick {
  retryMode?: 'continue' | 'fresh'
  turnLimit?: ProcessTurnLimit
  /** At a spend-limit stop: the raise as typed. */
  spendText?: string
  /** At a spend-limit stop: the amount the raise comes to, once it can be used. */
  spendUsd?: number
  /**
   * Which definitions the retry runs, when a newer one is offered.
   * Absent, or `frozen`: the versions this run started with.
   */
  definitions?: ProcessRetryDefinitionChoice
}
