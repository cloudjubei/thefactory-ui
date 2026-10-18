import type { FeatureRequestAcceptance, FeatureRequestStatus } from 'thefactory-tools/types'
import { PROCESS_LIVE_TONE } from './processView'
import { PROCESS_RUN_WORDS } from './processViewConstants'
import type { FeatureRequestSectionId, FeatureRequestStatusView } from './featureRequestViewTypes'

/** How each request status reads — the process words, so a request and a run say the same thing. */
export const FEATURE_REQUEST_STATUS_VIEW: Record<FeatureRequestStatus, FeatureRequestStatusView> = {
  pending: { label: PROCESS_RUN_WORDS.needsYou, tone: 'blocked', phase: 'pending' },
  accepted: { label: PROCESS_RUN_WORDS.starting, tone: 'queued', phase: 'accepted' },
  in_progress: { label: PROCESS_RUN_WORDS.running, tone: PROCESS_LIVE_TONE, phase: 'accepted' },
  in_review: { label: PROCESS_RUN_WORDS.signOff, tone: 'review', phase: 'accepted' },
  blocked: { label: PROCESS_RUN_WORDS.needsYou, tone: 'blocked', phase: 'accepted' },
  completed: { label: PROCESS_RUN_WORDS.done, tone: 'done', phase: 'accepted' },
  failed: { label: PROCESS_RUN_WORDS.failed, tone: 'stuck', phase: 'accepted' },
  rejected: { label: 'Rejected', tone: 'stuck', phase: 'rejected' },
  handed_over: { label: 'Handed over', tone: 'on_hold', phase: 'settled' },
}

/** The words of marking a request delivered by other work, or handing it over elsewhere. */
export const FEATURE_REQUEST_SETTLE_WORDS = {
  markDelivered: 'Mark as delivered',
  handOver: 'Hand over',
  deliveredRef: 'What delivered it?',
  deliveredRefPlaceholder: 'Commit, run or story',
  handOverProject: 'To which project?',
  handOverRef: 'Which request or story?',
  handOverRefPlaceholder: 'Request id or #project/story',
  notePlaceholder: 'Optional note',
  confirmDelivered: 'Mark delivered',
  confirmHandOver: 'Hand over',
  cancel: 'Cancel',
  takesOver: 'Takes over',
} as const

/** What each section of a request is called. */
export const FEATURE_REQUEST_SECTION_TITLES: Record<FeatureRequestSectionId, string> = {
  changes: 'What changes',
  doneWhen: 'Done when',
  rules: 'Rules',
  proof: 'Proof it must carry',
  origin: 'Where it came from',
  detail: 'More detail',
}

/** The composer's hint while the request in a chat still waits for its decision. */
export const FEATURE_REQUEST_COMPOSER_HINT = 'Decide on the request above first'

/** The link from a request's card to the whole request. */
export const FEATURE_REQUEST_OPEN_FULL_LABEL = 'Open the full request'

/** How the receiving project takes incoming requests, as the full request says it. */
export const FEATURE_REQUEST_ACCEPTANCE_LINES: Record<FeatureRequestAcceptance, string> = {
  off: 'This project turns incoming requests down.',
  manual: 'This project takes incoming requests by hand.',
  autonomous: 'This project takes incoming requests on its own.',
}

/** The heading over a waiting request's decision in the full request. */
export const FEATURE_REQUEST_DECIDE_HEADING = 'Take this on?'
