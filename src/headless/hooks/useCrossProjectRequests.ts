import { useCallback, useEffect, useSyncExternalStore } from 'react'
import type { ChatContext, FeatureRequest } from 'thefactory-tools/types'
// Chat-key derivation is the narrowly-scoped sanctioned exception to the no-`thefactory-tools`
// direct-import rule (see the client `chatKey` shims) — it must stay in lock-step with the backend.
import { getChatContextKey } from 'thefactory-tools/utils'
import {
  summarizeCrossProjectWaiting,
  type CrossProjectWaitingView,
} from '../utils/crossProjectWaiting'
import { acceptFeatureRequest, listFeatureRequests, rejectFeatureRequest } from '../api/generated'
import { useApi } from '../api/ApiContext'
import {
  badgeCount,
  featureRequestsSnapshot,
  inboxFor,
  inFlightCount,
  openRequestsFromChat,
  outboxFor,
  pendingCount,
  replaceFeatureRequests,
  requestById,
  sortedRequests,
  subscribeFeatureRequests,
  upsertFeatureRequest,
} from './featureRequestsStore'

export interface CrossProjectRequestsState {
  /** Every cross-project request, most-recently-updated first — the inspector feed. */
  requests: FeatureRequest[]
  /** Requests awaiting a human accept/reject decision. */
  pending: number
  /** Requests whose B-side work is under way (accepted / in_progress / in_review). */
  inFlight: number
  /** Inspector badge: pending + in-flight (terminal states drop off). */
  badgeCount: number
  /** Requests a project emitted (its outbox). */
  outboxFor: (fromProjectId: string) => FeatureRequest[]
  /** Requests targeting a project (its inbox). */
  inboxFor: (targetProjectId: string) => FeatureRequest[]
  /** The live record behind a `requestProjectFeature` tool result, or undefined until it seeds. */
  requestById: (id: string) => FeatureRequest | undefined
  /** Accept a pending request (single-tenant: the operator may accept on B's behalf). */
  accept: (id: string) => Promise<FeatureRequest | undefined>
  /** Reject a pending request. */
  reject: (id: string) => Promise<FeatureRequest | undefined>
  /** Open requests emitted from a chat — drives its "Waiting on «B»…" banner. */
  waitingForChat: (context: ChatContext) => FeatureRequest[]
  /** True when an open request emitted from a chat flagged a deadlock cycle (D.5). */
  hasCycleForChat: (context: ChatContext) => boolean
  /**
   * The view-model for a chat's "Waiting on «B»…" bar, or `null` when it has nothing in flight —
   * the composer stays. Drives the `inputOverride` that replaces the input area while blocked.
   */
  waitingViewForChat: (context: ChatContext) => CrossProjectWaitingView | null
}

/** Accept, optimistically upserting the returned record so the widget/inspector update at once. */
async function acceptRequest(id: string): Promise<FeatureRequest | undefined> {
  const res = await acceptFeatureRequest({ path: { id }, throwOnError: true })
  const updated = res.data as FeatureRequest | undefined
  if (updated) upsertFeatureRequest(updated)
  return updated
}

async function rejectRequest(id: string): Promise<FeatureRequest | undefined> {
  const res = await rejectFeatureRequest({ path: { id }, throwOnError: true })
  const updated = res.data as FeatureRequest | undefined
  if (updated) upsertFeatureRequest(updated)
  return updated
}

/** Seed the whole store once from the unfiltered (account-global) list endpoint. */
async function seedFeatureRequests(): Promise<void> {
  try {
    const res = await listFeatureRequests({ throwOnError: true })
    replaceFeatureRequests((res.data ?? []) as FeatureRequest[])
  } catch {
    // Best-effort: leave the store as-is on a transient failure.
  }
}

/**
 * Live, account-global view of cross-project feature requests. Subscribes to
 * `featureRequest:updated` (the full record is broadcast) and seeds once from the list endpoint.
 * Mount ONCE at the app shell — the WS subscription lives in a `useEffect`, so the global store
 * only stays fresh while a component calling this hook is mounted.
 */
export function useCrossProjectRequests(): CrossProjectRequestsState {
  const { ws } = useApi()
  const snapshot = useSyncExternalStore(subscribeFeatureRequests, featureRequestsSnapshot)

  useEffect(
    () => ws.on('featureRequest:updated', (fr) => upsertFeatureRequest(fr as FeatureRequest)),
    [ws],
  )

  useEffect(() => {
    void seedFeatureRequests()
  }, [])

  const outboxForFn = useCallback((id: string) => outboxFor(snapshot, id), [snapshot])
  const inboxForFn = useCallback((id: string) => inboxFor(snapshot, id), [snapshot])
  const requestByIdFn = useCallback((id: string) => requestById(snapshot, id), [snapshot])
  const waitingForChat = useCallback(
    (context: ChatContext) =>
      openRequestsFromChat(snapshot, getChatContextKey(context), getChatContextKey),
    [snapshot],
  )
  const hasCycleForChat = useCallback(
    (context: ChatContext) => waitingForChat(context).some((r) => r.cycleFlag?.detected),
    [waitingForChat],
  )
  const waitingViewForChat = useCallback(
    (context: ChatContext) => summarizeCrossProjectWaiting(waitingForChat(context)),
    [waitingForChat],
  )

  return {
    requests: sortedRequests(snapshot),
    pending: pendingCount(snapshot),
    inFlight: inFlightCount(snapshot),
    badgeCount: badgeCount(snapshot),
    outboxFor: outboxForFn,
    inboxFor: inboxForFn,
    requestById: requestByIdFn,
    accept: acceptRequest,
    reject: rejectRequest,
    waitingForChat,
    hasCycleForChat,
    waitingViewForChat,
  }
}
