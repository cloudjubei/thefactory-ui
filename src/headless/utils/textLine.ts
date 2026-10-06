/** Text collapsed onto one line and cut at a word to at most `max` characters, with an ellipsis when cut. */
export function clipLine(text: string, max: number): string {
  const line = text.replace(/\s+/g, ' ').trim()
  if (line.length <= max) return line
  const cut = line.slice(0, Math.max(1, max - 1))
  const atWord = line[cut.length] === ' ' ? cut.length : cut.lastIndexOf(' ')
  const head = atWord > max / 2 ? cut.slice(0, atWord) : cut
  return `${head.replace(/[\s,;:·—–-]+$/, '')}…`
}

/** The text's first sentence, on one line — the whole of it when it has no sentence break. */
export function firstSentence(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim()
  const match = /^(.+?[.!?])(\s|$)/.exec(line)
  return match ? match[1] : line
}

/**
 * Inline markdown as the words it shows — links as their text, bold, italics
 * and code marks dropped — for a line drawn as plain text, such as a folded
 * section's summary, where a literal `**` or backtick would show.
 */
export function plainMarkdownLine(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(^|[\s(])([*_])(?=\S)(.+?)(?<=\S)\2(?=[\s).,;:!?]|$)/g, '$1$3')
}
