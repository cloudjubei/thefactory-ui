import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { processMergeActive, processMergeRows, processPublishView } from '../utils/processDelivery'
import { PROCESS_DELIVERY_POLL_MS } from '../utils/processDeliveryConstants'
import type {
  ProcessDeliveryData,
  ProcessDeliveryTarget,
  ProcessMergeRow,
  ProcessPublishEdit,
  ProcessPublishView,
} from '../utils/processDeliveryTypes'
import { ProcessDeliveryStore } from './processDeliveryStore'

export type UseProcessDelivery = {
  /** What the host says of each repo; undefined until read. */
  data: ProcessDeliveryData | undefined
  /** The publish card; undefined until read. */
  publish: ProcessPublishView | undefined
  /** Each repo's merge after Accept. */
  merge: ProcessMergeRow[]
  readError: string | null
  setEdit: (projectId: string, field: keyof ProcessPublishEdit, value: string) => void
  /**
   * Publish: a run keeps the card's edits and then `answer` answers its gate
   * (the run's own resume); a group run publishes every leg. Resolves `false`
   * when refused.
   */
  publishNow: (answer?: () => Promise<boolean>) => Promise<boolean>
}

const NO_ROWS: ProcessMergeRow[] = []

/**
 * A run's or a group run's delivery — the publish card, what was published and
 * each repo's merge — read again whenever `revision` moves on and, while a
 * merge is on its way, every few seconds. Pass no target to read nothing.
 */
export function useProcessDelivery(
  target: ProcessDeliveryTarget | undefined,
  revision?: string | number,
): UseProcessDelivery {
  const { token } = useAuth()
  const { client } = useApi()
  const decidedVia = useRef(client)
  decidedVia.current = client
  const key = target
    ? `${target.kind}:${target.kind === 'run' ? target.runId : target.groupRunId}`
    : ''
  const store = useMemo(
    () => (target ? new ProcessDeliveryStore(target, () => decidedVia.current) : undefined),
    [key],
  )
  const state = useSyncExternalStore(
    store?.subscribe ?? NO_SUBSCRIBE,
    store?.getState ?? NO_STATE,
    store?.getState ?? NO_STATE,
  )

  useEffect(() => {
    if (token && store) void store.refresh()
  }, [token, store, revision])

  const active = processMergeActive(state?.data)
  useEffect(() => {
    if (!token || !store || !active) return
    const timer = setInterval(() => void store.refresh(), PROCESS_DELIVERY_POLL_MS)
    return () => clearInterval(timer)
  }, [token, store, active])

  return useMemo(
    () => ({
      data: state?.data,
      publish: state?.data
        ? processPublishView(state.data, state.edits, {
            publishing: state.publishing,
            error: state.actionError,
          })
        : undefined,
      merge: state?.data ? processMergeRows(state.data) : NO_ROWS,
      readError: state?.readError ?? null,
      setEdit: store?.setEdit ?? NO_EDIT,
      publishNow: store?.publish ?? NO_PUBLISH,
    }),
    [state, store],
  )
}

const NO_SUBSCRIBE = () => () => undefined
const NO_STATE = () => undefined
const NO_EDIT = () => undefined
const NO_PUBLISH = async () => false
