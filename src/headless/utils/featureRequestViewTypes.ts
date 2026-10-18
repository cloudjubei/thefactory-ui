import type { ProcessStatusTone } from './processView'

/**
 * Which footer a request's card shows: the decision, the work under way, the refusal, or where its
 * work went once handed over.
 */
export type FeatureRequestPhase = 'pending' | 'accepted' | 'rejected' | 'settled'

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

/** A link from one request's card to another request's. */
export interface FeatureRequestLinkView {
  requestId: string
  label: string
}

/** How a request settled outside its own run reads on its card. */
export interface FeatureRequestSettledView {
  /** "Delivered by a1b2c3d" or "Handed over to backend". */
  text: string
  /** The request its work was handed over to, when it names one. */
  link?: FeatureRequestLinkView
  note?: string
}

/** Which settle form is open: marking a request delivered, or handing it over. */
export type FeatureRequestSettleMode = 'delivered' | 'handed-over'
