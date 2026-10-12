import type { ProcessTurnLimit } from 'thefactory-tools/types'

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
}
