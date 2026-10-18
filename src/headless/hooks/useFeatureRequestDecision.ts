import { useCallback, useState } from 'react'
import type { FeatureRequest } from 'thefactory-tools/types'
import { extractErrorMessage } from '../api/errorMessage'
import {
  useCrossProjectRequests,
  type FeatureRequestDeliveryForm,
  type FeatureRequestHandoverForm,
} from './useCrossProjectRequests'

export interface FeatureRequestDecisionState {
  /** The live request, or `undefined` until the store has it. */
  request: FeatureRequest | undefined
  /** A decision is on its way to the server. */
  busy: boolean
  /** Why the last decision did not go through, until the next one is tried. */
  error: string | undefined
  accept: () => Promise<void>
  reject: (reason?: string) => Promise<void>
  markDelivered: (input: FeatureRequestDeliveryForm) => Promise<void>
  handOver: (input: FeatureRequestHandoverForm) => Promise<void>
}

/**
 * One request's decision, as its card makes it: the live record, accept, reject with an optional
 * reason, and marking it delivered or handing it over — with the call in flight and the reason it failed, so the card can say so
 * instead of silently staying as it was.
 */
export function useFeatureRequestDecision(
  requestId: string | undefined,
): FeatureRequestDecisionState {
  const { requestById, accept, reject, markDelivered, handOver } = useCrossProjectRequests()
  const request = requestId ? requestById(requestId) : undefined
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const decide = useCallback(async (call: () => Promise<unknown>) => {
    setBusy(true)
    setError(undefined)
    try {
      await call()
    } catch (err) {
      setError(extractErrorMessage(err, 'The decision did not go through.'))
    } finally {
      setBusy(false)
    }
  }, [])

  const acceptRequest = useCallback(
    () => (requestId ? decide(() => accept(requestId)) : Promise.resolve()),
    [accept, decide, requestId],
  )
  const rejectRequest = useCallback(
    (reason?: string) => (requestId ? decide(() => reject(requestId, reason)) : Promise.resolve()),
    [decide, reject, requestId],
  )

  const markRequestDelivered = useCallback(
    (input: FeatureRequestDeliveryForm) =>
      requestId ? decide(() => markDelivered(requestId, input)) : Promise.resolve(),
    [decide, markDelivered, requestId],
  )
  const handOverRequest = useCallback(
    (input: FeatureRequestHandoverForm) =>
      requestId ? decide(() => handOver(requestId, input)) : Promise.resolve(),
    [decide, handOver, requestId],
  )

  return {
    request,
    busy,
    error,
    accept: acceptRequest,
    reject: rejectRequest,
    markDelivered: markRequestDelivered,
    handOver: handOverRequest,
  }
}
