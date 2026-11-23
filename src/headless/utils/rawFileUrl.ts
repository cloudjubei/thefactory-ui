import { chatAttachmentPathInStore } from 'thefactory-tools/utils'
import type { ChatContext } from '../api/generated'

/**
 * Builds the backend URL that serves a project file's raw bytes. Used by
 * the image / PDF / binary viewers, which fetch this URL with the auth
 * token (web as a blob, native via `Image` headers / a download).
 */
export function rawFileUrl(apiBaseUrl: string, projectId: string, path: string): string {
  const base = apiBaseUrl.replace(/\/+$/, '')
  return `${base}/api/v1/projects/${encodeURIComponent(projectId)}/files/raw?path=${encodeURIComponent(path)}`
}

/**
 * The backend URL that serves the raw bytes of a file a chat holds — attached
 * to it or shown in it — from wherever the chat keeps them: its project, its
 * group's workspace, or the global chat workspace.
 */
export function chatAttachmentRawUrl(
  apiBaseUrl: string,
  context: ChatContext,
  path: string,
): string {
  const base = apiBaseUrl.replace(/\/+$/, '')
  const query = new URLSearchParams({ path, context: JSON.stringify(context) })
  return `${base}/api/v1/chat-attachments/raw?${query.toString()}`
}

/**
 * Where a chat's file is read: a file the chat keeps — attached to it or shown
 * in it — from where the chat keeps it, which for a project chat is the
 * project's data home, not its checkout; any other file a project chat names
 * through its project's files.
 */
export function chatFileRawUrl(apiBaseUrl: string, context: ChatContext, path: string): string {
  return context.projectId && !chatAttachmentPathInStore(path)
    ? rawFileUrl(apiBaseUrl, context.projectId, path)
    : chatAttachmentRawUrl(apiBaseUrl, context, path)
}
