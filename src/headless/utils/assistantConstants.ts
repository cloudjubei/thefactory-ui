/** What the Assistant page and its nav item say, in every client. */
export const ASSISTANT_COPY = {
  title: 'Assistant',
  conversations: 'Conversations',
  archived: 'Archived',
  newConversation: 'New conversation',
  untitled: 'Untitled conversation',
  showArchived: 'Show archived conversations',
  backToConversations: 'Back to conversations',
  empty: 'No conversations yet.',
  archivedEmpty: 'Nothing archived.',
  placeholder: 'Ask about anything, in any project…',
  justNow: 'Just now',
  fresh: 'New reply',
  needsYou: 'Needs you',
  running: 'Replying',
} as const

/** The nav item's dot, in words. */
export const assistantNewRepliesTitle = (count: number): string =>
  count === 1 ? 'New reply in a conversation' : `New replies in ${count} conversations`

/** What the Assistant says once a conversation is archived, with Undo bringing it back. */
export const assistantArchivedNotice = (title?: string): string =>
  title ? `Archived “${title}”.` : 'Conversation archived.'

/** What the Assistant says once a conversation is back in its list. */
export const assistantBackNotice = (title?: string): string =>
  title ? `“${title}” is back in conversations.` : 'The conversation is back in conversations.'
