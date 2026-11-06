import { useEffect, useState } from 'react'

import { readProcessRunTicketPost } from '../api/ticketPostApi'
import type { TicketPost } from '../utils/ticketPostTypes'

export type UseTicketPost = { post?: TicketPost; failed: boolean }

/** What approving a run's sign-off would post, read while `runId` names a decision still to make. */
export function useTicketPost(runId: string | undefined): UseTicketPost {
  const [state, setState] = useState<UseTicketPost>({ failed: false })

  useEffect(() => {
    if (!runId) {
      setState({ failed: false })
      return
    }
    let current = true
    readProcessRunTicketPost(runId).then(
      (post) => {
        if (current) setState({ post, failed: false })
      },
      () => {
        if (current) setState({ failed: true })
      },
    )
    return () => {
      current = false
    }
  }, [runId])

  return state
}
