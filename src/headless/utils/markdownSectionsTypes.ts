/** A markdown document split at its headings, for showing each part folded. */
export interface MarkdownSections {
  /** The text before the first heading, trimmed; empty when it starts with one. */
  intro: string
  sections: MarkdownSection[]
}

/** One heading and what follows it, up to the next heading of its level. */
export interface MarkdownSection {
  /** Its place — `"2"`, or `"2.0"` for a subsection — unique within the document. */
  key: string
  /** The heading's words, without its marks. */
  title: string
  /** The markdown under the heading, before its first subsection. */
  body: string
  /** One plain line standing for it while folded. */
  summary: string
  /** How much it holds — "3 subsections", "8 points" — when that is worth saying. */
  meta?: string
  /** The headings one level down; a subsection keeps everything under it in its body. */
  subsections: MarkdownSection[]
}
