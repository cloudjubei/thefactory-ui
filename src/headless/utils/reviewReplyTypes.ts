import type { ReviewCommitsView } from './reviewCommitsTypes'

/** A reply waiting on a ticket under review, as its page, its row and its review chat show it. */
export interface ReviewReplyView {
  offerId: string
  /** "Aashan replied". */
  who: string
  when: string
  /** "Aashan replied · 1h ago · 3 new commits". */
  line: string
  /** What they wrote, whole. */
  text: string
  /** What they wrote, cut to a few lines. */
  preview: string
  /** Whether `preview` leaves some of `text` out. */
  cut: boolean
  files: number
  /** "2 files"; absent without any. */
  filesLabel?: string
  /** The round pressing Start begins. */
  round: number
  /** "Start round 3". */
  startLabel: string
  commits?: ReviewCommitsView
}

/** What a reply waiting on a ticket is read from. */
export interface ReviewReplySource {
  id: string
  kind: 'first-round' | 'next-round'
  state: 'new' | 'started' | 'dismissed'
  author: string
  postedAt: string
  text: string
  files: number
}

/** How the ticket page shows a reply waiting on it. */
export type ReviewReplyBannerLayout = 'strip' | 'line'
