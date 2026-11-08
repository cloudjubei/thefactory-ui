import type {
  ExternalItem,
  ListConnectionNewItemsResponse,
  MarkConnectionItemsSeenData,
  MarkConnectionItemsSeenResponse,
} from '../headless/api/generated/types.gen'
import { FAKE_AT } from './fixtures/stamps'
import {
  FAKE_ASSIGNED_TICKETS,
  FAKE_TICKET_CONNECTION,
  FAKE_TICKET_IDENTITY_EPOCH,
} from './fixtures/ticketConnections'

type SeenItem = MarkConnectionItemsSeenData['body']['items'][number]

const keyOf = ({ provider, externalId, sourceTenant }: SeenItem): string =>
  JSON.stringify([provider, sourceTenant ?? '', externalId])

/**
 * The fake's ticket connection and which of its assigned tickets the person was
 * shown: every one is new until marked seen. One per route table, so each fake
 * server starts with the badge showing.
 */
export class FakeTicketInbox {
  private readonly _seen = new Set<string>()

  newItems(): ListConnectionNewItemsResponse {
    return [this._counts()]
  }

  assigned(connectionId: string): ExternalItem[] | undefined {
    return connectionId === FAKE_TICKET_CONNECTION.id ? FAKE_ASSIGNED_TICKETS : undefined
  }

  /** The counts after `items` are marked seen; `undefined` for a connection or identity it does not hold. */
  markSeen(
    connectionId: string,
    identityEpoch: string,
    items: readonly SeenItem[],
  ): MarkConnectionItemsSeenResponse | undefined {
    if (connectionId !== FAKE_TICKET_CONNECTION.id) return undefined
    if (identityEpoch !== FAKE_TICKET_IDENTITY_EPOCH) return undefined
    const held = new Set(FAKE_ASSIGNED_TICKETS.map(keyOf))
    for (const key of items.map(keyOf)) if (held.has(key)) this._seen.add(key)
    return this._counts()
  }

  private _counts(): MarkConnectionItemsSeenResponse {
    return {
      connectionId: FAKE_TICKET_CONNECTION.id,
      identityEpoch: FAKE_TICKET_IDENTITY_EPOCH,
      newCount: FAKE_ASSIGNED_TICKETS.filter((item) => !this._seen.has(keyOf(item))).length,
      uncertainCount: 0,
      polledAt: FAKE_AT,
    }
  }
}
