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
   * Bridge handler for messages the embedded app posts. Returned value →
   * response `result`; thrown error → response `error`; `undefined` →
   * fire-and-forget. Omit to ignore the bridge.
   */
  onBridgeMessage?: (req: BridgeRequest) => unknown | Promise<unknown>
  /**
   * Host chrome floated over the top-right of the surface, aligned with the
   * app's own tab row (the App tab passes its activity-model chip here). Apps
   * reserve a matching right-side gutter on their tab bar so tabs never slide
   * under it. Only its own children capture pointer events.
   */
  topRightOverlay?: ReactNode
  className?: string
  style?: CSSProperties
  title?: string
}

/** Web peer for the App-view surface: the project's files in a sandboxed iframe + the App↔Overseer bridge. */
export default function ProjectAppView({
  url,
  remountKey = 0,
  fallback,
  onBridgeMessage,
  topRightOverlay,
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

  const overlay = topRightOverlay ? (
    <div className="pointer-events-none absolute right-3 top-2 z-10 *:pointer-events-auto">
      {topRightOverlay}
    </div>
  ) : null

  if (!url) {
    return (
      <div className={className} style={{ position: 'relative', ...style }}>
        {fallback ?? null}
        {overlay}
      </div>
    )
  }
  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <iframe
        ref={iframeRef}
        key={remountKey}
        src={url}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        style={{ border: 0, width: '100%', height: '100%' }}
        title={title}
      />
      {overlay}
    </div>
  )
}

function safeOrigin(u: string): string | null {
  try {
    return new URL(u).origin
  } catch {
    return null
  }
}
