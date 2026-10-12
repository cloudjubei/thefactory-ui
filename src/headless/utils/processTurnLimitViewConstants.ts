/** The slider's label wherever a run's turn limit is set. */
export const PROCESS_TURN_LIMIT_SLIDER_LABEL = 'Max turns per step agent'

/** The run's turn limit as its head names it. */
export const PROCESS_TURN_LIMIT_CHIP = (limited: boolean, maxTurns: number): string =>
  limited ? `${maxTurns} turns per agent` : 'No turn limit'

export const PROCESS_TURN_LIMIT_EDIT_LABEL = 'Change the turn limit'

export const PROCESS_TURN_LIMIT_SAVE_LABEL = 'Use this limit'

/** The heading over how a retried step's agent starts. */
export const PROCESS_RETRY_MODE_HEADING = 'When it runs again'
