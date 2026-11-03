import { MARKDOWN_SECTION_SUMMARY_MAX } from './markdownSectionsConstants'
import type { MarkdownSection, MarkdownSections } from './markdownSectionsTypes'
import { clipLine, plainMarkdownLine } from './textLine'

const HEADING = /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/
const FENCE = /^ {0,3}(```|~~~)/
const TOP_LEVEL_POINT = /^(?:[-*+]|\d+[.)])[ \t]+/
const LIST_MARK = /^\s*(?:[-*+]|\d+[.)])[ \t]+/
const QUOTE_MARK = /^\s*>\s?/
const RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/
const TABLE_ROW = /^\s*\|/

interface Heading {
  index: number
  level: number
  title: string
}

/** Each line with whether it sits inside fenced code (the fence lines themselves count as inside). */
function linesWithFences(lines: readonly string[]): Array<{ line: string; fenced: boolean }> {
  let fence: string | undefined
  return lines.map((line) => {
    const marker = FENCE.exec(line)?.[1]
    if (marker && (fence === undefined || marker === fence)) {
      fence = fence === undefined ? marker : undefined
      return { line, fenced: true }
    }
    return { line, fenced: fence !== undefined }
  })
}

function headingsOf(lines: readonly string[]): Heading[] {
  return linesWithFences(lines).flatMap(({ line, fenced }, index) => {
    const match = fenced ? null : HEADING.exec(line)
    return match?.[1] && match[2]
      ? [{ index, level: match[1].length, title: plainMarkdownLine(match[2]) }]
      : []
  })
}

function topLevelPoints(body: string): number {
  return linesWithFences(body.split('\n')).filter(
    ({ line, fenced }) => !fenced && TOP_LEVEL_POINT.test(line),
  ).length
}

function metaOf(subsections: readonly MarkdownSection[], body: string): string | undefined {
  if (subsections.length > 0) {
    return `${subsections.length} subsection${subsections.length === 1 ? '' : 's'}`
  }
  const points = topLevelPoints(body)
  return points >= 2 ? `${points} points` : undefined
}

function splitAt(
  lines: readonly string[],
  headings: readonly Heading[],
  level: number,
  from: number,
  to: number,
  keyPrefix: string,
  folds: boolean,
): MarkdownSection[] {
  const own = headings.filter((h) => h.level === level && h.index >= from && h.index < to)
  return own.map((heading, i) => {
    const end = own[i + 1]?.index ?? to
    const inner = folds
      ? headings.filter((h) => h.index > heading.index && h.index < end && h.level > level)
      : []
    const subLevel = inner.length > 0 ? Math.min(...inner.map((h) => h.level)) : undefined
    const bodyEnd =
      subLevel === undefined ? end : (inner.find((h) => h.level === subLevel)?.index ?? end)
    const key = `${keyPrefix}${i}`
    const body = lines
      .slice(heading.index + 1, bodyEnd)
      .join('\n')
      .trim()
    const subsections =
      subLevel === undefined
        ? []
        : splitAt(lines, headings, subLevel, heading.index + 1, end, `${key}.`, false)
    const summary =
      markdownSummaryLine(body) ||
      clipLine(subsections.map((s) => s.title).join(' · '), MARKDOWN_SECTION_SUMMARY_MAX)
    const meta = metaOf(subsections, body)
    return {
      key,
      title: heading.title,
      body,
      summary,
      ...(meta ? { meta } : {}),
      subsections,
    }
  })
}

/**
 * A markdown document split at its shallowest heading level, each section
 * holding the next level down as subsections — so a long description can show
 * as headings that open one at a time. Headings inside fenced code are text.
 */
export function markdownSections(markdown: string): MarkdownSections {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const headings = headingsOf(lines)
  if (headings.length === 0) return { intro: lines.join('\n').trim(), sections: [] }
  const top = Math.min(...headings.map((h) => h.level))
  const firstTop = headings.find((h) => h.level === top)?.index ?? 0
  return {
    intro: lines.slice(0, firstTop).join('\n').trim(),
    sections: splitAt(lines, headings, top, firstTop, lines.length, '', true),
  }
}

/** The first line of readable text in some markdown, plain and cut to one line; empty when there is none. */
export function markdownSummaryLine(markdown: string, max = MARKDOWN_SECTION_SUMMARY_MAX): string {
  for (const { line, fenced } of linesWithFences(markdown.split('\n'))) {
    if (fenced || !line.trim() || RULE.test(line) || TABLE_ROW.test(line)) continue
    let text = line
    while (QUOTE_MARK.test(text)) text = text.replace(QUOTE_MARK, '')
    text = text.replace(LIST_MARK, '').replace(/^#{1,6}[ \t]+/, '')
    const plain = clipLine(plainMarkdownLine(text), max)
    if (plain) return plain
  }
  return ''
}

/** Every section's and subsection's key, in document order. */
export function markdownSectionKeys(sections: readonly MarkdownSection[]): string[] {
  return sections.flatMap((s) => [s.key, ...markdownSectionKeys(s.subsections)])
}
