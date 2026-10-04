import type { WsConnectionState } from '../api/WsClient'

/**
 * Whether the socket just came back after dropping. Broadcasts sent while it
 * was down are never replayed, so whatever state was kept current by them must
 * be fetched again.
 */
export function isWsReopen(prev: WsConnectionState, next: WsConnectionState): boolean {
  return prev === 'closed' && next === 'open'
}
