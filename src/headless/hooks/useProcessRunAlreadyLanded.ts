import { useCallback, useEffect, useState } from 'react'
import { processRunAlreadyLandedOffered } from 'thefactory-tools/utils'
import type { ProcessRun } from 'thefactory-tools/types'

import {
  extractErrorMessage,
  getProcessRunLandingCheck,
  settleProcessRunAlreadyLanded,
  useApi,
  useAuth,
} from '../api'
import { processAlreadyLandedOffer } from '../utils/processAlreadyLanded'
import type {
  ProcessAlreadyLandedOffer,
  ProcessRunLandingPreview,
} from '../utils/processAlreadyLandedTypes'

export type UseProcessRunAlreadyLanded = {
  /** "Finish as already landed", when git reads the base as already holding the run's work. */
  offer: ProcessAlreadyLandedOffer | undefined
  actionError: string | null
  busy: boolean
  /** Finish the run as landed. Resolves to the run as recorded, or `undefined` when refused. */
  settle: () => Promise<ProcessRun | undefined>
}

/**
 * "Finish as already landed" on an approved run whose work did not land: what
 * the server's landing check reads — asked only for a run that offers it — and
 * a way to finish the run, attributed to this app.
 */
export function useProcessRunAlreadyLanded(
  run: ProcessRun | undefined,
): UseProcessRunAlreadyLanded {
  const { token } = useAuth()
  const { client } = useApi()
  const [preview, setPreview] = useState<ProcessRunLandingPreview | undefined>(undefined)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const runId = run?.id
  const offered = run ? processRunAlreadyLandedOffered(run) : false
  const failedAt = run?.integration?.at

  useEffect(() => {
    if (!runId || !offered || !token) {
      setPreview(undefined)
      return
    }
    let live = true
    void getProcessRunLandingCheck({ path: { runId } })
      .then(({ data }) => {
        if (live) setPreview(data as ProcessRunLandingPreview | undefined)
      })
      .catch(() => {
        if (live) setPreview(undefined)
      })
    return () => {
      live = false
    }
  }, [runId, offered, token, failedAt])

  const settle = useCallback(async () => {
    if (!runId) return undefined
    setActionError(null)
    setBusy(true)
    try {
      const { data } = await settleProcessRunAlreadyLanded({
        path: { runId },
        body: { decidedVia: client },
        throwOnError: true,
      })
      setPreview(undefined)
      return data as ProcessRun
    } catch (err) {
      setActionError(extractErrorMessage(err, 'The run could not be finished as already landed.'))
      return undefined
    } finally {
      setBusy(false)
    }
  }, [runId, client])

  return {
    offer: run ? processAlreadyLandedOffer(run, preview) : undefined,
    actionError,
    busy,
    settle,
  }
}
