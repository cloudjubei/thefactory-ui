import type {
  GroupTicketList,
  GroupTicketsQuery,
  TicketPlanBody,
  TicketPlanStarted,
} from '../utils/groupTicketTypes'
import { client } from './generated/client.gen'

const ticketsUrl = (groupId: string): string =>
  `/api/v1/groups/${encodeURIComponent(groupId)}/tickets`

/** One list of a group's tickets. Written by hand until the SDK is generated from these routes. */
export async function readGroupTickets(
  groupId: string,
  query: GroupTicketsQuery = {},
): Promise<GroupTicketList> {
  const { data } = await client.get({
    url: ticketsUrl(groupId),
    query: { ...query },
    throwOnError: true,
  })
  return data as GroupTicketList
}

async function startTicketChat(
  groupId: string,
  ticketKey: string,
  route: 'discuss' | 'plan',
  body: TicketPlanBody,
): Promise<TicketPlanStarted> {
  const { data } = await client.post({
    url: `${ticketsUrl(groupId)}/${encodeURIComponent(ticketKey)}/${route}`,
    body,
    headers: { 'Content-Type': 'application/json' },
    throwOnError: true,
  })
  return data as TicketPlanStarted
}

/** Open a ticket's chat to talk it over: its agent reads it and waits. */
export function startGroupTicketDiscussion(
  groupId: string,
  ticketKey: string,
  body: TicketPlanBody = {},
): Promise<TicketPlanStarted> {
  return startTicketChat(groupId, ticketKey, 'discuss', body)
}

/** Open a ticket's planning chat: its agent proposes the group story there. */
export function startGroupTicketPlan(
  groupId: string,
  ticketKey: string,
  body: TicketPlanBody = {},
): Promise<TicketPlanStarted> {
  return startTicketChat(groupId, ticketKey, 'plan', body)
}
