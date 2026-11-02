import type { ProcessParkAction, ProcessParkChoice } from 'thefactory-tools/types'

/** One answer a stop offers the person: one of its choices, and what it sends when the manager wrote it. */
export interface ParkAnswerView {
  key: string
  choice: ProcessParkAction
  label: string
  /** What happens, in a line. */
  does: string
  /** Why, or why not, in the manager's words. */
  why?: string
  /** The words it sends with the choice, as the manager wrote them. */
  note?: string
  /** Whom the words go to — the caption above them. */
  noteLabel?: string
  /** The manager's pick. */
  pick: boolean
  /** An ending answer asks first: what the question says, and its button. */
  confirm?: { text: string; label: string }
  /** The stop's own offer behind it — a retry's offer, a proof change's plan. */
  offer: ProcessParkChoice
}

/**
 * A stop's answers as the "Needs you" card lays them out: the one in front,
 * the other answers one click away, and the quiet ones (accept, stop, reject)
 * as links. `fromManager` when the manager wrote them.
 */
export interface ParkAnswersView {
  lead: ParkAnswerView | undefined
  others: ParkAnswerView[]
  minor: ParkAnswerView[]
  fromManager: boolean
}
