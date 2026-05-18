// Splits a rich-text string into plain-text / `@file` / `#dep` segments.
// Used by web's and native's `RichText` so both peers tokenise mentions
// identically — only the rendering differs per platform.

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
const FILE_PATTERN = '@([A-Za-z0-9_\\-./]+)'
const DEP_PATTERN = `#((?:${UUID})|(?:\\d+))(?:\\.((?:${UUID})|(?:\\d+)))?`

export type RichTextSegment =
  | { type: 'text'; value: string }
  | { type: 'file'; value: string; raw: string }
  | { type: 'dep'; value: string; raw: string }

interface Match {
  index: number
  length: number
  type: 'file' | 'dep'
  value: string
  raw: string
}

export function tokenizeRichText(input: string): RichTextSegment[] {
  if (!input) return [{ type: 'text', value: '' }]

  // The regex objects are recreated per call so the `/g` flag's `lastIndex`
  // cursor can't leak across invocations.
  const fileRe = new RegExp(FILE_PATTERN, 'g')
  const depRe = new RegExp(DEP_PATTERN, 'g')

  const matches: Match[] = []
  let m: RegExpExecArray | null
  while ((m = fileRe.exec(input))) {
    matches.push({ index: m.index, length: m[0].length, type: 'file', value: m[1], raw: m[0] })
  }
  while ((m = depRe.exec(input))) {
    matches.push({
      index: m.index,
      length: m[0].length,
      type: 'dep',
      value: m[0].slice(1),
      raw: m[0],
    })
  }
  matches.sort((a, b) => a.index - b.index)

  const parts: RichTextSegment[] = []
  let lastIndex = 0
  for (const mt of matches) {
    if (mt.index > lastIndex) parts.push({ type: 'text', value: input.slice(lastIndex, mt.index) })
    parts.push({ type: mt.type, value: mt.value, raw: mt.raw })
    lastIndex = mt.index + mt.length
  }
  if (lastIndex < input.length) parts.push({ type: 'text', value: input.slice(lastIndex) })
  return parts
}
