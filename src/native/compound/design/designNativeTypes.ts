import type { ReactNode } from 'react'

/**
 * What the app hosting the design views supplies: the native surfaces this
 * package does not depend on (a web view, a PDF view) and the safe-area insets
 * its full-screen viewers keep clear of. Anything left out falls back to the
 * item's "Open" panel.
 */
export type DesignHost = {
  /** A page (HTML, SVG) from `uri`; `interactive: false` draws it as a still miniature. */
  renderPage?: (uri: string, options: { interactive: boolean }) => ReactNode
  renderPdf?: (uri: string) => ReactNode
  renderVideo?: (uri: string) => ReactNode
  /** Save a file that cannot be previewed to a place the person picks. */
  downloadFile?: (uri: string, fileName: string) => Promise<void>
  topInset?: number
  bottomInset?: number
}
