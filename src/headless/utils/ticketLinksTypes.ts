import type { TextLinkSegment } from './textLinksTypes'

/** The Jira site a chat's scope is bound to: the only place a link can be a ticket of. */
export interface TicketSite {
  /** The site's address, with no trailing slash. */
  baseUrl: string
  /** The Jira projects the binding keeps to, upper case; empty for every project. */
  projectKeys: string[]
}

/** A link that is a ticket on the chat's Jira site. */
export interface TicketLink {
  /** The ticket key, upper case. */
  key: string
  /** The link as written. */
  url: string
}

/** A piece of a message: text, a link, or a link to a ticket on the chat's Jira site. */
export type TicketLinkSegment = TextLinkSegment | ({ type: 'ticket' } & TicketLink)

/** What a chat's Jira site is worked out from: the chat's scope and what the app has loaded. */
export interface ChatTicketSiteInput {
  projectId?: string | undefined
  groupId?: string | undefined
  projects?: readonly { id: string; metadata?: unknown; mainGroupId?: string | null }[] | undefined
  groups?:
    | readonly {
        id: string
        title: string
        ticketConnection?: { connectionId: string; projectKeys?: string[] } | undefined
      }[]
    | undefined
  connections?:
    | readonly { id: string; provider: string; baseUrl?: string | undefined }[]
    | undefined
}
