import { useCallback, useState } from 'react'
import type { FeatureRequest } from 'thefactory-tools/types'
import { extractErrorMessage } from '../api/errorMessage'
import { featureRequestStartAgainChoice } from '../utils/featureRequestView'
import type { FeatureRequestStartAgainChoice } from '../utils/featureRequestViewTypes'
import type { WorkLaunchChoice } from '../utils/workLaunchViewTypes'
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
  /** Accept it, its work carried out the way chosen. */
  accept: (choice: WorkLaunchChoice) => Promise<void>
  /** Start the work of an accepted request whose work has not started. */
  startWork: (choice: WorkLaunchChoice) => Promise<void>
  reject: (reason?: string) => Promise<void>
  markDelivered: (input: FeatureRequestDeliveryForm) => Promise<void>
  handOver: (input: FeatureRequestHandoverForm) => Promise<void>
  /** Start a blocked or failed request's work again — the way its last work went, unless chosen. */
  startAgain: (choice?: FeatureRequestStartAgainChoice) => Promise<void>
}

/**
 * One request's decision, as its card makes it: the live record, accept, reject with an optional
 * reason, and marking it delivered or handing it over — with the call in flight and the reason it failed, so the card can say so
 * instead of silently staying as it was.
 */
export function useFeatureRequestDecision(
  requestId: string | undefined,
): FeatureRequestDecisionState {
  const { requestById, accept, startWork, reject, markDelivered, handOver, startAgain } =
    useCrossProjectRequests()
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
    (choice: WorkLaunchChoice) =>
      requestId ? decide(() => accept(requestId, choice)) : Promise.resolve(),
    [accept, decide, requestId],
  )
  const startRequestWork = useCallback(
    (choice: WorkLaunchChoice) =>
      requestId ? decide(() => startWork(requestId, choice)) : Promise.resolve(),
    [decide, requestId, startWork],
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

  const startRequestAgain = useCallback(
    (choice?: FeatureRequestStartAgainChoice) =>
      requestId
        ? decide(() => startAgain(requestId, choice ?? featureRequestStartAgainChoice(request)))
        : Promise.resolve(),
    [decide, request, requestId, startAgain],
  )

  return {
    request,
    busy,
    error,
    accept: acceptRequest,
    startWork: startRequestWork,
    reject: rejectRequest,
    markDelivered: markRequestDelivered,
    handOver: handOverRequest,
    startAgain: startRequestAgain,
  }
}
