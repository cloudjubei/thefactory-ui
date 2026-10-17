import type { DesignContentRef, DesignSource } from '../api'

/** How a viewer shows a design file: an image, a sandboxed page (HTML, SVG), a PDF, a video, text, a link out, or a file to download. */
export type DesignViewKind = 'image' | 'html' | 'pdf' | 'video' | 'text' | 'link' | 'file'

/** One design file as a viewer shows it: a version, or one image of a proposal. */
export type DesignShown = {
  ref: DesignContentRef
  source: DesignSource
  /** A draft case's address within its file. */
  caseQuery?: string
  /** What it is, e.g. "Login › Filled · Light · v2". */
  name: string
}
