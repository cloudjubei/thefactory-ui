import { TERMINAL_INDEXED_COLORS, TERMINAL_SGR_COLORS } from './terminalOutputConstants'
import type { TerminalColor, TerminalOutputView, TerminalSpan } from './terminalOutputTypes'

type Style = Pick<TerminalSpan, 'color' | 'bold' | 'dim'>

const PLAIN: Style = { color: undefined, bold: false, dim: false }

const ESC = '\u001b'

const SEQUENCES = String.raw`\u001b\[([0-9;?]*)([@-~])|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)?|\u001b[ -/]*[0-~]?|\r`

const ORPHAN_SGR = String.raw`|\[([0-9;]*)m`

const ORPHAN_RESET = /\[(?:0|22|39|49)?m/

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g

/**
 * Output that lost its escape characters on the way still carries the codes
 * after them (`[32m✓[39m`). Read those as codes only when a reset among them
 * says that is what they are, so a bracketed `[1m]` in ordinary text survives.
 */
function readsOrphanCodes(text: string): boolean {
  return !text.includes(ESC) && ORPHAN_RESET.test(text)
}

function applySgr(style: Style, params: string): Style {
  const codes = params === '' ? [0] : params.split(';').map(Number)
  let next = style
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i]
    if (code === 0) next = PLAIN
    else if (code === 1) next = { ...next, bold: true }
    else if (code === 2) next = { ...next, dim: true }
    else if (code === 22) next = { ...next, bold: false, dim: false }
    else if (code === 39) next = { ...next, color: undefined }
    else if (TERMINAL_SGR_COLORS[code]) next = { ...next, color: TERMINAL_SGR_COLORS[code] }
    else if (code === 38 || code === 48) {
      const mode = codes[i + 1]
      if (mode === 5) {
        const color: TerminalColor | undefined = TERMINAL_INDEXED_COLORS[codes[i + 2]]
        if (code === 38) next = { ...next, color }
        i += 2
      } else if (mode === 2) {
        i += 4
      }
    }
  }
  return next
}

function sameStyle(a: Style, b: Style): boolean {
  return a.color === b.color && a.bold === b.bold && a.dim === b.dim
}

function appendText(spans: TerminalSpan[], text: string, style: Style): void {
  const clean = text.replace(CONTROL, '')
  if (!clean) return
  const last = spans.at(-1)
  if (last && sameStyle(last, style)) last.text += clean
  else spans.push({ text: clean, ...style })
}

/**
 * Command output as a terminal shows it: SGR colour and weight codes become
 * styled spans, every other escape sequence and control character is dropped,
 * and a carriage return overwrites its line as a progress bar does — so no raw
 * escape sequence ever reaches the screen. Trailing blank lines are left out.
 */
export function terminalOutputView(text: string): TerminalOutputView {
  const pattern = new RegExp(SEQUENCES + (readsOrphanCodes(text) ? ORPHAN_SGR : ''), 'g')
  const lines: TerminalSpan[][] = []
  let style = PLAIN
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    let spans: TerminalSpan[] = []
    let at = 0
    for (const match of raw.matchAll(pattern)) {
      appendText(spans, raw.slice(at, match.index), style)
      at = match.index + match[0].length
      if (match[0] === '\r') spans = []
      else if (match[2] === 'm') style = applySgr(style, match[1] ?? '')
      else if (match[3] !== undefined) style = applySgr(style, match[3])
    }
    appendText(spans, raw.slice(at), style)
    lines.push(spans)
  }
  while (lines.length > 0 && lines.at(-1)?.length === 0) lines.pop()
  return {
    lines,
    plain: lines.map((spans) => spans.map((s) => s.text).join('')).join('\n'),
  }
}

/** The text a terminal would show, with no escape sequence or control character in it. */
export function terminalPlainText(text: string): string {
  return terminalOutputView(text).plain
}
