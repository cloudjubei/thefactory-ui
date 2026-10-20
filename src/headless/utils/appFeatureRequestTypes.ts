/** What an app posts as `feature.request`, as the person sees and edits it before sending. */
export interface AppFeatureRequestDraft {
  /** The project the request goes to. */
  targetProjectId: string
  title: string
  summary: string
  description: string
  /** What being done means there, one line each. */
  doneWhen: string[]
  /** Files or links that say more, e.g. the reference behind the request. */
  references: string[]
}

/** The `feature.request` answer: the request sent, or the person declined it. */
export type AppFeatureRequestReply =
  | { status: 'sent'; requestId: string }
  | { status: 'declined'; reason?: string }

/** The `feature.request` ask the person is answering. */
export interface AppFeatureRequestAsk {
  id: number
  draft: AppFeatureRequestDraft
  busy: boolean
  error: string | null
  /** Further asks waiting behind this one. */
  waiting: number
}

export type AppFeatureRequestListener = () => void
