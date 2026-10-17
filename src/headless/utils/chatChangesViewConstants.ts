/** What a chat turn's sign-off says once its changes are settled elsewhere, and the action that discards them. */
export const CHAT_CHANGES_COPY = {
  superseded:
    'A later turn captured these changes again with its own — review and apply that turn’s.',
  discarded: 'Discarded — not applied, and not carried into the chat’s next turn.',
  discard: 'Discard',
  discarding: 'Discarding…',
  discardDetail:
    'Drop these changes: they are not applied, and the agent’s next turn starts without them.',
  held: 'Kept apart from this chat’s open changes until those are decided.',
  discardsUncommittedEdits: 'Throws away edits you had not committed',
  discardsUncommittedEditsCount: (count: number): string =>
    `Throws away edits you had not committed: ${count} ${count === 1 ? 'file' : 'files'}`,
} as const
