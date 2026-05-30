import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { WebView } from 'react-native-webview'

export type ProjectAppViewProps = {
  /** Absolute URL to the project's App view (with the signed `viewToken`). `undefined` while loading. */
  url: string | undefined
  /** Bump to force a remount of the underlying WebView — typically the `key` returned by `useProjectAppView`. */
  remountKey?: number
  /** Rendered when `url` is `undefined` (e.g. token still being granted). */
  fallback?: ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * Native peer for the App-view surface. Mirrors the web peer's prop API
 * 1:1. The host project ships `react-native-webview` (declared as an
 * optional peer dependency on this package).
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
