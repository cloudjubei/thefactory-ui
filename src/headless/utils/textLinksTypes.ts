/** A piece of a message: text as written, or a link written as `[label](url)`. */
export type TextLinkSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; url: string }
