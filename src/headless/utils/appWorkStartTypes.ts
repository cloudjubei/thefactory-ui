/** One feature of the work an embedded app asks to start. */
export interface AppWorkFeatureDraft {
  title: string
  description: string
}

/** What an app posts as `work.start`, as the person sees and edits it before starting. */
export interface AppWorkStartDraft {
  title: string
  description: string
  features: AppWorkFeatureDraft[]
}

/** The `work.start` answer: the work started, or the person declined it. */
export type AppWorkStartReply =
  | { status: 'started'; storyId: string; runId?: string }
  | { status: 'declined'; reason?: string }

/** How far a start got — kept so Start after a failure carries on instead of adding a second story. */
export interface AppWorkStartProgress {
  storyId?: string
  /** The features made so far, in the draft's order. */
  featureIds?: string[]
}

/** The `work.start` ask the person is answering. */
export interface AppWorkStartAsk {
  id: number
  draft: AppWorkStartDraft
  progress: AppWorkStartProgress
  busy: boolean
  error: string | null
  /** Further asks waiting behind this one. */
  waiting: number
}

export type AppWorkStartListener = () => void
