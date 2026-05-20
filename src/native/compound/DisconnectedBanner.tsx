import { Text, View } from 'react-native'
import type { WsConnectionState } from '../../headless/api/WsClient'

export interface DisconnectedBannerProps {
  /** Current WS state from `useApi().wsState`. */
  wsState: WsConnectionState
  /** When false, banner is suppressed even if disconnected. Consumers gate
   *  on whether the user is past the login screen (token present + URL set);
   *  before that, the LoginScreen owns the user's attention. */
  visible?: boolean
}

/**
 * Native peer of desktop's `DisconnectedBanner`
 * (overseer-local/src/renderer/src/ui/components/shell/DisconnectedBanner.tsx).
 * Persistent strip surfaced when the WebSocket is not `open`. Informational
 * only — reconnect is handled by `WsClient`'s reconnecting-websocket logic.
 *
 * Presentational by design: it takes `wsState` + `visible` and lets the
 * consumer decide when to render based on its own auth shape (web's
 * `useAuth.token`-only vs desktop's `token + baseUrl` vs mobile's
 * future URL-aware variant).
 */
export default function DisconnectedBanner({ wsState, visible = true }: DisconnectedBannerProps) {
  if (!visible) return null
  if (wsState === 'open') return null

  const { label, sublabel } = describe(wsState)

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#fffbeb',
        borderBottomWidth: 1,
        borderBottomColor: '#fde68a',
      }}
    >
      <View
        accessibilityElementsHidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: dotColor(wsState),
        }}
      />
      <Text style={{ fontSize: 12, fontWeight: '500', color: '#78350f' }} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={{ fontSize: 12, color: '#78350f', opacity: 0.8, flexShrink: 1 }}
        numberOfLines={1}
      >
        {sublabel}
      </Text>
    </View>
  )
}

function describe(state: WsConnectionState): { label: string; sublabel: string } {
  switch (state) {
    case 'connecting':
      return {
        label: 'Connecting to backend…',
        sublabel: 'Live updates will resume once the connection is established.',
      }
    case 'closed':
      return {
        label: 'Disconnected from backend.',
        sublabel: 'Reconnecting automatically; views show their last-known data.',
      }
    case 'idle':
    default:
      return { label: 'Not connected.', sublabel: 'Live updates are paused.' }
  }
}

function dotColor(state: WsConnectionState): string {
  if (state === 'connecting') return '#f59e0b'
  return '#9ca3af'
}
