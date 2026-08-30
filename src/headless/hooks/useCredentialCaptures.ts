import { useCallback, useEffect, useMemo, useState } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'
import {
  cancelCredentialCapture,
  getCredentialCapture,
  listCredentialCaptures,
  submitCredentialCapture,
  type ChatContext,
} from '../api/generated'
import { useApi } from '../api'
import { CREDENTIAL_CAPTURE_EVENT } from '../utils/credentialCaptureConstants'
import {
  awaitingCaptures,
  belongsToChat,
  isCredentialCapture,
  upsertCapture,
} from '../utils/credentialCaptures'
import type { CredentialCapture, CredentialCaptureFields } from '../utils/credentialCaptureTypes'

export type UseCredentialCaptures = {
  /**
   * Every capture this chat has seen, oldest first. Resolved ones stay in the
   * feed so the conversation still makes sense on scrollback.
   */
  captures: CredentialCapture[]
  /** The subset still awaiting the user — the ones that render a form. */
  awaiting: CredentialCapture[]
  /**
   * Post the credential fields straight to the credentials API. The fields pass
   * through this call and are never stored, logged, or echoed back.
   */
  submit: (id: string, fields: CredentialCaptureFields) => Promise<void>
  cancel: (id: string) => Promise<void>
  /** Re-read one capture's status. Also runs after a refused submit or cancel. */
  refresh: (id: string) => Promise<void>
}

/**
 * Open credential captures for one chat. An agent that needs credentials opens a
 * capture in process; the backend broadcasts the record on `credentialCapture:
 * updated` both when it opens (so the form appears) and when it resolves.
 *
 * The secret never travels through this hook's state or through the chat: the
 * user's fields go from the form into {@link UseCredentialCaptures.submit} and
 * out to the API, and everything held here is the secret-free capture record.
 *
 * On mount the chat's captures are fetched, then kept live over the websocket. The
 * fetch is what makes a reload survivable: a capture outlives the page, so without
 * it a refresh would hide a form the agent is still waiting on.
 */
export function useCredentialCaptures(ctx: ChatContext): UseCredentialCaptures {
  const { ws } = useApi()
  const chatContextKey = useMemo(() => getChatContextKey(ctx), [ctx])
  const [captures, setCaptures] = useState<CredentialCapture[]>([])

  useEffect(() => {
    setCaptures([])
    // Responses from a previous chat must never land in this one's feed.
    let cancelled = false
    void listCredentialCaptures({ query: { chatContextKey }, throwOnError: true })
      .then(({ data }) => {
        if (cancelled) return
        const existing = (data ?? []).filter(isCredentialCapture)
        // Fold in rather than replace: a websocket event can beat the fetch.
        setCaptures((prev) => existing.reduce(upsertCapture, prev))
      })
      .catch(() => {
        // A failed rehydrate leaves the live feed working; it is not worth
        // surfacing an error over a form the user may never have opened.
      })
    const off = ws.on(CREDENTIAL_CAPTURE_EVENT, (data) => {
      if (!isCredentialCapture(data)) return
      if (!belongsToChat(data, chatContextKey)) return
      setCaptures((prev) => upsertCapture(prev, data))
    })
    return () => {
      cancelled = true
      off()
    }
  }, [ws, chatContextKey])

  const refresh = useCallback(async (id: string) => {
    const { data } = await getCredentialCapture({ path: { id }, throwOnError: true })
    setCaptures((prev) => upsertCapture(prev, data))
  }, [])

  // A refused submit/cancel means the capture moved on without us (expired, or
  // already resolved elsewhere). Pull its real status so the card stops offering
  // a form, then let the original failure surface.
  const reconcile = useCallback(
    async (id: string) => {
      try {
        await refresh(id)
      } catch {
        /* the caller's own error is the one worth reporting */
      }
    },
    [refresh],
  )

  const submit = useCallback(
    async (id: string, fields: CredentialCaptureFields) => {
      try {
        const { data } = await submitCredentialCapture({
          path: { id },
          body: fields,
          throwOnError: true,
        })
        setCaptures((prev) => upsertCapture(prev, data))
      } catch (err) {
        await reconcile(id)
        throw err
      }
    },
    [reconcile],
  )

  const cancel = useCallback(
    async (id: string) => {
      try {
        const { data } = await cancelCredentialCapture({ path: { id }, throwOnError: true })
        setCaptures((prev) => upsertCapture(prev, data))
      } catch (err) {
        await reconcile(id)
        throw err
      }
    },
    [reconcile],
  )

  const awaiting = useMemo(() => awaitingCaptures(captures), [captures])

  return useMemo<UseCredentialCaptures>(
    () => ({ captures, awaiting, submit, cancel, refresh }),
    [captures, awaiting, submit, cancel, refresh],
  )
}
