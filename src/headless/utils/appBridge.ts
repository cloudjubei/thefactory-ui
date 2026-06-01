/**
 * Protocol for the App↔Overseer `postMessage` bridge — the channel between
 * an embedded project app (iframe on web/desktop, `<WebView>` on native) and
 * the `ProjectAppView` wrapper. The app asks Overseer to do things it can't
 * (and shouldn't) do itself; the wrapper holds the authed context, so the
 * sandboxed app never holds a credential.
 *
 * Transport lives in the `ProjectAppView` web/native peers; semantics are
 * supplied by the host via an `onBridgeMessage` handler. These types + the
 * pure parse/build helpers are the shared, testable core.
 */

export const BRIDGE_PREFIX = 'overseer:'

/** Inbound message from the embedded app. `type` is always `overseer:<name>`. */
export interface BridgeRequest {
  /** Correlation id the app supplies so it can match the response. Optional (fire-and-forget). */
  id?: string
  /** Namespaced message type, e.g. `overseer:ready`, `overseer:toast`. */
  type: string
  /** Arbitrary message payload. */
  payload?: unknown
}

/** Outbound response posted back into the app. Marked so the app can filter it from other messages. */
export interface BridgeResponse {
  overseerBridgeResponse: true
  id?: string
  ok: boolean
  result?: unknown
  error?: string
}

/** The bare name after the `overseer:` prefix, e.g. `ready`, `toast`, `data.put`. */
export function bridgeMessageName(type: string): string {
  return type.startsWith(BRIDGE_PREFIX) ? type.slice(BRIDGE_PREFIX.length) : type
}

/**
 * Validate + normalize a raw `postMessage` payload into a `BridgeRequest`.
 * Returns `null` for anything that isn't a well-formed `overseer:`-prefixed
 * message (other messages on the channel are ignored). Accepts a JSON string
 * (the native WebView path posts strings) or an already-parsed object (the
 * web iframe path).
 */
export function parseBridgeMessage(raw: unknown): BridgeRequest | null {
  let obj: unknown = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof obj !== 'object' || obj === null) return null
  const rec = obj as Record<string, unknown>
  if (typeof rec.type !== 'string' || !rec.type.startsWith(BRIDGE_PREFIX)) return null
  const req: BridgeRequest = { type: rec.type }
  if (typeof rec.id === 'string') req.id = rec.id
  if ('payload' in rec) req.payload = rec.payload
  return req
}

/** Build the response envelope for a request, from a handler's result or error. */
export function buildBridgeResponse(
  req: BridgeRequest,
  outcome: { result?: unknown } | { error: string },
): BridgeResponse {
  const base: BridgeResponse = { overseerBridgeResponse: true, ok: !('error' in outcome) }
  if (req.id !== undefined) base.id = req.id
  if ('error' in outcome) base.error = outcome.error
  else base.result = outcome.result
  return base
}
