import type { DesignAppKind } from '../api'

/** How an app's kind reads on its badge. */
export const DESIGN_APP_KIND_LABELS: Record<DesignAppKind, string> = {
  product: 'Product',
  'overseer-app': 'Overseer app',
}

/** The words the Design tab shows, the same on every client. */
export const DESIGN_TEXT = {
  notUiTitle: 'This project has no user interface',
  notUiBody:
    'Design is for projects with screens. Turn on "UI app" in the project’s settings to use it.',
  emptyTitle: 'Add an app or a draft',
  emptyBody:
    'Keep how each screen should look, and see how runs built it. Drop files here, or add an app.',
  designs: 'Designs',
  built: 'Built versions',
  approved: 'Approved design',
  current: 'Current',
  approve: 'Approve',
  unapprove: 'Unapprove',
  discuss: 'Discuss',
  compare: 'Compare',
  rename: 'Rename',
  delete: 'Delete',
  addApp: 'Add app',
  addScreen: 'Add screen',
  addDraft: 'Add a draft',
  uploadFiles: 'Upload files',
  pickProjectFile: 'Pick a project file',
  pasteLink: 'Paste a link',
  dropHere: 'Drop files to add them as drafts',
  noDesigns: 'No drafts yet — drop files here or add one.',
  noBuilt:
    'No built versions yet. They appear when you approve a sign-off whose captures name this screen.',
  noScreen: 'Pick a screen, or add one.',
  sideBySide: 'Side by side',
  slider: 'Slider',
  openExternally: 'Open',
  download: 'Download',
  notPreviewable: 'This file cannot be shown here.',
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
