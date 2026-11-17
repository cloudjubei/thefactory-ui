import { CHAT_ATTACHMENT_MAX_BYTES } from 'thefactory-tools/constants'
import { getChatContext } from 'thefactory-tools/utils'
import type { ChatContext } from '../api'
import type { ChatAttachmentFile } from '../api/chatAttachmentUploadTypes'
import { attachmentUploadError } from './chatDrop'
import {
  COLLEAGUE_REVIEW_FILES_MAX,
  COLLEAGUE_REVIEW_TEXT_MAX_CHARS,
  COLLEAGUE_REVIEW_TOPIC_PREFIX,
  REVIEW_START_TEXT,
} from './colleagueReviewStartConstants'
import type { ReviewDraft, ReviewDraftFile, ReviewStartPhase } from './colleagueReviewStartTypes'

/** A ticket's review chat, which its files are uploaded to before the chat exists. Pure. */
export function reviewChatContext(groupId: string, ticketKey: string): ChatContext {
  return { type: 'GROUP_TOPIC', groupId, topicId: `${COLLEAGUE_REVIEW_TOPIC_PREFIX}${ticketKey}` }
}

/** The review a chat is, by its context or its context's id; `undefined` for any other chat. Pure. */
export function reviewOfChat(
  chat: ChatContext | string | undefined,
): { groupId: string; ticketKey: string } | undefined {
  const context = typeof chat === 'string' ? getChatContext(chat) : chat
  if (context?.type !== 'GROUP_TOPIC' || !context.groupId) return undefined
  const topic = context.topicId ?? ''
  if (!topic.startsWith(COLLEAGUE_REVIEW_TOPIC_PREFIX)) return undefined
  const ticketKey = topic.slice(COLLEAGUE_REVIEW_TOPIC_PREFIX.length)
  return ticketKey ? { groupId: context.groupId, ticketKey } : undefined
}

/** What a row's button says while its round starts. Pure. */
export function reviewStartLabel(phase: ReviewStartPhase): string {
  return phase.step === 'uploading'
    ? REVIEW_START_TEXT.uploading(phase.done, phase.total)
    : REVIEW_START_TEXT.starting
}

/** Why a draft cannot start a round yet, or `undefined` when it can. Pure. */
export function reviewDraftProblem(draft: ReviewDraft): string | undefined {
  if (draft.text.trim() === '') return REVIEW_START_TEXT.empty
  if (draft.text.length > COLLEAGUE_REVIEW_TEXT_MAX_CHARS)
    return REVIEW_START_TEXT.tooLong(COLLEAGUE_REVIEW_TEXT_MAX_CHARS)
  if (draft.files.length > COLLEAGUE_REVIEW_FILES_MAX)
    return REVIEW_START_TEXT.tooMany(COLLEAGUE_REVIEW_FILES_MAX)
  return draft.files
    .map(({ file }) =>
      file.size === undefined
        ? undefined
        : attachmentUploadError({ name: file.name, size: file.size }, CHAT_ATTACHMENT_MAX_BYTES),
    )
    .find((tooBig) => tooBig !== undefined)
}

const sameFile = (a: ChatAttachmentFile, b: ChatAttachmentFile): boolean =>
  a.name === b.name && a.size === b.size

/** The draft's files with `added` after them: a file already there once, at most the backend's limit. Pure. */
export function withReviewFiles(
  files: readonly ReviewDraftFile[],
  added: readonly ChatAttachmentFile[],
): ReviewDraftFile[] {
  const next = [...files]
  for (const file of added) {
    if (next.length >= COLLEAGUE_REVIEW_FILES_MAX) break
    if (!next.some((f) => sameFile(f.file, file))) next.push({ file })
  }
  return next
}
