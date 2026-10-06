import type { ProcessNeedsYouResolution } from 'thefactory-tools/types'

/** One "Needs you" item as its card shows it. */
export type NeedsYouCard = {
  /** The item's id — `processNeedsYouItemId` of its words. */
  id: string
  /** The item as the report put it — what Discuss quotes. */
  text: string
  /** Its leading phrase, when it leads with one; else the whole item. */
  title: string
  /** The rest of it, when it led with a title. */
  body: string | undefined
  /** Not settled yet: the card offers Discuss and ✓. */
  open: boolean
  /** How it was settled, in a line. */
  outcome: string | undefined
}

/** The "Needs you" section as cards, with the line its header says. */
export type NeedsYouCardsView = {
  cards: NeedsYouCard[]
  /** How many are not settled yet. */
  openCount: number
  summary: string
  /** Something still waits on the reader. */
  attention: boolean
}

/** What a run's sign-off lets its "Needs you" cards do — given by the pipeline that shows them. */
export type RunNeedsYouActions = {
  /** How a person settled the items, by id — the run's own record. */
  resolutions: Readonly<Record<string, ProcessNeedsYouResolution>> | undefined
  /** Open the run's chat with the item quoted, ready to send. */
  onDiscuss: (card: NeedsYouCard) => void
  /** Mark the item fine as it is. */
  onResolve: (card: NeedsYouCard) => void
}
