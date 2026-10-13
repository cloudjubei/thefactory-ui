import type { ReferenceDescription } from 'thefactory-tools/types'

/** What each kind of reference is, as its preview card's caption. */
export const REFERENCE_KIND_CAPTIONS: Record<ReferenceDescription['kind'], string> = {
  story: 'Story',
  feature: 'Feature',
  file: 'File',
  note: 'Note',
  groupNote: 'Group note',
  attachment: 'Attachment',
  design: 'Design',
  run: 'Process run',
  process: 'Process',
  project: 'Project',
  chat: 'Chat',
  app: 'App',
}

/** What a preview card's button says, by what it opens. */
export const REFERENCE_OPEN_LABELS: Record<ReferenceDescription['kind'], string> = {
  story: 'Open story',
  feature: 'Open feature',
  file: 'Open in Files',
  note: 'Open note',
  groupNote: 'Open note',
  attachment: 'Open file',
  design: 'Open design',
  run: 'Open run',
  process: 'Open process',
  project: 'Open project',
  chat: 'Open chat',
  app: 'Open app',
}

export const REFERENCE_FOLDER_CAPTION = 'Folder'
export const REFERENCE_LOADING_CAPTION = 'Looking it up'
export const REFERENCE_MISSING_CAPTION = 'Not found'

export const RUN_PREVIEW_STORY = 'Story'
export const RUN_PREVIEW_STEP = 'Step'
export const RUN_PREVIEW_NEEDS = 'Needs'
export const RUN_PREVIEW_TIME = 'Time'
export const RUN_PREVIEW_WAITING = 'waiting for you'
export const RUN_PREVIEW_OPEN_SIGNOFF = 'Open sign-off'
export const RUN_PREVIEW_ANSWER = 'Answer'
export const RUN_PREVIEW_OPEN_CHAT = 'Open run chat'
