import type { TicketPost } from '../utils/ticketPostTypes'
import { client } from './generated/client.gen'

/** What approving a run's sign-off would post. Written by hand until the SDK is generated from this route. */
export async function readProcessRunTicketPost(runId: string): Promise<TicketPost> {
  const { data } = await client.get({
    url: `/api/v1/process-runs/${encodeURIComponent(runId)}/ticket-post`,
    throwOnError: true,
  })
  return data as TicketPost
}
