import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import {
  buildBridgeResponse,
  parseBridgeMessage,
  type BridgeRequest,
} from '../../headless/utils/appBridge'

export type ProjectAppViewProps = {
  /** Absolute URL to the project's App view (with the signed `viewToken`). `undefined` while loading. */
  url: string | undefined
  /** Bump to force a remount of the underlying iframe — typically the `key` returned by `useProjectAppView`. */
  remountKey?: number
  /** Rendered when `url` is `undefined` (e.g. token still being granted, or project has no preview yet). */
  fallback?: ReactNode
  /**
   * Host handler for App↔Overseer bridge messages the embedded app posts.
   * Return a value to send back as the response `result`, throw/reject to send
   * an `error`, or return `undefined` for fire-and-forget. Omit to ignore the
   * bridge entirely (the app then behaves as a plain iframe).
   */
  onBridgeMessage?: (req: BridgeRequest) => unknown | Promise<unknown>
  className?: string
  style?: CSSProperties
  /** Forwarded to the iframe; defaults to a descriptive a11y title. */
  title?: string
}

/**
 * Web peer for the App-view surface. Renders the project's current files
 * inside a sandboxed iframe and, when `onBridgeMessage` is supplied, runs the
 * App↔Overseer `postMessage` bridge: it validates that messages come from
 * this iframe at the served origin, dispatches them to the host handler, and
 * posts the response back. The iframe is cross-origin to the host, so it
 * cannot reach the host window's state directly — the bridge is the only seam.
 */
export default function ProjectAppView({
  url,
  remountKey = 0,
  fallback,
  onBridgeMessage,
  className,
  style,
  title = 'Project app view',
}: ProjectAppViewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const handlerRef = useRef(onBridgeMessage)
  handlerRef.current = onBridgeMessage

  const expectedOrigin = url ? safeOrigin(url) : null

  useEffect(() => {
    if (!expectedOrigin) return
    const onMessage = async (event: MessageEvent) => {
      const handler = handlerRef.current
      if (!handler) return
      const iframe = iframeRef.current
      if (!iframe || event.source !== iframe.contentWindow) return
      if (event.origin !== expectedOrigin) return
      const req = parseBridgeMessage(event.data)
      if (!req) return
      try {
        const result = await handler(req)
        if (req.id !== undefined) {
          iframe.contentWindow?.postMessage(buildBridgeResponse(req, { result }), expectedOrigin)
        }
      } catch (err) {
        if (req.id !== undefined) {
          iframe.contentWindow?.postMessage(
            buildBridgeResponse(req, { error: err instanceof Error ? err.message : String(err) }),
            expectedOrigin,
          )
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [expectedOrigin])

  if (!url) {
    return (
      <div className={className} style={style}>
        {fallback ?? null}
      </div>
    )
  }
  return (
    <iframe
      ref={iframeRef}
      key={remountKey}
      src={url}
      sandbox="allow-scripts allow-same-origin"
      className={className}
      style={{ border: 0, width: '100%', height: '100%', ...style }}
      title={title}
    />
  )
}

function safeOrigin(u: string): string | null {
  try {
    return new URL(u).origin
  } catch {
    return null
  }
}
