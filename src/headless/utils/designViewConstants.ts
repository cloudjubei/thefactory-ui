import type {
  DesignAppKind,
  DesignCellStatus,
  DesignCompareMark,
  DesignProposalStatus,
  DesignTidyMoveKind,
} from '../api'
import type { DesignTab } from './designViewTypes'

/** How an app's kind reads on its badge. */
export const DESIGN_APP_KIND_LABELS: Record<DesignAppKind, string> = {
  product: 'Product',
  'overseer-app': 'Overseer app',
}

/** The parts of an app's design, as their tabs read. */
export const DESIGN_TAB_LABELS: Record<DesignTab, string> = {
  current: 'Current design',
  proposals: 'Proposals',
  history: 'History',
  tidy: 'Tidy up',
  playground: 'Playground',
}

/** How a cell of a screen's grid reads. */
export const DESIGN_CELL_STATUS_LABELS: Record<DesignCellStatus, string> = {
  approved: 'Approved',
  changed: 'Changed · re-approve',
  new: 'New · approve',
  missing: 'Missing',
}

/** How a proposal's status reads on its pill. */
export const DESIGN_PROPOSAL_STATUS_LABELS: Record<DesignProposalStatus, string> = {
  open: 'Open',
  accepted: 'Accepted',
  alternative: 'Alternative',
  'sent-back': 'Sent back',
}

/** How an image of a proposal differs from what is current. */
export const DESIGN_COMPARE_MARK_LABELS: Record<DesignCompareMark, string> = {
  changed: 'Changed',
  unchanged: 'Unchanged',
  new: 'New',
  'new-screen': 'New screen',
  unfiled: 'Not filed',
}

/** What a tidy-up move does, in a few words. */
export const DESIGN_TIDY_KIND_LABELS: Record<DesignTidyMoveKind, string> = {
  'merge-apps': 'Merge apps',
  'merge-screens': 'Merge screens',
  'fold-history': 'Fold into history',
  'remove-duplicate': 'Remove a duplicate',
}

/** The words the Design tab shows, the same on every client. */
export const DESIGN_TEXT = {
  notUiTitle: 'This project has no user interface',
  notUiBody:
    'Design is for projects with screens. Turn on "UI app" in the project’s settings to use it.',
  emptyTitle: 'Add an app or propose a design',
  emptyBody:
    'Keep how each screen looks in each state, and decide what changes. Drop files here, or add an app.',
  screens: 'Screens',
  components: 'Components',
  states: 'States',
  variants: 'Variants',
  state: 'State',
  waitingForYou: 'Waiting for you',
  decided: 'Decided',
  answersTo: (question: string) => `Answers to “${question}”`,
  currentIntro:
    'What the app looks like now — one current version per state and variant. Nothing here changes until you accept a proposal.',
  historyIntro:
    'Every version each screen has had, newest first. Bringing an old one back makes it a new proposal — nothing current is overwritten.',
  proposalsEmpty: 'No proposals. Agents’ designs, HTML drafts and run captures arrive here.',
  historyEmpty: 'No versions yet. Accepting a proposal makes the first.',
  noStates: 'No states yet. They arrive with proposals, or add one.',
  noScreen: 'Pick a screen, or add one.',
  approve: 'Approve this version',
  acceptAll: 'Accept as the new version',
  keepAlternative: 'Keep as an alternative',
  sendBack: 'Send back with a note',
  sendBackSubmit: 'Send back to the agent',
  sendBackLabel: 'What should change',
  sentBack: 'Sent back with your note. Its next try arrives here as a new proposal.',
  accepted: 'Accepted — it is the current design now, and what it replaced is in History.',
  alternativeNote: (question: string) =>
    `An alternative answer to “${question}”. Accepting it replaces the look chosen before; that look moves to History.`,
  compareWithCurrent: 'Compare with current',
  clickThrough: 'Click through',
  clickThroughHint:
    'Blue areas are links the proposal drew between its images — follow one to the next screen.',
  back: 'Back',
  sharedPieces: 'Shared pieces',
  current: 'Current',
  proposed: 'Proposed',
  earlier: 'Earlier',
  noCurrent: 'No such screen yet',
  restore: 'Bring back as a proposal',
  fileAs: 'File it as a state of',
  newScreen: 'New screen…',
  newState: 'New state…',
  notFiled: 'Not filed — choose its screen',
  chooseDirection: 'Choose this',
  chosen: 'Chosen',
  keptAsAlternative: 'Kept as alternative',
  usedIn: 'Used in',
  address: 'Address',
  tidyIntro:
    'An agent read every app, screen and version and proposes where each belongs. Nothing moves until you apply it, and every image stays — only where it sits changes.',
  tidyAccept: 'Accept',
  tidyLeave: 'Leave as is',
  tidyApply: (n: number) => `Apply ${n} ${n === 1 ? 'move' : 'moves'}`,
  tidyDismiss: 'Drop the plan',
  tidyNone: 'No tidy-up plan. Ask an agent in the project chat to propose one.',
  apps: 'Apps',
  discuss: 'Discuss',
  rename: 'Rename',
  delete: 'Delete',
  addApp: 'Add app',
  addScreen: 'Add screen',
  addComponent: 'Add component',
  addState: 'Add state',
  propose: 'Propose a design',
  uploadFiles: 'Upload files',
  pickProjectFile: 'Pick a project file',
  pasteLink: 'Paste a link',
  dropHere: 'Drop files to propose them',
  sideBySide: 'Side by side',
  slider: 'Slider',
  openExternally: 'Open',
  download: 'Download',
  notPreviewable: 'This file cannot be shown here.',
  playgroundIntro:
    'Moving the controls changes nothing — it is a sandbox. Save as a state adds what you see to the design record: it is captured in light and dark, desktop and phone, waits for your approval, and every later sign-off captures it again so you see if it changes.',
  playgroundBuilding: 'Building the playground from the checkout…',
  playgroundFailed: 'The playground could not be built',
  playgroundRetry: 'Try again',
  playgroundListing: 'Waiting for the playground to list its scenes…',
  playgroundNoScenes: 'No scene of the playground declares controls yet.',
  playgroundPick: 'Pick a scene',
  otherScenes: 'Other',
  controls: 'Controls',
  controlsNote:
    'Controls come from the scene itself: it declares them next to its states, so the Playground, the states saved from it and their captures at sign-off read the same list.',
  presets: 'Named settings',
  theme: 'Theme',
  device: 'Device',
  light: 'Light',
  dark: 'Dark',
  desktop: 'Desktop',
  phone: 'Phone',
  saveAsState: 'Save as a state',
  saveName: 'Name',
  saveWhere: 'Where',
  saveVariantsNote:
    'Light and dark, desktop and phone are captured as its variants. It arrives waiting for your approval.',
  saveExisting: (name: string) =>
    `These controls are already the state “${name}”. Saving adds a new version of it, not a second state.`,
  save: 'Save',
  cancel: 'Cancel',
  saving: 'Capturing light and dark, desktop and phone…',
  savedTo: (where: string) => `Saved to ${where}`,
  savedNote: 'Captured in four variants, it waits for your approval like any other proposal.',
  openThere: 'Open it there',
} as const

/** The storage warning, the same in the Design tab's banner and the notification. */
export const STORAGE_WARNING_TEXT = {
  body: "Nothing here is backed up yet. Online backup is coming — story 'Online storage for large project files'.",
  showBreakdown: 'See what uses it',
  hideBreakdown: 'Hide',
  settingsTitle: 'Storage',
  settingsBody:
    'What your projects keep on this machine outside git: design files, run proof and test captures.',
} as const

/** The tag every storage notification shares, so a later one replaces the one before. */
export const STORAGE_WARNING_TAG = 'storage:usage-warning'

/** How often an open Playground asks again while its playground builds. */
export const DESIGN_PLAYGROUND_POLL_MS = 1_500
