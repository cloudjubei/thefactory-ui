import { describe, expect, it } from 'vitest'

import { terminalOutputView, terminalPlainText } from './terminalOutput'

const span = (
  text: string,
  over: Partial<{ color: string; bold: boolean; dim: boolean }> = {},
) => ({ text, color: undefined, bold: false, dim: false, ...over })

describe('terminalOutputView', () => {
  it('reads plain output as one unstyled span per line', () => {
    expect(terminalOutputView('one\ntwo')).toEqual({
      lines: [[span('one')], [span('two')]],
      plain: 'one\ntwo',
    })
  })

  it('turns vitest’s colour codes into coloured spans and never shows an escape sequence', () => {
    const view = terminalOutputView(
      '\u001b[32m✓\u001b[39m src/a.test.ts \u001b[2m(3 tests)\u001b[22m\n\u001b[1m\u001b[31mFAIL\u001b[39m\u001b[22m b',
    )
    expect(view.lines).toEqual([
      [span('✓', { color: 'green' }), span(' src/a.test.ts '), span('(3 tests)', { dim: true })],
      [span('FAIL', { color: 'red', bold: true }), span(' b')],
    ])
    expect(view.plain).toBe('✓ src/a.test.ts (3 tests)\nFAIL b')
    expect(view.plain).not.toMatch(/\u001b|\[\d+m/)
  })

  it('reads bright and 256-colour foregrounds, and ignores background and true colours', () => {
    const view = terminalOutputView(
      '\u001b[91ma\u001b[38;5;4mb\u001b[38;5;200mc\u001b[48;5;1;33md\u001b[38;2;1;2;3me\u001b[0mf',
    )
    expect(view.lines[0]).toEqual([
      span('a', { color: 'brightRed' }),
      span('b', { color: 'blue' }),
      span('c'),
      span('de', { color: 'yellow' }),
      span('f'),
    ])
  })

  it('carries a style across lines until it is reset', () => {
    expect(terminalOutputView('\u001b[33mwarn\nstill\u001b[m\nplain').lines).toEqual([
      [span('warn', { color: 'yellow' })],
      [span('still', { color: 'yellow' })],
      [span('plain')],
    ])
  })

  it('drops cursor, erase and title sequences and stray control characters', () => {
    const view = terminalOutputView(
      '\u001b[2K\u001b[1Gbuilding\u0007\u001b]0;title\u0007 done\u0008\u001b(B\u001b',
    )
    expect(view.plain).toBe('building done')
  })

  it('lets a carriage return overwrite its line, as a progress bar does', () => {
    expect(terminalOutputView('10%\r50%\r\u001b[32m100%\u001b[0m\r\nnext').lines).toEqual([
      [span('100%', { color: 'green' })],
      [span('next')],
    ])
  })

  it('reads codes whose escape character was lost, when a reset says they are codes', () => {
    const view = terminalOutputView('[32m✓ [39msrc/a.test.ts [2m(3)[22m')
    expect(view.lines[0]).toEqual([
      span('✓ ', { color: 'green' }),
      span('src/a.test.ts '),
      span('(3)', { dim: true }),
    ])
  })

  it('leaves bracketed text alone when nothing marks it as a code', () => {
    expect(terminalOutputView('took [1m] to run').plain).toBe('took [1m] to run')
  })

  it('keeps blank lines inside the output and drops the trailing ones', () => {
    expect(terminalOutputView('a\n\nb\n\n\n')).toEqual({
      lines: [[span('a')], [], [span('b')]],
      plain: 'a\n\nb',
    })
  })

  it('reads empty output as no lines', () => {
    expect(terminalOutputView('')).toEqual({ lines: [], plain: '' })
  })
})

describe('terminalPlainText', () => {
  it('is the text with every sequence removed', () => {
    expect(terminalPlainText('\u001b[31mexpected 1\u001b[39m to be 2')).toBe('expected 1 to be 2')
  })
})
