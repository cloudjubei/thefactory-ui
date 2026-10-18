import type { CliRunReviewOnBase } from '../api/generated'

/** What the offer to close a review as already on its base is shown from — all of it read live. */
export interface ReviewOnBaseInput {
  /** How the review stands against its base, as the server read it: `undefined` until read. */
  preview: CliRunReviewOnBase | undefined
  /** A close in flight. */
  busy?: boolean
  /** Why the last close did nothing. */
  error?: string
}

/** The offer as the review shows it. */
export interface ReviewOnBaseOfferView {
  /** The button: "Already on dev — close it", or, when the base lacks some of it, "Close as already on dev…". */
  label: string
  /** Why it may close, in a line beside the button. */
  detail: string
  /** The base lacks some of it: closing asks first, and sends the person's confirm (`force`). */
  confirm?: { text: string; action: string; keep: string }
  busy: boolean
  busyLabel: string
  error?: string
}
