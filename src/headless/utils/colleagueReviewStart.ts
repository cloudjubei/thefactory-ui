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
import { slackMessageLink } from './colleagueReviewSource'
import { REVIEW_OFFER_TEXT } from './colleagueReviewSourceConstants'
import type { ReviewOffer, TicketReviewOffer } from './colleagueReviewSourceTypes'
import type {
  ColleagueReviewMode,
  ColleagueReviewStartBody,
  ColleagueReviewStarted,
  ReviewBoxOffer,
  ReviewDraft,
  ReviewDraftFile,
  ReviewPasteBox,
  ReviewStartedDestination,
  ReviewStartPhase,
} from './colleagueReviewStartTypes'

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
  return draftLimitProblem(draft)
}

function draftLimitProblem(draft: ReviewDraft): string | undefined {
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

function boxOffer(onTicket: TicketReviewOffer, offer: ReviewOffer | undefined): ReviewBoxOffer {
  const permalink = slackMessageLink(onTicket.permalink)
  return {
    id: onTicket.id,
    author: onTicket.author,
    postedAt: onTicket.postedAt,
    ...(permalink ? { permalink } : {}),
    files: offer ? offer.attachments.map((a) => a.name) : [],
    ...(offer ? { text: offer.text } : {}),
  }
}

/** The paste box opened on a ticket's waiting update: filled from it once it is read. Pure. */
export function reviewBoxOf(
  ticketKey: string,
  nextRound: boolean,
  onTicket: TicketReviewOffer,
  offer: ReviewOffer | undefined,
): ReviewPasteBox {
  return {
    ticketKey,
    nextRound,
    draft: { text: offer?.text ?? '', files: [] },
    offer: boxOffer(onTicket, offer),
  }
}

/** A box waiting on its update, filled now it is read; what the person typed meanwhile stays. Pure. */
export function reviewBoxWithOffer(box: ReviewPasteBox, offer: ReviewOffer): ReviewPasteBox {
  if (box.offer?.id !== offer.id) return box
  return {
    ...box,
    draft: box.draft.text === '' ? { ...box.draft, text: offer.text } : box.draft,
    offer: { ...box.offer, files: offer.attachments.map((a) => a.name), text: offer.text },
  }
}

/**
 * Why the box cannot start its round yet, or `undefined` when it can. An
 * update from Slack may start with no words when it came with none. Pure.
 */
export function reviewBoxProblem(box: ReviewPasteBox): string | undefined {
  const { offer, draft } = box
  if (!offer) return reviewDraftProblem(draft)
  if (offer.text === undefined) return REVIEW_OFFER_TEXT.reading
  const wordless = offer.text.trim() === '' && draft.text.trim() === ''
  return wordless ? draftLimitProblem(draft) : reviewDraftProblem(draft)
}

/** What starting the box's round sends: an update by its id, its text only once the person changed it. Pure. */
export function reviewStartBody(
  box: ReviewPasteBox,
  attachments: readonly string[],
  mode?: ColleagueReviewMode,
): ColleagueReviewStartBody {
  const { offer, draft } = box
  const edited = !offer || (draft.text !== offer.text && draft.text.trim() !== '')
  return {
    ...(offer ? { offerId: offer.id } : {}),
    ...(edited ? { text: draft.text } : {}),
    ...(attachments.length > 0 ? { attachments: [...attachments] } : {}),
    ...(mode ? { mode } : {}),
  }
}

/** How a round is reviewed: the person's pick, else the group's default, else in the chat. Pure. */
export function reviewStartMode(
  picked: ColleagueReviewMode | undefined,
  groupDefault: ColleagueReviewMode | undefined,
): ColleagueReviewMode {
  return picked ?? groupDefault ?? 'inline'
}

/** Where a started round opens: the run it is reviewed in, else its review chat. Pure. */
export function reviewStartedDestination(
  started: Pick<ColleagueReviewStarted, 'context' | 'mode' | 'runId'>,
): ReviewStartedDestination {
  return started.mode === 'process' && started.runId
    ? { kind: 'run', runId: started.runId }
    : { kind: 'chat', context: started.context }
}
