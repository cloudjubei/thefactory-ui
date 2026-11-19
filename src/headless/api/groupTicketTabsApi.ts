import type { GroupTicketOverview } from '../utils/groupTicketPageTypes'
import type { GroupTicketTab, GroupTicketTabs } from '../utils/groupTicketTabTypes'
import { client } from './generated/client.gen'

const groupUrl = (groupId: string): string => `/api/v1/groups/${encodeURIComponent(groupId)}`

/** A group's ticket tabs: its own, else the defaults. Written by hand until the SDK is generated from these routes. */
export async function readGroupTicketTabs(groupId: string): Promise<GroupTicketTabs> {
  const { data } = await client.get({ url: `${groupUrl(groupId)}/ticket-tabs`, throwOnError: true })
  return data as GroupTicketTabs
}

/** Save a group's ticket tabs; none goes back to the defaults. Answers the tabs as saved. */
export async function saveGroupTicketTabs(
  groupId: string,
  tabs: readonly GroupTicketTab[],
): Promise<GroupTicketTabs> {
  const { data } = await client.put({
    url: `${groupUrl(groupId)}/ticket-tabs`,
    body: { tabs },
    headers: { 'Content-Type': 'application/json' },
    throwOnError: true,
  })
  return data as GroupTicketTabs
}

/** Everything about one ticket, for its page. */
export async function readGroupTicketOverview(
  groupId: string,
  ticketKey: string,
): Promise<GroupTicketOverview> {
  const { data } = await client.get({
    url: `${groupUrl(groupId)}/tickets/${encodeURIComponent(ticketKey)}/overview`,
    throwOnError: true,
  })
  return data as GroupTicketOverview
}
