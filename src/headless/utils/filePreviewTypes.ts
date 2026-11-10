import type { FilePaneKind } from './filePaneKind'

/** The file a preview shows: by its own project, which may not be the one on screen. */
export type FilePreviewTarget = {
  projectId: string
  path: string
  /** Its project's name, where that is not the one on screen — the preview's caption names it. */
  projectName?: string
}

/** What the preview lets a person do: read the file, or work on it as the Files pane does. */
export type FilePreviewMode = 'view' | 'edit'

/** Where the preview opens on a wide screen: a large centred popup, or a drawer on the right. */
export type FilePreviewLayout = 'modal' | 'drawer'

/** How a file's contents are read: as text, as raw bytes, or not at all. */
export type FilePreviewSource = 'text' | 'bytes' | 'none'

/** What the Files list knows about a file, shown as its info. */
export type FilePreviewInfo = {
  absolutePath?: string
  size?: number
  type?: string
  ext?: string
  mtime?: number
  ctime?: number
}

/** A file's contents, read the way its kind is read. */
export type FilePreviewContent = {
  kind: FilePaneKind
  /** The text of a markdown, html or text file; `null` for any other kind. */
  text: string | null
  /** The raw bytes of an image or PDF; `null` for any other kind. */
  bytes: ArrayBuffer | null
  /** What the bytes are, for a viewer that needs it named. */
  mediaType: string
  info?: FilePreviewInfo
}

/** A preview as it stands: being read, read, failed, or the file is gone. */
export type FilePreviewState =
  | { status: 'loading'; target: FilePreviewTarget }
  | ({ status: 'ready'; target: FilePreviewTarget } & FilePreviewContent)
  | { status: 'error'; target: FilePreviewTarget; message: string }
  | { status: 'gone'; target: FilePreviewTarget }

/** One line of a file's info: what it says, and its value. */
export type FilePreviewInfoRow = { label: string; value: string }

/** The calls a preview reads and changes a file with, each on the file's own project. */
export type FilePreviewCalls = {
  readText: (projectId: string, path: string) => Promise<string>
  readBytes: (projectId: string, path: string) => Promise<ArrayBuffer>
  readInfo: (projectId: string, path: string) => Promise<FilePreviewInfo | undefined>
  write: (projectId: string, path: string, content: string) => Promise<void>
  rename: (projectId: string, from: string, to: string) => Promise<void>
  remove: (projectId: string, path: string) => Promise<void>
}
