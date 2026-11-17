import type { ColleagueReview } from 'thefactory-tools/types'
import type { ChatContext } from '../api'
import type { ChatAttachmentFile } from '../api/chatAttachmentUploadTypes'
import type { TicketPlanBody } from './groupTicketTypes'

/**
 * What starting a round sends: the pasted update and its files' paths in the
 * review's chat, or an update the watched Slack thread brought, by its id, with
 * the person's edit of its text.
 */
export interface ColleagueReviewStartBody extends TicketPlanBody {
  text?: string
  offerId?: string
  attachments?: string[]
}

/** A round started, in the ticket's review chat. */
export interface ColleagueReviewStarted {
  context: ChatContext
  chatContextId: string
  /** The round just started. */
  round: number
  /** The review chat was there already: this round carries on in it. */
  alreadyOpen: boolean
  /** Whether its agent is now working. */
  turnStarted: boolean
  review: ColleagueReview
}

/** A file the person attached to an update; `path` once it is uploaded, so a retry sends it once. */
export interface ReviewDraftFile {
  file: ChatAttachmentFile
  path?: string
}

/** An update as the paste box holds it. */
export interface ReviewDraft {
  text: string
  files: ReviewDraftFile[]
}

/** Where starting a round is: its files going up, then the round itself. */
export type ReviewStartPhase =
  | { step: 'uploading'; done: number; total: number }
  | { step: 'starting' }

/** What came of starting a round: the round, or why not with the draft to try again from. */
export type ReviewStartOutcome =
  | { ok: true; started: ColleagueReviewStarted }
  | { ok: false; error: string; draft: ReviewDraft }

/** An update the watched Slack thread brought, as the paste box starts from it. */
export interface ReviewBoxOffer {
  id: string
  author: string
  postedAt: string
  /** Only an https link. */
  permalink?: string
  /** The names of the files it came with: the backend fetches them from Slack itself. */
  files: string[]
  /** Its text as Slack had it; absent while it is read. */
  text?: string
}

/** The paste box, open on one ticket. */
export interface ReviewPasteBox {
  ticketKey: string
  /** The ticket has a review: this starts its next round. */
  nextRound: boolean
  draft: ReviewDraft
  /** The Slack update it starts from, when it does. */
  offer?: ReviewBoxOffer
  /** Why the last start did not go through. */
  error?: string
}

/** Sends one file into the review's chat; resolves to its path there. */
export type ReviewFileUpload = (context: ChatContext, file: ChatAttachmentFile) => Promise<string>
