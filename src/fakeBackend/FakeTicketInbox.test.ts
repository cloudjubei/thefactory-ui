import { describe, expect, it } from 'vitest'
import { FakeTicketInbox } from './FakeTicketInbox'
import {
  FAKE_ASSIGNED_TICKETS,
  FAKE_TICKET_CONNECTION,
  FAKE_TICKET_IDENTITY_EPOCH,
} from './fixtures/ticketConnections'

const ID = FAKE_TICKET_CONNECTION.id
const identityOf = ({
  provider,
  externalId,
  sourceTenant,
  sourceItemId,
}: (typeof FAKE_ASSIGNED_TICKETS)[number]) => ({
  provider,
  externalId,
  ...(sourceTenant ? { sourceTenant } : {}),
  ...(sourceItemId ? { sourceItemId } : {}),
})

describe('FakeTicketInbox', () => {
  it('counts every assigned ticket as new before any is shown', () => {
    expect(new FakeTicketInbox().newItems()).toEqual([
      {
        connectionId: ID,
        identityEpoch: FAKE_TICKET_IDENTITY_EPOCH,
        newCount: FAKE_ASSIGNED_TICKETS.length,
        uncertainCount: 0,
        polledAt: expect.any(String),
      },
    ])
  })

  it('holds more than one new ticket, so the badge shows a count', () => {
    expect(new FakeTicketInbox().newItems()[0]?.newCount).toBeGreaterThan(1)
  })

  it('lists the connection’s assigned tickets, and none for a connection it does not hold', () => {
    const inbox = new FakeTicketInbox()
    expect(inbox.assigned(ID)).toEqual(FAKE_ASSIGNED_TICKETS)
    expect(inbox.assigned('other')).toBeUndefined()
  })

  it('takes the tickets marked seen out of the count, and only those', () => {
    const inbox = new FakeTicketInbox()
    const [first] = FAKE_ASSIGNED_TICKETS
    const counts = inbox.markSeen(ID, FAKE_TICKET_IDENTITY_EPOCH, [identityOf(first!)])
    expect(counts?.newCount).toBe(FAKE_ASSIGNED_TICKETS.length - 1)
    expect(inbox.newItems()[0]?.newCount).toBe(FAKE_ASSIGNED_TICKETS.length - 1)
  })

  it('clears the badge once every listed ticket is marked seen', () => {
    const inbox = new FakeTicketInbox()
    inbox.markSeen(ID, FAKE_TICKET_IDENTITY_EPOCH, FAKE_ASSIGNED_TICKETS.map(identityOf))
    expect(inbox.newItems()[0]).toMatchObject({ newCount: 0, uncertainCount: 0 })
  })

  it('ignores a ticket it does not hold, or one under another tenant', () => {
    const inbox = new FakeTicketInbox()
    const [first] = FAKE_ASSIGNED_TICKETS
    inbox.markSeen(ID, FAKE_TICKET_IDENTITY_EPOCH, [
      { provider: 'jira', externalId: 'NOPE-1' },
      { ...identityOf(first!), sourceTenant: 'elsewhere' },
    ])
    expect(inbox.newItems()[0]?.newCount).toBe(FAKE_ASSIGNED_TICKETS.length)
  })

  it('marks nothing on a connection it does not hold, or under an identity that is not the connection’s', () => {
    const inbox = new FakeTicketInbox()
    const all = FAKE_ASSIGNED_TICKETS.map(identityOf)
    expect(inbox.markSeen('other', FAKE_TICKET_IDENTITY_EPOCH, all)).toBeUndefined()
    expect(inbox.markSeen(ID, 'stale-epoch', all)).toBeUndefined()
    expect(inbox.newItems()[0]?.newCount).toBe(FAKE_ASSIGNED_TICKETS.length)
  })

  it('keeps each inbox’s seen tickets to itself', () => {
    const one = new FakeTicketInbox()
    one.markSeen(ID, FAKE_TICKET_IDENTITY_EPOCH, FAKE_ASSIGNED_TICKETS.map(identityOf))
    expect(new FakeTicketInbox().newItems()[0]?.newCount).toBe(FAKE_ASSIGNED_TICKETS.length)
  })
})
