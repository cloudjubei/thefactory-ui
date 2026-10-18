import type { BridgeRequest } from './appBridge'
import type { AppPushListener } from './appPushChannelTypes'

/**
 * Host→app pushes for one mounted App view: the host posts, the `ProjectAppView` that frames the
 * app subscribes and delivers each one into its iframe / WebView. A push nobody listens for is dropped.
 */
export class AppPushChannel {
  private readonly _listeners = new Set<AppPushListener>()

  post(message: BridgeRequest): void {
    for (const listener of this._listeners) listener(message)
  }

  subscribe(listener: AppPushListener): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }
}
