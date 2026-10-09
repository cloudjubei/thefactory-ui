import { FILE_LINE_PARAM } from './fileLocationConstants'
import type { TextLineRange } from './fileLocationTypes'

/** A project file's in-app route, the same on every client, opened at `line` when it names one. */
export function fileLocationPath(projectId: string, path: string, line?: number): string {
  const base = `/projects/${encodeURIComponent(projectId)}/files/${path.split('/').map(encodeURIComponent).join('/')}`
  return isLine(line) ? `${base}?${FILE_LINE_PARAM}=${line}` : base
}

/** The line a file link opens at, from its `line` parameter; undefined when it names none. */
export function fileLineParam(
  value: string | readonly string[] | null | undefined,
): number | undefined {
  const raw = typeof value === 'string' ? value : value?.[0]
  if (!raw || !/^\d+$/.test(raw)) return undefined
  const line = Number(raw)
  return isLine(line) ? line : undefined
}

/** Where 1-based `line` lies in `text`; a line past the end is the last one. */
export function textLineRange(text: string, line: number): TextLineRange {
  let start = 0
  for (let n = 1; n < line; n++) {
    const next = text.indexOf('\n', start)
    if (next < 0) break
    start = next + 1
  }
  const newline = text.indexOf('\n', start)
  let end = newline < 0 ? text.length : newline
  if (end > start && text[end - 1] === '\r') end -= 1
  return { start, end }
}

function isLine(line: number | undefined): line is number {
  return line !== undefined && Number.isInteger(line) && line >= 1
}
