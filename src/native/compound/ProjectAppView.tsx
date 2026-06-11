import { useRef, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import {
  buildBridgeResponse,
  parseBridgeMessage,
  type BridgeRequest,
} from '../../headless/utils/appBridge'

export type ProjectAppViewProps = {
  /** Absolute URL to the project's App view (with the signed `viewToken`). `undefined` while loading. */
  url: string | undefined
  /** Bump to force a remount of the underlying WebView — typically the `key` returned by `useProjectAppView`. */
  remountKey?: number
  /** Rendered when `url` is `undefined` (e.g. token still being granted). */
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
   * under it. `box-none` lets touches outside the chip reach the WebView.
   */
  topRightOverlay?: ReactNode
  style?: StyleProp<ViewStyle>
}

// Native peer for the App-view surface. Reached only via the dedicated
// `thefactory-ui/native/ProjectAppView` subpath (not the barrel) because the
// `react-native-webview` hard import pulls in a native module.
export default function ProjectAppView({
  url,
  remountKey = 0,
  fallback,
  onBridgeMessage,
  topRightOverlay,
  style,
}: ProjectAppViewProps) {
  const webviewRef = useRef<WebView | null>(null)

  const handleMessage = async (event: WebViewMessageEvent) => {
    if (!onBridgeMessage) return
    const req = parseBridgeMessage(event.nativeEvent.data)
    if (!req) return
    try {
      const result = await onBridgeMessage(req)
      if (req.id !== undefined) deliver(webviewRef.current, buildBridgeResponse(req, { result }))
    } catch (err) {
      if (req.id !== undefined) {
        deliver(
          webviewRef.current,
          buildBridgeResponse(req, { error: err instanceof Error ? err.message : String(err) }),
        )
      }
    }
  }

  const overlay = topRightOverlay ? (
    <View style={styles.overlay} pointerEvents="box-none">
      {topRightOverlay}
    </View>
  ) : null

  if (!url) {
    return (
      <View style={[styles.container, style]}>
        {fallback ?? null}
        {overlay}
      </View>
    )
  }
  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webviewRef}
        key={remountKey}
        source={{ uri: url }}
        originWhitelist={['*']}
        javaScriptEnabled
        onMessage={onBridgeMessage ? handleMessage : undefined}
        // Match the fixed-page feel of the web/desktop iframe: no rubber-band
        // overscroll, which would otherwise reveal the WebView backing behind the
        // app's own background.
        bounces={false}
        overScrollMode="never"
        style={styles.fill}
      />
      {overlay}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  fill: { flex: 1 },
  overlay: { position: 'absolute', top: 8, right: 12, zIndex: 10 },
})

/** Deliver a response into the WebView as a `message` event the app listens for. */
function deliver(webview: WebView | null, response: unknown): void {
  if (!webview) return
  const json = JSON.stringify(JSON.stringify(response))
  webview.injectJavaScript(
    `(function(){window.dispatchEvent(new MessageEvent('message',{data:${json}}));})();true;`,
  )
}
