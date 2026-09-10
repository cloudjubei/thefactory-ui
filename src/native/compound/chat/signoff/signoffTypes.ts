/** One file the panel is handing to the host to put somewhere the user can reach. */
export type SaveFileRequest = {
  /** Suggested file name, extension included. */
  name: string
  /** The bytes, as a `data:` URI. */
  dataUri: string
}

/**
 * Save a file on the user's behalf.
 *
 * A host slot rather than something this package does itself: writing a file
 * where a person can find it needs a platform capability (a share sheet, a
 * media library) that a pure component library has no business depending on —
 * the same reason `onOpenGit` is passed in. An app that cannot save omits it,
 * and every save affordance stays hidden rather than failing when pressed.
 */
export type SaveFileHandler = (file: SaveFileRequest) => void | Promise<void>
