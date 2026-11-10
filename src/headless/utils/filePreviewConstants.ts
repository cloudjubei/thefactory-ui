import type { FilePaneKind } from './filePaneKind'
import type { FilePreviewLayout, FilePreviewMode, FilePreviewPane } from './filePreviewTypes'

/** The button beside "Open in Files" that opens a file in a popup. */
export const FILE_PREVIEW_LABEL = 'Preview'

/** What the preview lets a person do until the product call is made: read only. */
export const FILE_PREVIEW_DEFAULT_MODE: FilePreviewMode = 'view'

/** Where the preview opens on a wide screen until the product call is made. */
export const FILE_PREVIEW_DEFAULT_LAYOUT: FilePreviewLayout = 'modal'

/** The words the preview shows around the file itself. */
export const FILE_PREVIEW_COPY = {
  loading: 'Reading the file…',
  goneTitle: 'File not found',
  goneBody: 'It was moved or deleted.',
  errorTitle: 'Could not read the file',
  errorFallback: 'The file could not be read.',
  retry: 'Try again',
  close: 'Close',
  info: 'File info',
  noViewer: 'No preview for this file type.',
  copy: 'Copy file contents',
  save: 'Save',
  noChanges: 'No unsaved changes',
  rename: 'Rename file',
  renameTitle: 'Rename file',
  renamePlaceholder: 'new/path/to/file.ext',
  renameConfirm: 'Rename',
  cancel: 'Cancel',
  delete: 'Delete file',
  deleteTitle: 'Delete file',
  deleteConfirm: 'Delete',
  deleteBody: 'This permanently removes the file. This cannot be undone.',
  paneSwitch: 'Pane visibility',
  editView: 'Edit view',
  previewView: 'Preview view',
} as const

/** What each line of a file's info says. */
export const FILE_PREVIEW_INFO_LABELS = {
  path: 'Path',
  project: 'Project',
  absolutePath: 'Absolute',
  type: 'Type',
  size: 'Size',
  modified: 'Modified',
  created: 'Created',
} as const

/** What the bytes of a previewed image or PDF are, by extension. */
export const FILE_PREVIEW_MEDIA_TYPES: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  pdf: 'application/pdf',
}

/** What bytes of no known kind are. */
export const FILE_PREVIEW_FALLBACK_MEDIA_TYPE = 'application/octet-stream'

/** What the text of a markdown, html or text file is. */
export const FILE_PREVIEW_TEXT_MEDIA_TYPE = 'text/plain'

/** What native's source / split / preview switch says, for a markdown or html file. */
export const FILE_PREVIEW_PANE_LABELS: Record<FilePreviewPane, string> = {
  edit: 'Source',
  both: 'Split',
  preview: 'Preview',
}

/**
 * The panes each kind of file switches between, in the order the switch
 * offers them: a markdown file its source, both, or its preview; an html file
 * its source or the page — a phone has no room for both.
 */
export const FILE_PREVIEW_PANES: Partial<Record<FilePaneKind, readonly FilePreviewPane[]>> = {
  markdown: ['edit', 'both', 'preview'],
  html: ['edit', 'preview'],
}

/** The ways the preview can let a person work, in the order the switch offers them. */
export const FILE_PREVIEW_MODES: readonly FilePreviewMode[] = ['view', 'edit']

/** What each way of working is called, on the switch that compares them. */
export const FILE_PREVIEW_MODE_LABELS: Record<FilePreviewMode, string> = {
  view: 'View only',
  edit: 'Full Files pane',
}

/** Where the preview can open on a wide screen, in the order the switch offers them. */
export const FILE_PREVIEW_LAYOUTS: readonly FilePreviewLayout[] = ['modal', 'drawer']

/** What each place is called, on the switch that compares them. */
export const FILE_PREVIEW_LAYOUT_LABELS: Record<FilePreviewLayout, string> = {
  modal: 'Centered popup',
  drawer: 'Right drawer',
}
