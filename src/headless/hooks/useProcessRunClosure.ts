import { useCallback, useEffect, useState } from 'react'
import { processRunClosable } from 'thefactory-tools/utils'
import type { ProcessFeatureClosureStatus, ProcessRun } from 'thefactory-tools/types'

import {
  closeProcessRunFeatures,
  extractErrorMessage,
  getProcessRunClosure,
  useApi,
  useAuth,
} from '../api'
import {
  processRunClosureOfRows,
  processRunClosureRows,
  processRunClosureRowsProblem,
  withProcessRunClosurePick,
} from '../utils/processRunClosureView'
import type { ProcessRunClosureRow } from '../utils/processRunClosureViewTypes'

export type UseProcessRunClosure = {
  /** The features left to settle, with the person's picks; empty when there is nothing to settle. */
  rows: ProcessRunClosureRow[]
  /** Why the picks cannot be sent yet, or `undefined`. */
  problem: string | undefined
  actionError: string | null
  busy: boolean
  pick: (featureId: string, pick: { status?: ProcessFeatureClosureStatus; reason?: string }) => void
  /** Leave every feature as picked. Resolves to the settled run, or `undefined` when refused. */
  settle: () => Promise<ProcessRun | undefined>
}

/**
 * "Settle its features" on a story run that ended: the features it worked on
 * that are not done, read from the server for any ended run not settled yet
 * (it answers none when every one is done), with the person's picks and a way
 * to send them.
 */
export function useProcessRunClosure(run: ProcessRun | undefined): UseProcessRunClosure {
  const { token } = useAuth()
  const { client } = useApi()
  const [rows, setRows] = useState<ProcessRunClosureRow[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const runId = run?.id
  const offered = run ? processRunClosable(run) : false

  useEffect(() => {
    if (!runId || !offered || !token) {
      setRows([])
      return
    }
    let live = true
    void getProcessRunClosure({ path: { runId } })
      .then(({ data }) => {
        if (live) setRows(processRunClosureRows(data?.candidates ?? []))
      })
      .catch(() => {
        if (live) setRows([])
      })
    return () => {
      live = false
    }
  }, [runId, offered, token])

  const pick = useCallback(
    (featureId: string, next: { status?: ProcessFeatureClosureStatus; reason?: string }) =>
      setRows((current) => withProcessRunClosurePick(current, featureId, next)),
    [],
  )

  const settle = useCallback(async () => {
    if (!runId) return undefined
    setActionError(null)
    setBusy(true)
    try {
      const { data } = await closeProcessRunFeatures({
        path: { runId },
        body: { features: processRunClosureOfRows(rows), decidedVia: client },
        throwOnError: true,
      })
      setRows([])
      return data as ProcessRun
    } catch (err) {
      setActionError(extractErrorMessage(err, 'The features could not be settled.'))
      return undefined
    } finally {
      setBusy(false)
    }
  }, [runId, rows, client])

  return { rows, problem: processRunClosureRowsProblem(rows), actionError, busy, pick, settle }
}
