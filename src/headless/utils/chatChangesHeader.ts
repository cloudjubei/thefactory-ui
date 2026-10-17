import { CHAT_CHANGES_HEADER_COPY } from './chatChangesHeaderConstants'
import type { ChatChangesHeaderInput, ChatChangesHeaderView } from './chatChangesHeaderTypes'

/**
 * The head of the card holding changes a chat's own agent made: whose they are,
 * how many files, and the branch of their own they wait on — so the card is
 * never taken for a process run's sign-off. Pure.
 */
export function chatChangesHeader(input: ChatChangesHeaderInput): ChatChangesHeaderView {
  const files = CHAT_CHANGES_HEADER_COPY.files(input.fileCount)
  const branch = input.shadow ? undefined : input.branch
  return branch
    ? {
        title: CHAT_CHANGES_HEADER_COPY.title,
        meta: `${files} · ${CHAT_CHANGES_HEADER_COPY.onItsBranch}`,
        branch,
      }
    : { title: CHAT_CHANGES_HEADER_COPY.title, meta: files }
}
