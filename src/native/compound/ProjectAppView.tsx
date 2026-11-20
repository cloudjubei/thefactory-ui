import { useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from 'react'
import { AppCaptureRequests, type ProjectAppViewHandle } from '../../headless/utils/appCapture'
import { useLiveAppCapture } from '../../headless/hooks/useLiveAppCapture'
export type { ProjectAppViewHandle } from '../../headless/utils/appCapture'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import {
  bridgeMessageName,
  buildBridgeResponse,
  buildNavOpenMessage,
  parseBridgeMessage,
  type BridgeRequest,
} from '../../headless/utils/appBridge'
import { useAppElementPicker } from '../../headless/hooks/useAppElementPicker'
import type { AppElementPick } from '../../headless/utils/appNotesTypes'
import { Text, Pressable } from 'react-native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { NAV_CHANGED_MESSAGE } from '../../headless/utils/appBridgeConstants'
import type { AppPushChannel } from '../../headless/utils/appPushChannel'
import {
  parseAppDeepLink,
  serializeAppDeepLink,
  shouldPushDeepLink,
  type AppDeepLink,
} from '../../headless/utils/appDeepLink'

export type ProjectAppViewProps = {
  ref?: Ref<ProjectAppViewHandle>
  /** Controlled by the launching chat. Picks are structured context, never rendered HTML. */
  pickMode?: boolean
  onElementPick?: (pick: AppElementPick) => void
  onExitPickMode?: () => void
  /** Enable WS live capture for this mounted project's App. */
  projectId?: string
  /** Absolute URL to the project's App view (with the signed `viewToken`). `undefined` while loading. */
  url: string | undefined
  /** Bump to force a remount of the underlying WebView — typically the `key` returned by `useProjectAppView`. */
  remountKey?: number
  /**
   * The App tab's current deep-link. When it CHANGES while the WebView stays mounted, it is PUSHED to the
   * running app via `nav.open` (a boot-time `nav.current` pull would miss a change without a remount). A
   * fresh mount/remount does NOT push. `undefined`/`null` ⇒ no deep-link.
   */
  deepLink?: AppDeepLink | null
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
  /** Host→app pushes (`useAppBridgePushes`), each delivered into the running app as it is posted. */
  pushes?: AppPushChannel
  /**
   * The app reported where it is (`overseer:nav.changed {view, params}`). The host mirrors it in its own
   * URL (a replace, never a remount); the deep-link that comes back from that is not pushed to the app
   * as `nav.open`, since the app is already there. Omit to pass the message to `onBridgeMessage`.
   */
  onNavChanged?: (deepLink: AppDeepLink) => void
  style?: StyleProp<ViewStyle>
}

// Native peer for the App-view surface. Reached only via the dedicated
// `thefactory-ui/native/ProjectAppView` subpath (not the barrel) because the
// `react-native-webview` hard import pulls in a native module.
export default function ProjectAppView({
  ref,
  pickMode = false,
  onElementPick,
  onExitPickMode,
  projectId,
  url,
  remountKey = 0,
  fallback,
  onBridgeMessage,
  deepLink,
  topRightOverlay,
  pushes,
  onNavChanged,
  style,
}: ProjectAppViewProps) {
  const webviewRef = useRef<WebView | null>(null)
  const { theme } = useNativeTheme()
  const picker = useAppElementPicker({
    active: !!url && pickMode,
    mountKey: `${url}:${remountKey}`,
    onPick: onElementPick,
    send: (message) => deliver(webviewRef.current, message),
  })
  const captureRef = useRef<AppCaptureRequests | null>(null)
  if (!captureRef.current)
    captureRef.current = new AppCaptureRequests((request) => {
      if (!webviewRef.current) throw new Error('No App view is mounted.')
      deliver(webviewRef.current, request)
    })
  useImperativeHandle(ref, () => captureRef.current!, [])
  useLiveAppCapture(url ? projectId : undefined, captureRef)
  useEffect(() => () => captureRef.current?.cancel(), [url, remountKey])

  // Host→app deep-link PUSH (mirror of web ProjectAppView) — see shouldPushDeepLink. Emits via the existing
  // `deliver` (injects a MessageEvent), so no new native plumbing.
  const serializedDeepLink = serializeAppDeepLink(deepLink)
  const lastSerializedRef = useRef<string | null>(null)
  const lastRemountRef = useRef(remountKey)
  useEffect(() => {
    if (lastRemountRef.current !== remountKey) {
      lastRemountRef.current = remountKey
      lastSerializedRef.current = null
    }
    const prev = lastSerializedRef.current
    lastSerializedRef.current = serializedDeepLink
    if (!url || !deepLink) return
    if (!shouldPushDeepLink(prev, serializedDeepLink)) return
    deliver(webviewRef.current, buildNavOpenMessage(deepLink))
  }, [serializedDeepLink, url, remountKey, deepLink])

  useEffect(() => {
    if (!pushes || !url) return
    return pushes.subscribe((message) => deliver(webviewRef.current, message))
  }, [pushes, url])

  const handleMessage = async (event: WebViewMessageEvent) => {
    if (captureRef.current?.receive(event.nativeEvent.data)) return
    const req = parseBridgeMessage(event.nativeEvent.data)
    if (!req) return
    if (picker.receive(req.type, req.payload)) return
    if (onNavChanged && bridgeMessageName(req.type) === NAV_CHANGED_MESSAGE) {
      const reported = parseAppDeepLink(req.payload)
      if (reported) {
        // The route change this causes comes back as the deepLink prop; the app is already there.
        lastSerializedRef.current = serializeAppDeepLink(reported)
        onNavChanged(reported)
      }
      if (req.id !== undefined) {
        deliver(webviewRef.current, buildBridgeResponse(req, { result: { ok: true } }))
      }
      return
    }
    if (!onBridgeMessage) return
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
        onMessage={handleMessage}
        onLoadStart={() => captureRef.current?.cancel()}
        onLoadEnd={() => picker.sync()}
        // Match the fixed-page feel of the web/desktop iframe: no rubber-band
        // overscroll, which would otherwise reveal the WebView backing behind the
        // app's own background.
        bounces={false}
        overScrollMode="never"
        style={styles.fill}
      />
      {overlay}
      {pickMode ? (
        <View
          style={{
            position: 'absolute',
            left: 8,
            right: 8,
            top: 8,
            padding: 12,
            gap: 8,
            borderRadius: 8,
            backgroundColor: theme.surface.raised,
            borderWidth: 1,
            borderColor: theme.accent.primary,
          }}
        >
          <Text accessibilityRole="text" style={{ color: theme.text.primary }}>
            Pick elements to comment in your chat
          </Text>
          {onExitPickMode ? (
            <Pressable accessibilityRole="button" onPress={onExitPickMode}>
              <Text style={{ color: theme.accent.primary }}>Done picking</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
