import type { ProcessNodeRunRef, ProcessWaitingKind } from 'thefactory-tools/types'
import type { ProcessParkChoice } from 'thefactory-tools/utils'

import type { ChatContext } from '../api'

/** One line of what exactly the agent asked for — "Host", "api.example.com". */
export interface ProcessWaitingDetail {
  label: string
  value: string
}

/** Where the ask went when the person handed it to another agent. */
export interface ProcessWaitingDelegatedView {
  /** The chat to open. */
  chatContext: ChatContext
  label: string
}

/**
 * A park on an agent waiting on the person, arranged for one card: what it
 * needs, in its own words, what it asked for, and the answers it takes — the
 * same view on web and native.
 */
export interface ProcessWaitingView {
  kind: ProcessWaitingKind
  /** "The verifier needs network access", "The developer has a question". */
  heading: string
  /** The one plain line of what is needed, naming the thing. */
  title: string
  /** The agent's own reason or question, verbatim. */
  words: string
  details: ProcessWaitingDetail[]
  /** The agent's run, to open its transcript. */
  transcript?: ProcessNodeRunRef
  transcriptLabel: string
  choices: ProcessParkChoice[]
  delegated?: ProcessWaitingDelegatedView
}
