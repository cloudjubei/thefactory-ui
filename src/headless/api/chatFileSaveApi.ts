import { CHAT_FILE_SAVE_COPY, CHAT_FILE_SAVE_ROUTE } from '../utils/chatFileSaveConstants'
import type { ChatFileSaveOutcome, ChatFileSaveRequest } from '../utils/chatFileSaveTypes'
import { errorStatus, extractErrorMessage } from './errorMessage'
import { client } from './generated/client.gen'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function existsFlag(err: unknown): boolean {
  if (errorStatus(err) === 409) return true
  const data = (err as { response?: { data?: { exists?: unknown } } } | null)?.response?.data
  return data?.exists === true
}

/**
 * Copy a file shown in a chat into its project. A taken destination comes back
 * as `exists`, to be asked again with `overwrite`. Written by hand until the SDK
 * is generated from this route.
 */
export async function saveChatFileToProject(
  projectId: string,
  request: ChatFileSaveRequest,
): Promise<ChatFileSaveOutcome> {
  try {
    const { data } = await client.post({
      url: `/api/v1/projects/${encodeURIComponent(projectId)}/${CHAT_FILE_SAVE_ROUTE}`,
      body: request,
      headers: JSON_HEADERS,
      throwOnError: true,
    })
    const path = (data as { path?: unknown } | undefined)?.path
    return { ok: true, path: typeof path === 'string' ? path : request.destination }
  } catch (err) {
    return {
      ok: false,
      error: extractErrorMessage(err, CHAT_FILE_SAVE_COPY.failed),
      exists: existsFlag(err),
    }
  }
}
