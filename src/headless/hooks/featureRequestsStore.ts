/**
 * A tiny module-level store of cross-project feature requests, keyed by request id and
 * account-GLOBAL (not per-project like {@link ./activitiesStore}) — the background inspector shows
 * every request from→to across all projects. Fed by `featureRequest:updated` WS events carrying the
 * full record, and seeded once from the unfiltered list endpoint. Read via
 * {@link ../hooks/useCrossProjectRequests}.
 */

import type { ChatContext, FeatureRequest, FeatureRequestStatus } from 'thefactory-tools/types'

/** Non-pending, non-terminal statuses — a request whose B-side work is under way. */
const IN_FLIGHT_STATUSES: readonly FeatureRequestStatus[] = ['accepted', 'in_progress', 'in_review']

/** A request is "open" while it still waits on its target — pending or in-flight (not terminal). */
function isOpenStatus(status: FeatureRequestStatus): boolean {
  return status === 'pending' || IN_FLIGHT_STATUSES.includes(status)
}

let byId: Record<string, FeatureRequest> = {}
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

/** Upsert one request, replacing any prior record with its id. Ignores a record with no string id. */
export function upsertFeatureRequest(request: FeatureRequest): void {
  if (!request || typeof request.id !== 'string') return
  byId = { ...byId, [request.id]: request }
  emit()
}

/** Replace the whole store from a `listFeatureRequests` seed. */
export function replaceFeatureRequests(requests: ReadonlyArray<FeatureRequest>): void {
  byId = Object.fromEntries(requests.map((r) => [r.id, r]))
  emit()
}

export function subscribeFeatureRequests(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Current snapshot (stable reference until the next change). */
export function featureRequestsSnapshot(): Record<string, FeatureRequest> {
  return byId
}

/** Look one request up by id — the live record behind a `requestProjectFeature` tool result. */
export function requestById(
  snapshot: Record<string, FeatureRequest>,
  id: string,
): FeatureRequest | undefined {
  return snapshot[id]
}

/** All requests, most-recently-updated first — the inspector's ordered feed. */
export function sortedRequests(snapshot: Record<string, FeatureRequest>): FeatureRequest[] {
  return Object.values(snapshot).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Requests awaiting a human accept/reject decision. */
export function pendingCount(snapshot: Record<string, FeatureRequest>): number {
  return Object.values(snapshot).filter((r) => r.status === 'pending').length
}

/** Requests whose B-side work is under way (accepted / in_progress / in_review). */
export function inFlightCount(snapshot: Record<string, FeatureRequest>): number {
  return Object.values(snapshot).filter((r) => IN_FLIGHT_STATUSES.includes(r.status)).length
}

/** Inspector badge: everything still open — pending + in-flight (terminal states drop off). */
export function badgeCount(snapshot: Record<string, FeatureRequest>): number {
  return pendingCount(snapshot) + inFlightCount(snapshot)
}

/** Requests emitted BY a project (its outbox). */
export function outboxFor(
  snapshot: Record<string, FeatureRequest>,
  fromProjectId: string,
): FeatureRequest[] {
  return sortedRequests(snapshot).filter((r) => r.requestedBy.fromProjectId === fromProjectId)
}

/** Requests targeting a project (its inbox). */
export function inboxFor(
  snapshot: Record<string, FeatureRequest>,
  targetProjectId: string,
): FeatureRequest[] {
  return sortedRequests(snapshot).filter((r) => r.targetProjectId === targetProjectId)
}

/**
 * Open requests EMITTED from a chat, matched by its context key — drives the "Waiting on «B»…"
 * banner (and, when any carry `cycleFlag.detected`, the D.5 cycle warning) on the sender's chat.
 * `keyOf` maps a `ChatContext` to its key (the host passes thefactory-tools `getChatContextKey`),
 * keeping this selector node-free + unit-testable.
 */
export function openRequestsFromChat(
  snapshot: Record<string, FeatureRequest>,
  contextKey: string,
  keyOf: (ctx: ChatContext) => string,
): FeatureRequest[] {
  return sortedRequests(snapshot).filter(
    (r) => isOpenStatus(r.status) && keyOf(r.requestedBy.fromChatContext) === contextKey,
  )
}
