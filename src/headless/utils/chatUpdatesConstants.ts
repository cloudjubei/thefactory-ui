/** `chats:updated` actions that change one chat in place — refetching that chat alone is enough. */
export const SINGLE_CHAT_UPDATE_ACTIONS: ReadonlySet<string> = new Set([
  'created',
  'updated',
  'messages_added',
  'message_deleted',
  'cleared',
  'rated',
  'dynamic_context_updated',
])
