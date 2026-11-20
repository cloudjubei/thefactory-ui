import { useCallback, useRef, useState } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'
import { processRunNamedLandingOffered } from 'thefactory-tools/utils'

import { extractErrorMessage, settleProcessRunAlreadyLanded, useApi } from '../api'
import { PROCESS_NAMED_LANDING_COPY } from '../utils/processAlreadyLandedConstants'
import type {
  ProcessNamedLanding,
  ProcessNamedLandingAction,
} from '../utils/processAlreadyLandedTypes'

/**
 * "Finish as merged" by a pull request link or a commit the person names:
 * offered where the run takes it — at its own sign-off, once it stopped, or
 * approved with its work not brought in — and attributed to this app. A
 * second press while it goes is the same press.
 */
export function useProcessRunNamedLanding(
  run: ProcessRun | undefined,
  onSettled?: (run: ProcessRun) => void,
): ProcessNamedLandingAction | undefined {
  const { client } = useApi()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const going = useRef<Promise<boolean> | undefined>(undefined)
  const runId = run?.id

  const onSettle = useCallback(
    (named: ProcessNamedLanding): Promise<boolean> => {
      if (!runId) return Promise.resolve(false)
      going.current ??= (async () => {
        setError(null)
        setBusy(true)
        try {
          const { data } = await settleProcessRunAlreadyLanded({
            path: { runId },
            body: { decidedVia: client, ...named },
            throwOnError: true,
          })
          onSettled?.(data as ProcessRun)
          return true
        } catch (err) {
          setError(extractErrorMessage(err, PROCESS_NAMED_LANDING_COPY.failed))
          return false
        } finally {
          setBusy(false)
          going.current = undefined
        }
      })()
      return going.current
    },
    [runId, client, onSettled],
  )

  if (!run || !processRunNamedLandingOffered(run)) return undefined
  return { busy, error, onSettle }
}
