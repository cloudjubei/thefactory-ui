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
 * 1:1. `react-native-webview` is a hard `import` here on purpose: this
 * module is reached only through the dedicated `thefactory-ui/native/ProjectAppView`
 * subpath (never the native barrel), so a consumer that doesn't ship the
 * WebView native module simply never imports it. Guarding the import at
 * runtime doesn't survive bundling — esbuild/tsup rewrites `require` into a
 * shim that can't resolve a Metro native module — so the module-graph
 * isolation is the protection, not a try/catch.
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
