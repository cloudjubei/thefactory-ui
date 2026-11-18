import type {
  ColleagueReviewOffer,
  ColleagueReviewOfferKind,
  GetColleagueReviewSourceResponse,
  RedactedProviderConnectionEntry,
  SetColleagueReviewSourceSettingsData,
} from '../api/generated'
import type { ProcessStatusTone } from './processView'
import type { ProviderOAuthState } from './providerConnectionFormTypes'

/** A group's watched Slack thread as the backend tells it, with what it brought. */
export type ReviewSourceStatus = GetColleagueReviewSourceResponse

/** The connection the watched thread is read through. */
export type ReviewSourceConnection = NonNullable<ReviewSourceStatus['connection']>

/** The latest read of the watched thread. */
export type ReviewSourcePoll = NonNullable<ReviewSourceStatus['lastPoll']>

/** What the group decides about its updates, as the backend tells it. */
export type ReviewSourceSettings = ReviewSourceStatus['settings']

/** A change to the group's review settings: what is left out stays, an empty value clears. */
export type ReviewSettingsChange = SetColleagueReviewSourceSettingsData['body']

/** The group's review settings as Settings shows them. */
export interface ReviewSettingsView {
  /** The ticket statuses whose updates make no offer, joined: "Done, Won’t do". */
  skipStatuses: string
  /** The emoji name added to an update's Slack message once a review starts; empty adds none. */
  startReaction: string
  runChecksUnasked: boolean
  /** Why the reaction could not be added on the latest read, in a line. */
  reactionError?: string
}

/** An update the watched thread brought for one ticket. */
export type ReviewOffer = ColleagueReviewOffer

/** A ticket's waiting update, as the Tickets tab's list carries it. */
export interface TicketReviewOffer {
  id: string
  kind: ColleagueReviewOfferKind
  author: string
  postedAt: string
  permalink: string
}

/** What watching a thread sends. */
export interface ReviewThreadWatch {
  connectionId: string
  permalink: string
  /** Offer the replies already in the thread too. */
  offerExistingReplies?: boolean
}

/** The person's change to the watched thread, on its way. */
export type ReviewSourcePending =
  | { kind: 'watch'; connectionId: string; permalink: string }
  | { kind: 'clear' }

/** A group's watched thread as views draw it: the backend's word, the person's change on its way over it. */
export interface ReviewSourceSnapshot {
  /** `undefined` until the first read answers. */
  status: ReviewSourceStatus | undefined
  readError: string | undefined
  pending: ReviewSourcePending | undefined
  /** Why the person's last change did not go through. */
  actionError: string | undefined
}

/** A provider connection as the connections list gives it. */
export type SlackConnectionEntry = RedactedProviderConnectionEntry

/** How the person's Slack stands. */
export type SlackConnectionView =
  | {
      kind: 'not-connected'
      /** This server can sign in to Slack. */
      canSignIn: boolean
    }
  | { kind: 'connected'; connectionId: string; workspace: string }
  | { kind: 'sign-in-again'; connectionId: string; workspace: string }

/** The watched thread as Settings shows it. */
export type ReviewThreadView =
  | { kind: 'none' }
  | {
      kind: 'watching'
      /** Only an https link; absent, the link opens nothing. */
      permalink: string
      /** The person's change is on its way. */
      saving: boolean
      label: string
      tone: ProcessStatusTone
      /** Why it brings no updates, when it does not. */
      why?: string
      /** The latest read, in a line. */
      lastRead: string
      /** What went wrong on the latest read. */
      lastReadError?: string
      /** What it brought, in a line; absent while it brought nothing. */
      offers?: string
    }

/** What the group's Slack block in Settings shows. */
export interface SlackReviewSettingsView {
  connection: SlackConnectionView
  /** Where Slack sends the person back to: what their Slack app must list. */
  redirectUrl: string
  thread: ReviewThreadView
  /** A thread can be watched: Slack is connected. */
  canWatch: boolean
  /** The group's review settings; absent until the first read. */
  settings?: ReviewSettingsView
  readError?: string
  actionError?: string
  /** The first read is still out. */
  loading: boolean
}

/** What the Slack block is built from. */
export interface SlackReviewSettingsInput {
  connections: readonly SlackConnectionEntry[]
  /** Which providers this server can sign in with. */
  oauthSetup: Readonly<Record<string, boolean>>
  source: ReviewSourceSnapshot
  /** The backend's base URL as the client knows it. */
  apiBaseUrl: string | null | undefined
  now: number
}

/** The Slack block with its sign-in, as the connected view hands it to the layout. */
export interface SlackReviewSettingsState {
  view: SlackReviewSettingsView
  clientId: string
  signIn: ProviderOAuthState
}

/** How a ticket row shows a waiting update. */
export interface ReviewOfferRowView {
  id: string
  kind: ColleagueReviewOfferKind
  author: string
  /** "Update from Ana". */
  label: string
  /** "2 hours ago". */
  when: string
  /** Only an https link; absent, nothing opens. */
  permalink?: string
}

/** How the Tickets tab shows a ticket's waiting update. */
export type ReviewOfferLayout = 'chip' | 'strip' | 'button'

/** How the group's Slack block in Settings is laid out. */
export type SlackSettingsLayout = 'steps' | 'card' | 'rows'

/** How a round's reply is posted: once more on purpose, and the person's edit in place of the draft. */
export interface ReviewReplyPost {
  again: boolean
  /** The person's edit of the drafted reply; left out, the draft is posted. */
  text?: string
}

/** What Post sends from the confirm's reply box. */
export interface ReviewReplyToPost {
  /** The box has something to post. */
  canPost: boolean
  /** The person's edit, trimmed; left out while the box still holds the draft. */
  text?: string
}

/** Where a Post in thread stands for a round. */
export interface ReviewReplyPostView {
  /** Post in thread is offered: the group watches a working Slack thread. */
  canPost: boolean
  /** The person's post is on its way. */
  posting: boolean
  /** Where it was posted, once it was; `text` when the person changed the draft before posting. */
  posted?: { permalink: string; postedAt: string; text?: string }
}
