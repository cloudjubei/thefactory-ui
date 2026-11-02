import { useEffect, useState } from 'react'
import type { ProcessNeedsYouItem } from 'thefactory-tools/types'

import { listProcessRunNeedsYouItems, useApi, useAuth } from '../api'
import type { RunNeedsYouItemsState } from '../utils/runNeedsYouItemsTypes'
import { RunNeedsYouItemsCache } from './runNeedsYouItemsCache'

const runNeedsYouItemsCache = new RunNeedsYouItemsCache(async (runId) => {
  const { data } = await listProcessRunNeedsYouItems({ path: { runId }, throwOnError: true })
  return data.items as ProcessNeedsYouItem[]
})

/**
 * A run's final report "Needs you" items, for the chips that point at them —
 * read once per run however many chips mount, and again whenever the run changes.
 */
export function useRunNeedsYouItems(runId: string): RunNeedsYouItemsState {
  const { token } = useAuth()
  const { ws } = useApi()
  const [state, setState] = useState<RunNeedsYouItemsState>(
    () => runNeedsYouItemsCache.peek(runId) ?? { status: 'loading' },
  )
  useEffect(() => {
    if (!token) return
    let live = true
    const read = () =>
      void runNeedsYouItemsCache.get(runId).then((result) => {
        if (live) setState(result)
      })
    setState(runNeedsYouItemsCache.peek(runId) ?? { status: 'loading' })
    read()
    const off = ws.on('process:run-update', (data: unknown) => {
      if ((data as { runId?: string } | undefined)?.runId !== runId) return
      runNeedsYouItemsCache.forget(runId)
      read()
    })
    return () => {
      live = false
      off()
    }
  }, [token, ws, runId])
  return state
}
