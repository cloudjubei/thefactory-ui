import { createContext, useContext, useEffect, useImperativeHandle, useState } from 'react'
import type { ReactNode, Ref } from 'react'
import { View } from 'react-native'

/** Opt-in fake bridge surface; other native panels keep their empty WebView frame. */
export const WebViewFixture = createContext<
  ((active: boolean, post: (message: unknown) => void) => ReactNode) | null
>(null)

export function WebView({
  ref,
  onMessage,
  onLoadEnd,
}: {
  ref?: Ref<{ injectJavaScript: (script: string) => void }>
  onMessage?: (event: { nativeEvent: { data: string } }) => void
  onLoadEnd?: () => void
}) {
  const renderFixture = useContext(WebViewFixture)
  const [active, setActive] = useState(false)
  useImperativeHandle(ref, () => ({
    injectJavaScript(script) {
      if (!renderFixture) return
      // Read only ProjectAppView's fixed MessageEvent envelope, never evaluate injected code.
      const prefix = "(function(){window.dispatchEvent(new MessageEvent('message',{data:"
      const suffix = '}));})();true;'
      if (!script.startsWith(prefix) || !script.endsWith(suffix)) return
      const message = JSON.parse(JSON.parse(script.slice(prefix.length, -suffix.length)))
      if (message.type === 'overseer:pick.set') setActive(message.payload.active === true)
    },
  }))
  useEffect(() => {
    if (renderFixture) onLoadEnd?.()
  }, [renderFixture])
  return (
    <View style={{ flex: 1 }}>
      {renderFixture?.(active, (message) =>
        onMessage?.({ nativeEvent: { data: JSON.stringify(message) } }),
      )}
    </View>
  )
}

export default WebView
