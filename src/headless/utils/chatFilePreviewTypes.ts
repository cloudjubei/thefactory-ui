/** Where a chat file's contents are fetched from, and how to let that go once read. */
export type ChatFileSource = {
  url: string
  headers?: Record<string, string>
  /** Called once the contents are read, as for a blob URL to revoke. */
  release?: () => void
}

/** Finds where a chat file is read from; `null` when the chat no longer holds it. */
export type ChatFileSourceOf = (path: string) => Promise<ChatFileSource | null>

/** A failed read, shaped as a backend call's failure so the preview names it the same way. */
export type ChatFileReadFailure = {
  isAxiosError: true
  response: { status: number }
}
