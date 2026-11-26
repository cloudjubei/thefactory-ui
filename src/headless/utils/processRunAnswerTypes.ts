import type { ProcessResumeChoice, ProcessRun } from 'thefactory-tools/types'

/** An answer to a run's stop, sent and not answered by the host yet. */
export interface ProcessAnswerInFlight {
  choice: ProcessResumeChoice
  /** With `retry`: the way on the stopped step offered that the person chose. */
  recovery?: string
  /** The stop it answers, by when the run stopped there. */
  parkedAt?: number
}

/** An answer on its way, with the run as it stood at the stop it answers. */
export interface ProcessRunAnswering<
  T extends ProcessRun = ProcessRun,
> extends ProcessAnswerInFlight {
  stopped: T
}

/** Hears that an answer started or ended. */
export type ProcessAnswersInFlightListener = () => void
