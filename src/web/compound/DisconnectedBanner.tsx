import { useEffect, useState } from 'react'
import type { WsConnectionState } from '../../headless/api/WsClient'

export interface DisconnectedBannerProps {
  /** Current WS state from `useApi().wsState`. */
  wsState: WsConnectionState
  /** When false, banner is suppressed even if disconnected. Consumers gate
   *  on whether the user is past the login screen (token present + URL set);
   *  before that, the LoginScreen owns the user's attention. */
  visible?: boolean
  /** Show the banner only after the WS has been non-`open` continuously for
   *  this many ms — collapses transient flickers (e.g. a refetch that briefly
   *  drops the socket). Default `3000`. */
  graceMs?: number
}

/**
 * Web peer of the native `DisconnectedBanner`. Persistent strip surfaced when
 * the WebSocket is not `open` for longer than `graceMs`. Informational only —
 * reconnect is handled by `WsClient`'s reconnecting-websocket logic.
 *
 * The grace window prevents transient flickers (e.g. a backend operation that
 * briefly drops the socket) from painting a banner; only genuine drops
 * surface.
 */
export default function DisconnectedBanner({
  wsState,
  visible = true,
  graceMs = 3000,
}: DisconnectedBannerProps) {
  const stableDown = useStableNonOpen(wsState, graceMs)
  if (!visible) return null
  if (!stableDown) return null

  const { label, sublabel } = describe(wsState)

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 px-4 py-1.5 text-xs border-b"
      style={{
        background: 'var(--color-amber-50, #fffbeb)',
        color: 'var(--color-amber-900, #78350f)',
        borderColor: 'var(--color-amber-200, #fde68a)',
      }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: dotColor(wsState) }}
        aria-hidden
      />
      <span className="font-medium">{label}</span>
      <span className="opacity-80">{sublabel}</span>
    </div>
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
  if (state === 'connecting') return 'var(--color-orange-500, #f59e0b)'
  return 'var(--color-gray-400, #9ca3af)'
}

function useStableNonOpen(wsState: WsConnectionState, graceMs: number): boolean {
  const [down, setDown] = useState(false)
  useEffect(() => {
    if (wsState === 'open') {
      setDown(false)
      return
    }
    const t = setTimeout(() => setDown(true), graceMs)
    return () => clearTimeout(t)
  }, [wsState, graceMs])
  return down
}
