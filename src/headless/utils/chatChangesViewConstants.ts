/** What a chat turn's sign-off says once its changes are settled elsewhere, and the action that discards them. */
export const CHAT_CHANGES_COPY = {
  superseded:
    'A later turn captured these changes again with its own — review and apply that turn’s.',
  discarded: 'Discarded — not applied, and not carried into the chat’s next turn.',
  discard: 'Discard',
  discarding: 'Discarding…',
  discardDetail:
    'Drop these changes: they are not applied, and the agent’s next turn starts without them.',
} as const
