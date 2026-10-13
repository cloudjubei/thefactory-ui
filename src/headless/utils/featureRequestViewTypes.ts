import type { ProcessStatusTone } from './processView'

/** Which footer a request's card shows: the decision, the work under way, or the refusal. */
export type FeatureRequestPhase = 'pending' | 'accepted' | 'rejected'

/** How a request's status reads on its card and in the asker's chat. */
export interface FeatureRequestStatusView {
  label: string
  tone: ProcessStatusTone
  phase: FeatureRequestPhase
}

/** The parts of a request its card opens one by one. */
export type FeatureRequestSectionId =
  | 'changes'
  | 'doneWhen'
  | 'rules'
  | 'proof'
  | 'origin'
  | 'detail'

/** One line inside an opened section. */
export interface FeatureRequestItemView {
  /** The item's number in a numbered section; empty in a bulleted one. */
  marker: string
  text: string
  /** Only a person can confirm it — shown with a "By hand" tag. */
  byHand: boolean
}

/** One collapsible part of a request: its title, the count beside it, and its lines. */
export interface FeatureRequestSectionView {
  id: FeatureRequestSectionId
  title: string
  meta: string
  numbered: boolean
  items: FeatureRequestItemView[]
}
