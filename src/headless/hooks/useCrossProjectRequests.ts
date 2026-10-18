import { useCallback, useEffect, useSyncExternalStore } from 'react'
import type { FeatureRequest } from 'thefactory-tools/types'
import {
  acceptFeatureRequest,
  handOverFeatureRequest,
  listFeatureRequests,
  markFeatureRequestDelivered,
  rejectFeatureRequest,
  startFeatureRequestAgain,
  startFeatureRequestWork,
} from '../api/generated'
import { useApi, useOptionalApi } from '../api/ApiContext'
import type { FeatureRequestStartAgainChoice } from '../utils/featureRequestViewTypes'
import type { WorkLaunchChoice } from '../utils/workLaunchViewTypes'
import {
  badgeCount,
  featureRequestsSnapshot,
  inboxFor,
  inFlightCount,
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
  /**
   * Accept a pending request (single-tenant: the operator may accept on B's behalf), its work
   * carried out the way chosen: in its chat at once, or a process run once its launch card is confirmed.
   */
  accept: (id: string, choice: WorkLaunchChoice) => Promise<FeatureRequest | undefined>
  /** Start the work of a request accepted and placed but not started yet. */
  startWork: (id: string, choice: WorkLaunchChoice) => Promise<FeatureRequest | undefined>
  /** Reject a pending request; a reason given is kept on it and passed on to the asking chat. */
  reject: (id: string, reason?: string) => Promise<FeatureRequest | undefined>
  /** Mark a request delivered by other work — a commit, run or story. */
  markDelivered: (
    id: string,
    input: FeatureRequestDeliveryForm,
  ) => Promise<FeatureRequest | undefined>
  /** Hand a request over to another project's request or story. */
  handOver: (id: string, input: FeatureRequestHandoverForm) => Promise<FeatureRequest | undefined>
  /** Start a blocked or failed request's work again, the way chosen. */
  startAgain: (
    id: string,
    choice: FeatureRequestStartAgainChoice,
  ) => Promise<FeatureRequest | undefined>
}

/** What the person typed to mark a request delivered. */
export interface FeatureRequestDeliveryForm {
  ref: string
  note?: string
}

/** What the person typed to hand a request over. */
export interface FeatureRequestHandoverForm {
  projectId: string
  ref: string
  note?: string
}

const withNote = (note: string | undefined) => (note?.trim() ? { note: note.trim() } : {})

/** Mark a request delivered, keeping the record the server answers with. */
export async function markRequestDelivered(
  id: string,
  input: FeatureRequestDeliveryForm,
): Promise<FeatureRequest | undefined> {
  const res = await markFeatureRequestDelivered({
    path: { id },
    body: { ref: input.ref.trim(), ...withNote(input.note) },
    throwOnError: true,
  })
  const updated = res.data as FeatureRequest | undefined
  if (updated) upsertFeatureRequest(updated)
  return updated
}

/** Hand a request over, keeping the record the server answers with. */
export async function handOverRequest(
  id: string,
  input: FeatureRequestHandoverForm,
): Promise<FeatureRequest | undefined> {
  const res = await handOverFeatureRequest({
    path: { id },
    body: { projectId: input.projectId.trim(), ref: input.ref.trim(), ...withNote(input.note) },
    throwOnError: true,
  })
  const updated = res.data as FeatureRequest | undefined
  if (updated) upsertFeatureRequest(updated)
  return updated
}

/** Start a request's work again, keeping the record the server answers with. */
export async function startRequestAgain(
  id: string,
  choice: FeatureRequestStartAgainChoice,
): Promise<FeatureRequest | undefined> {
  const res = await startFeatureRequestAgain({ path: { id }, body: choice, throwOnError: true })
  const updated = res.data as FeatureRequest | undefined
  if (updated) upsertFeatureRequest(updated)
  return updated
}

/** Accept, optimistically upserting the returned record so the widget/inspector update at once. */
async function acceptRequest(
  id: string,
  choice: WorkLaunchChoice,
): Promise<FeatureRequest | undefined> {
  const res = await acceptFeatureRequest({ path: { id }, body: choice, throwOnError: true })
  const updated = res.data as FeatureRequest | undefined
  if (updated) upsertFeatureRequest(updated)
  return updated
}

/** Start an accepted request's work, keeping the record the server answers with. */
export async function startRequestWork(
  id: string,
  choice: WorkLaunchChoice,
): Promise<FeatureRequest | undefined> {
  const res = await startFeatureRequestWork({ path: { id }, body: choice, throwOnError: true })
  const updated = res.data as FeatureRequest | undefined
  if (updated) upsertFeatureRequest(updated)
  return updated
}

async function rejectRequest(id: string, reason?: string): Promise<FeatureRequest | undefined> {
  const res = await rejectFeatureRequest({
    path: { id },
    body: reason?.trim() ? { reason: reason.trim() } : {},
    throwOnError: true,
  })
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

type FeatureRequestSocket = {
  on: (event: string, handler: (data: unknown) => void) => () => void
}

let holders = 0
let stopListening: (() => void) | undefined

/**
 * Keep the request store current for one more view: the first holder reads the
 * list and listens for `featureRequest:updated`; every later one shares both, so
 * a chat whose rows each show a request reads the list once, not once per row.
 * Returns the release, which counts once however often it is called.
 */
export function holdFeatureRequests(ws: FeatureRequestSocket): () => void {
  holders += 1
  if (holders === 1) {
    stopListening = ws.on('featureRequest:updated', (fr) =>
      upsertFeatureRequest(fr as FeatureRequest),
    )
    void seedFeatureRequests()
  }
  let released = false
  return () => {
    if (released) return
    released = true
    holders -= 1
    if (holders > 0) return
    stopListening?.()
    stopListening = undefined
  }
}

/**
 * One request's record from the shared store, kept current while shown when the
 * API is there to hold the feed — read as it stands where it is not.
 */
export function useFeatureRequestRecord(id: string): FeatureRequest | undefined {
  const ws = useOptionalApi()?.ws
  const snapshot = useSyncExternalStore(
    subscribeFeatureRequests,
    featureRequestsSnapshot,
    featureRequestsSnapshot,
  )
  useEffect(() => (ws ? holdFeatureRequests(ws) : undefined), [ws])
  return requestById(snapshot, id)
}

/**
 * Live, account-global view of cross-project feature requests, kept current by
 * `featureRequest:updated` (the full record is broadcast) and read from the list
 * endpoint when the first view showing them mounts — every view shares that.
 */
export function useCrossProjectRequests(): CrossProjectRequestsState {
  const { ws } = useApi()
  const snapshot = useSyncExternalStore(subscribeFeatureRequests, featureRequestsSnapshot)

  useEffect(() => holdFeatureRequests(ws), [ws])

  const outboxForFn = useCallback((id: string) => outboxFor(snapshot, id), [snapshot])
  const inboxForFn = useCallback((id: string) => inboxFor(snapshot, id), [snapshot])
  const requestByIdFn = useCallback((id: string) => requestById(snapshot, id), [snapshot])

  return {
    requests: sortedRequests(snapshot),
    pending: pendingCount(snapshot),
    inFlight: inFlightCount(snapshot),
    badgeCount: badgeCount(snapshot),
    outboxFor: outboxForFn,
    inboxFor: inboxForFn,
    requestById: requestByIdFn,
    accept: acceptRequest,
    startWork: startRequestWork,
    reject: rejectRequest,
    markDelivered: markRequestDelivered,
    handOver: handOverRequest,
    startAgain: startRequestAgain,
  }
}
