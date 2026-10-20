import type { AppChatSidebarRequest } from './appChatSidebarTypes'

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * What an app's `chat.requestSidebar {runId?, message?}` asks for: the process run whose own chat
 * opens beside it, and a message the host sends into that chat. Neither, and the project's chat
 * opens; a message without a run is dropped.
 */
export function parseAppChatSidebar(payload: unknown): AppChatSidebarRequest {
  const rec = payload as { runId?: unknown; message?: unknown } | null | undefined
  const runId = text(rec?.runId)
  if (!runId) return {}
  const message = text(rec?.message)
  return message ? { runId, message } : { runId }
}
