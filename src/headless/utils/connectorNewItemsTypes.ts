import type { ExternalItem } from '../api/generated'

/** What one ticket connection's assigned items hold that the person has not been shown. */
export type ConnectorNewItems = {
  connectionId: string
  /** The connection identity the counts belong to. Marking items seen names it. */
  identityEpoch: string
  /** Items definitely not shown before. */
  newCount: number
  /** Items that may or may not have been shown: never part of `newCount`. */
  uncertainCount: number
  /** When the connection was last read in the background. */
  polledAt?: string
}

/** What of a listed item marks it seen. No ticket content. */
export type ConnectorItemIdentity = Pick<
  ExternalItem,
  'provider' | 'externalId' | 'sourceTenant' | 'sourceItemId'
>

/** A connection's assigned items as listed for the person, and how to mark them seen once shown. */
export type AssignedItemsToShow = {
  items: ExternalItem[]
  /** Mark the listed items seen. Never throws: a refused mark leaves the badge as it was. */
  markShown: () => Promise<void>
}
