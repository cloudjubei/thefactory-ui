import { chatFileReadFailure } from '../utils/chatFilePreview'
import type { ChatFileSourceOf } from '../utils/chatFilePreviewTypes'
import type { FilePreviewCalls, FilePreviewInfo } from '../utils/filePreviewTypes'

/**
 * A preview's reads for a chat's own files: fetched from where the chat holds
 * them, never the project's Files API — so a file shows in any chat. The
 * source is asked for on each read, so it can change under a mounted preview.
 */
export class ChatFilePreviewCalls implements FilePreviewCalls {
  private readonly _sourceOf: () => ChatFileSourceOf

  constructor(sourceOf: () => ChatFileSourceOf) {
    this._sourceOf = sourceOf
  }

  readText = (_projectId: string, path: string): Promise<string> =>
    this.read(path, (response) => response.text())

  readBytes = (_projectId: string, path: string): Promise<ArrayBuffer> =>
    this.read(path, (response) => response.arrayBuffer())

  readInfo = async (): Promise<FilePreviewInfo | undefined> => undefined

  private async read<T>(path: string, take: (response: Response) => Promise<T>): Promise<T> {
    const source = await this._sourceOf()(path)
    if (!source) throw chatFileReadFailure()
    try {
      const response = await fetch(source.url, source.headers ? { headers: source.headers } : {})
      if (!response.ok) throw chatFileReadFailure(response.status)
      return await take(response)
    } finally {
      source.release?.()
    }
  }
}
