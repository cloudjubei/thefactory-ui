import { useRef, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
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
   * Host handler for App↔Overseer bridge messages. Same contract as the web
   * peer: return a value to send back as the response `result`, throw to send
   * an `error`, return `undefined` for fire-and-forget. Omit to ignore the bridge.
   */
  onBridgeMessage?: (req: BridgeRequest) => unknown | Promise<unknown>
  style?: StyleProp<ViewStyle>
}

/**
 * Native peer for the App-view surface. Mirrors the web peer's prop API 1:1.
 * The bridge transport here uses the WebView's `onMessage` (app → host, via
 * `window.ReactNativeWebView.postMessage`) and `injectJavaScript` (host → app,
 * delivered as a `message` event the app listens for). `react-native-webview`
 * is a hard import — this module is reached only through the dedicated
 * `thefactory-ui/native/ProjectAppView` subpath.
 */
export default function ProjectAppView({
  url,
  remountKey = 0,
  fallback,
  onBridgeMessage,
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

  if (!url) {
    return <View style={style}>{fallback ?? null}</View>
  }
  return (
    <WebView
      ref={webviewRef}
      key={remountKey}
      source={{ uri: url }}
      originWhitelist={['*']}
      javaScriptEnabled
      onMessage={onBridgeMessage ? handleMessage : undefined}
      style={style}
    />
  )
}

/** Deliver a response into the WebView as a `message` event the app listens for. */
function deliver(webview: WebView | null, response: unknown): void {
  if (!webview) return
  const json = JSON.stringify(JSON.stringify(response))
  webview.injectJavaScript(
    `(function(){window.dispatchEvent(new MessageEvent('message',{data:${json}}));})();true;`,
  )
}
