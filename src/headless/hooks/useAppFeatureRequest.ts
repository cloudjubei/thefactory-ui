import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { sendAppFeatureRequest } from '../api/appFeatureRequest'
import type { BridgeRequest } from '../utils/appBridge'
import {
  featureRequestDeclined,
  featureRequestDraftError,
  featureRequestSent,
  isFeatureRequestRequest,
  parseFeatureRequestPayload,
} from '../utils/appFeatureRequest'
import {
  APP_FEATURE_REQUEST_CLOSED,
  APP_FEATURE_REQUEST_FAILED,
  APP_FEATURE_REQUEST_NO_PROJECT,
} from '../utils/appFeatureRequestConstants'
import { AppFeatureRequestStore } from '../utils/appFeatureRequestStore'
import type {
  AppFeatureRequestAsk,
  AppFeatureRequestDraft,
  AppFeatureRequestReply,
} from '../utils/appFeatureRequestTypes'

export interface UseAppFeatureRequest {
  /** The ask the person is answering, or `null`. Draw it over the App view. */
  ask: AppFeatureRequestAsk | null
  /**
   * Takes an `overseer:feature.request` request and returns its answer, settled when the person
   * answers — never on a timer. Any other request returns `null`.
   */
  handleBridgeMessage: (req: BridgeRequest) => Promise<AppFeatureRequestReply> | null
  edit: (draft: AppFeatureRequestDraft) => void
  /** Send the request; a failure stays on the ask for another Send. */
  send: () => void
  /** Decline the ask: nothing is sent. */
  cancel: () => void
}

/**
 * An embedded app's `feature.request`: the person confirms (and may edit) a request to another
 * project over the App view before it is sent. `mountKey` names the mounted app; when it changes
 * or the App view goes away, every open ask is declined with a reason, since the app that asked is
 * gone.
 */
export function useAppFeatureRequest(
  projectId: string | undefined,
  mountKey: string,
): UseAppFeatureRequest {
  const [store] = useState(() => new AppFeatureRequestStore())
  const ask = useSyncExternalStore(
    useCallback((listener: () => void) => store.subscribe(listener), [store]),
    () => store.current(),
    () => store.current(),
  )

  useEffect(() => () => store.declineAll(APP_FEATURE_REQUEST_CLOSED), [store, mountKey])

  const handleBridgeMessage = useCallback(
    (req: BridgeRequest) => {
      if (!isFeatureRequestRequest(req)) return null
      if (!projectId) return Promise.reject(new Error(APP_FEATURE_REQUEST_NO_PROJECT))
      const draft = parseFeatureRequestPayload(req.payload)
      if ('error' in draft) return Promise.reject(new Error(draft.error))
      const invalid = featureRequestDraftError(draft, projectId)
      if (invalid) return Promise.reject(new Error(invalid))
      return store.enqueue(draft)
    },
    [projectId, store],
  )

  const edit = useCallback(
    (draft: AppFeatureRequestDraft) => {
      const current = store.current()
      if (current) store.edit(current.id, draft)
    },
    [store],
  )

  const send = useCallback(() => {
    const current = store.current()
    if (!current || current.busy) return
    if (!projectId) {
      store.fail(current.id, APP_FEATURE_REQUEST_NO_PROJECT)
      return
    }
    const invalid = featureRequestDraftError(current.draft, projectId)
    if (invalid) {
      store.fail(current.id, invalid)
      return
    }
    store.setBusy(current.id, true)
    sendAppFeatureRequest(projectId, current.draft)
      .then((requestId) => store.settle(current.id, featureRequestSent(requestId)))
      .catch((err: unknown) =>
        store.fail(current.id, err instanceof Error ? err.message : APP_FEATURE_REQUEST_FAILED),
      )
  }, [projectId, store])

  const cancel = useCallback(() => {
    const current = store.current()
    if (current && !current.busy) store.settle(current.id, featureRequestDeclined())
  }, [store])

  return { ask, handleBridgeMessage, edit, send, cancel }
}
