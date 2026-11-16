import { attachmentDisplayName } from 'thefactory-tools/utils'
import { CHAT_FILE_GONE_STATUS, CHAT_FILE_PREVIEW_PROJECT } from './chatFilePreviewConstants'
import type { ChatFileReadFailure, ChatFileSourceOf } from './chatFilePreviewTypes'
import type { FilePreviewTarget } from './filePreviewTypes'

/** A failed read of a chat file, by the status it answered with. Pure. */
export function chatFileReadFailure(status: number = CHAT_FILE_GONE_STATUS): ChatFileReadFailure {
  return { isAxiosError: true, response: { status } }
}

/** A chat file as a preview's target: named without the store's prefix. Pure. */
export function chatFilePreviewTarget(path: string): FilePreviewTarget {
  return { projectId: CHAT_FILE_PREVIEW_PROJECT, path, name: attachmentDisplayName(path) }
}

/**
 * A chat file read through the URL a message's thumbnails use — a blob URL,
 * let go once the contents are read. Pure: the reads happen on each call.
 */
export function chatFileSourceFromPreviewUrl(
  getPreviewUrl: (path: string) => Promise<string | null>,
  revoke: (url: string) => void,
): ChatFileSourceOf {
  return async (path) => {
    const url = await getPreviewUrl(path)
    return url ? { url, release: () => revoke(url) } : null
  }
}
