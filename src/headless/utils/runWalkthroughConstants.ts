import type { LoomWalkthroughLayout } from './runWalkthroughTypes'

export const LOOM_WALKTHROUGH_LAYOUTS: readonly LoomWalkthroughLayout[] = [
  'folds',
  'cards',
  'script',
]

/** The layout that ships. */
export const LOOM_WALKTHROUGH_DEFAULT_LAYOUT: LoomWalkthroughLayout = 'folds'

export const LOOM_WALKTHROUGH_LAYOUT_LABELS: Record<LoomWalkthroughLayout, string> = {
  folds: 'One step open',
  cards: 'All open',
  script: 'Script and attach',
}

export const LOOM_WALKTHROUGH_TEXT = {
  label: 'Loom walkthrough',
  intro: 'An agent could not capture these. Record each one and attach it.',
  open: 'Open',
  steps: 'Do',
  mustShow: 'Must be visible',
  linkLabel: 'Loom link',
  linkPlaceholder: 'https://www.loom.com/share/…',
  addLink: 'Add link',
  uploadVideo: 'Upload a video',
  replace: 'Replace',
  toRecord: 'To record',
  recorded: 'Recorded',
  sendingLink: 'Adding the link…',
  sendingFile: 'Uploading…',
  badLink: 'A link must start with http:// or https://.',
  linkFailed: 'The link was not added.',
  fileFailed: 'The video was not uploaded.',
  noUriSender: 'This app cannot upload a video from here. Add a Loom link instead.',
  linkResult: 'Loom link',
  chipLeft: (left: number) => `${left} to record`,
  allRecorded: (total: number) => (total === 1 ? 'Recorded.' : `All ${total} recorded.`),
  left: (left: number, total: number) => `${left} of ${total} still to record.`,
} as const
