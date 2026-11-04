import type { GroupTicketList, TicketPlanBody, TicketPlanStarted } from '../utils/groupTicketTypes'
import { client } from './generated/client.gen'

const ticketsUrl = (groupId: string): string =>
  `/api/v1/groups/${encodeURIComponent(groupId)}/tickets`

/** The person's sprint tickets. Written by hand until the SDK is generated from these routes. */
export async function readGroupTickets(
  groupId: string,
  nextPageToken?: string,
): Promise<GroupTicketList> {
  const { data } = await client.get({
    url: ticketsUrl(groupId),
    ...(nextPageToken ? { query: { nextPageToken } } : {}),
    throwOnError: true,
  })
  return data as GroupTicketList
}

/** Open a ticket's planning chat: its agent proposes the group story there. */
export async function startGroupTicketPlan(
  groupId: string,
  ticketKey: string,
  body: TicketPlanBody = {},
): Promise<TicketPlanStarted> {
  const { data } = await client.post({
    url: `${ticketsUrl(groupId)}/${encodeURIComponent(ticketKey)}/plan`,
    body,
    headers: { 'Content-Type': 'application/json' },
    throwOnError: true,
  })
  return data as TicketPlanStarted
}
