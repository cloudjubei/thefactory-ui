import type { ProcessAnswerInFlight, ProcessAnswersInFlightListener } from './processRunAnswerTypes'

/**
 * The answers to runs' stops that are sent and not answered yet, one per run:
 * while a run has one, {@link begin} refuses any other, so a repeated click
 * sends nothing. Every view of a run reads the same answer, with
 * `useSyncExternalStore`.
 */
export class ProcessRunAnswersInFlight {
  private readonly _answers = new Map<string, ProcessAnswerInFlight>()
  private readonly _listeners = new Set<ProcessAnswersInFlightListener>()

  /** Take `answer` as the one on its way for the run — `false` when it already has one. */
  begin(runId: string, answer: ProcessAnswerInFlight): boolean {
    if (this._answers.has(runId)) return false
    this._answers.set(runId, answer)
    this._emit()
    return true
  }

  /** The run's answer was answered, or refused. */
  end(runId: string): void {
    if (this._answers.delete(runId)) this._emit()
  }

  get(runId: string): ProcessAnswerInFlight | undefined {
    return this._answers.get(runId)
  }

  subscribe = (listener: ProcessAnswersInFlightListener): (() => void) => {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  private _emit(): void {
    for (const listener of this._listeners) listener()
  }
}
