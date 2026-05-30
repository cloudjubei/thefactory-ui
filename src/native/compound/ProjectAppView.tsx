import type { ComponentType, ReactNode } from 'react'
import { Text, View, type StyleProp, type ViewStyle } from 'react-native'

export type ProjectAppViewProps = {
  /** Absolute URL to the project's App view (with the signed `viewToken`). `undefined` while loading. */
  url: string | undefined
  /** Bump to force a remount of the underlying WebView — typically the `key` returned by `useProjectAppView`. */
  remountKey?: number
  /** Rendered when `url` is `undefined` (e.g. token still being granted). */
  fallback?: ReactNode
  style?: StyleProp<ViewStyle>
}

type WebViewLikeProps = {
  source: { uri: string }
  originWhitelist?: string[]
  javaScriptEnabled?: boolean
  style?: StyleProp<ViewStyle>
}

// `react-native-webview` is an OPTIONAL peer that pulls in a native module
// (`RNCWebViewModule`); on a binary not rebuilt after adding the dep, its
// entry throws at eval time. A guarded require keeps that failure local —
// the component degrades to a message instead of crashing the whole route.
let ResolvedWebView: ComponentType<WebViewLikeProps> | null = null
try {
  ResolvedWebView = require('react-native-webview').WebView
} catch {
  ResolvedWebView = null
}

/**
 * Native peer for the App-view surface. Mirrors the web peer's prop API
 * 1:1.
 */
export default function ProjectAppView({
  url,
  remountKey = 0,
  fallback,
  style,
}: ProjectAppViewProps) {
  if (!url) {
    return <View style={style}>{fallback ?? null}</View>
  }
  if (!ResolvedWebView) {
    return (
      <View style={[styles.missing, style]}>
        <Text style={styles.missingText}>
          The app viewer needs the native WebView module. Rebuild the app binary after installing
          react-native-webview.
        </Text>
      </View>
    )
  }
  const WebView = ResolvedWebView
  return (
    <WebView
      key={remountKey}
      source={{ uri: url }}
      originWhitelist={['*']}
      javaScriptEnabled
      style={style}
    />
  )
}

const styles = {
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 } as ViewStyle,
  missingText: { color: '#6b7280', textAlign: 'center' } as const,
}
