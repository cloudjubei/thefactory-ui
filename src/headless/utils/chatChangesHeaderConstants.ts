/** What the head of the card holding a chat's own changes says. */
export const CHAT_CHANGES_HEADER_COPY = {
  title: 'Changes this chat’s agent made',
  files: (count: number): string => `${count} ${count === 1 ? 'file' : 'files'}`,
  onItsBranch: 'on its own branch',
} as const
