import type { TextLinkSegment } from './textLinksTypes'

const TEXT_LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g

/** A message's text with its `[label](url)` links apart. Only a web page is a link. Pure. */
export function splitTextLinks(text: string): TextLinkSegment[] {
  const segments: TextLinkSegment[] = []
  let at = 0
  for (const match of text.matchAll(TEXT_LINK)) {
    if (match.index > at) segments.push({ type: 'text', value: text.slice(at, match.index) })
    segments.push({ type: 'link', label: match[1]!, url: match[2]! })
    at = match.index + match[0].length
  }
  if (at < text.length) segments.push({ type: 'text', value: text.slice(at) })
  return segments
}
