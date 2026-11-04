import type { LoomWalkthroughItem } from 'thefactory-tools/types'
import type { ChatAttachmentFile } from '../api'

/** What a person records for a run, and what they attached so far. */
export type RunWalkthroughItem = LoomWalkthroughItem

/** An attachment on its way. */
export interface RunWalkthroughSending {
  kind: 'link' | 'file'
  sentBytes?: number
  totalBytes?: number
}

/** A run's walkthrough, as `RunWalkthroughStore` keeps it. */
export interface RunWalkthroughState {
  /** Undefined until read; a run that cannot be read has none to show. */
  items: readonly RunWalkthroughItem[] | undefined
  /** What is being attached, by item id. */
  sending: Readonly<Record<string, RunWalkthroughSending>>
  /** Why the last attachment to an item failed, by item id. */
  errors: Readonly<Record<string, string>>
}

/** How the walkthrough lays out its steps. */
export type LoomWalkthroughLayout = 'folds' | 'cards' | 'script'

/** One item's row. */
export interface LoomWalkthroughRow {
  id: string
  /** Its place, 1 first. */
  number: number
  title: string
  open: string
  steps: readonly string[]
  mustShow: readonly string[]
  /** What was attached: a link to open, or a file's name. */
  result?: { kind: 'link'; url: string; label: string } | { kind: 'file'; label: string }
  /** How it stands, in a word or two. */
  state: string
  recorded: boolean
  /** Sending, in words, with how far it got when known. */
  sending?: string
  error?: string
}

/** The walkthrough as its tab shows it. */
export interface LoomWalkthroughView {
  rows: LoomWalkthroughRow[]
  /** How many are still to record. */
  left: number
  /** How it stands, in a line. */
  summary: string
  /** The row to open first: the first still to record. */
  firstOpen: string | undefined
}

/** What the tab does: attach a link or a file to one item. */
export interface LoomWalkthroughActions {
  attachLink: (itemId: string, url: string) => Promise<boolean>
  attachFile: (itemId: string, file: ChatAttachmentFile) => Promise<boolean>
}
