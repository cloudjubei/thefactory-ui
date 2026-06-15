// Protocol for the App↔Overseer `postMessage` bridge between an embedded
// project app (iframe / `<WebView>`) and the `ProjectAppView` wrapper.
//
// Building an app surface? See docs/ARCHITECTURE.md "Embedded project apps (the
// App view)" — note the REQUIRED asset-freshness convention: `index.html` is
// always fresh (one-time viewToken URL) but stable-named external `app.js`/
// `style.css` can be held STALE by the embedding frame across reloads, so either
// inline them or load them with a per-load cache-bust (the canonical snippet is
// in that doc).

export const BRIDGE_PREFIX = 'overseer:'

export interface BridgeRequest {
  /** Correlation id; omit for fire-and-forget. */
  id?: string
  type: string
  payload?: unknown
}

/** The `overseerBridgeResponse` marker lets the app filter responses from other messages. */
export interface BridgeResponse {
  overseerBridgeResponse: true
  id?: string
  ok: boolean
  result?: unknown
  error?: string
}

export function bridgeMessageName(type: string): string {
  return type.startsWith(BRIDGE_PREFIX) ? type.slice(BRIDGE_PREFIX.length) : type
}

/**
 * Normalize a raw `postMessage` payload into a `BridgeRequest`, or `null` if
 * it isn't an `overseer:`-prefixed message. Accepts a JSON string (native
 * WebView) or an object (web iframe).
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
