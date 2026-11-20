import {
  getProcessGroupRunTicketUpdate,
  getProcessRunTicketUpdate,
  postProcessGroupRunTicketUpdate,
  postProcessRunTicketUpdate,
} from './generated/sdk.gen'
import type { ProcessDeliveryTarget } from '../utils/processDeliveryTypes'
import type { TicketUpdateData } from '../utils/ticketUpdateTypes'

/** The ticket update a run's or a group run's sign-off offers. */
export async function readTicketUpdate(target: ProcessDeliveryTarget): Promise<TicketUpdateData> {
  const { data } =
    target.kind === 'group'
      ? await getProcessGroupRunTicketUpdate({
          path: { groupRunId: target.groupRunId },
          throwOnError: true,
        })
      : await getProcessRunTicketUpdate({ path: { runId: target.runId }, throwOnError: true })
  return data as TicketUpdateData
}

/** Post the ticket update as the person; the answer says where it went. */
export async function postTicketUpdate(target: ProcessDeliveryTarget): Promise<TicketUpdateData> {
  const { data } =
    target.kind === 'group'
      ? await postProcessGroupRunTicketUpdate({
          path: { groupRunId: target.groupRunId },
          throwOnError: true,
        })
      : await postProcessRunTicketUpdate({ path: { runId: target.runId }, throwOnError: true })
  return data as TicketUpdateData
}
