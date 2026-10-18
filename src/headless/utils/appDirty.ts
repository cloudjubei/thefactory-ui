import type { BridgeRequest } from './appBridge'
import { APP_DIRTY_DEFAULT_MESSAGE, APP_DIRTY_TYPE } from './appDirtyConstants'
import type { AppDirtyPayload } from './appDirtyTypes'

export function isAppDirtyRequest(req: BridgeRequest): boolean {
  return req.type === APP_DIRTY_TYPE
}

/** The `overseer:app.dirty` payload, or `null` when it carries no boolean `dirty`. */
export function parseAppDirtyPayload(payload: unknown): AppDirtyPayload | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null
  const rec = payload as Record<string, unknown>
  if (typeof rec.dirty !== 'boolean') return null
  const message = typeof rec.message === 'string' ? rec.message.trim() : ''
  return message ? { dirty: rec.dirty, message } : { dirty: rec.dirty }
}

/** What the host asks before leaving the app, or `null` when the app has nothing unsaved. */
export function appDirtyLeaveMessage(state: AppDirtyPayload | null): string | null {
  if (!state?.dirty) return null
  return state.message ?? APP_DIRTY_DEFAULT_MESSAGE
}
