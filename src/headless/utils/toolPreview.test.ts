import { describe, expect, it } from 'vitest'
import { MAX_TOOL_PREVIEW_CHARS, safePreviewString, toolArgDisplay } from './toolPreview'

describe('safePreviewString', () => {
  it('passes a short string through unchanged', () => {
    expect(safePreviewString('hello')).toEqual({ text: 'hello', truncated: false, omittedChars: 0 })
  })

  it('pretty-prints a short object', () => {
    expect(safePreviewString({ a: 1 }).text).toBe('{\n  "a": 1\n}')
  })

  it('serialises nullish to an empty string', () => {
    expect(safePreviewString(undefined)).toEqual({ text: '', truncated: false, omittedChars: 0 })
    expect(safePreviewString(null).text).toBe('')
  })

  it('caps an over-long string and reports the omission', () => {
    const big = 'x'.repeat(MAX_TOOL_PREVIEW_CHARS + 5000)
    const out = safePreviewString(big)
    expect(out.truncated).toBe(true)
    expect(out.omittedChars).toBe(5000)
    expect(out.text.length).toBeLessThan(big.length)
    expect(out.text).toContain('truncated')
  })

  it('honours an explicit smaller cap', () => {
    const out = safePreviewString('abcdefghij', 4)
    expect(out.text.startsWith('abcd')).toBe(true)
    expect(out.truncated).toBe(true)
    expect(out.omittedChars).toBe(6)
  })

  it('does not throw on a circular structure', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => safePreviewString(circular)).not.toThrow()
  })
})

describe('toolArgDisplay', () => {
  it('returns the command for a command-execution tool', () => {
    expect(toolArgDisplay({ name: 'command_execution', arguments: { command: '/bin/bash -lc "x"' } })).toEqual({
      kind: 'command',
      text: '/bin/bash -lc "x"',
    })
    expect(toolArgDisplay({ name: 'Bash', arguments: { cmd: 'ls -la' } })).toEqual({ kind: 'command', text: 'ls -la' })
  })

  it('shows a single path for our file tools (path beats pattern for grepFile)', () => {
    expect(toolArgDisplay({ name: 'listContents', arguments: { path: 'src' } })).toEqual({ kind: 'path', path: 'src' })
    expect(toolArgDisplay({ name: 'readFile', arguments: { path: 'a.ts', encoding: 'utf8' } })).toEqual({
      kind: 'path',
      path: 'a.ts',
    })
    expect(toolArgDisplay({ name: 'grepFile', arguments: { path: 'a.ts', pattern: 'foo' } })).toEqual({
      kind: 'path',
      path: 'a.ts',
    })
  })

  it('shows the native single param (file_path, glob/grep pattern)', () => {
    expect(toolArgDisplay({ name: 'Read', arguments: { file_path: '/repo/a.ts' } })).toEqual({
      kind: 'path',
      path: '/repo/a.ts',
    })
    expect(toolArgDisplay({ name: 'Glob', arguments: { pattern: '**/*.ts', path: '/repo' } })).toEqual({
      kind: 'text',
      text: '**/*.ts',
    })
    expect(toolArgDisplay({ name: 'Grep', arguments: { pattern: 'TODO', path: 'src' } })).toEqual({
      kind: 'text',
      text: 'TODO',
    })
  })

  it('shows multiple paths for readPaths and path-bearing query batches', () => {
    expect(toolArgDisplay({ name: 'readPaths', arguments: { paths: ['a.ts', 'b.ts'] } })).toEqual({
      kind: 'paths',
      paths: ['a.ts', 'b.ts'],
    })
    expect(
      toolArgDisplay({ name: 'grepFiles', arguments: { queries: [{ path: 'a.ts', pattern: 'x' }, { path: 'b.ts', pattern: 'y' }] } }),
    ).toEqual({ kind: 'paths', paths: ['a.ts', 'b.ts'] })
  })

  it('falls back to a salient text field, a raw string, or null', () => {
    expect(toolArgDisplay({ name: 'searchFiles', arguments: { query: 'needle' } })).toEqual({ kind: 'text', text: 'needle' })
    expect(toolArgDisplay({ name: 'x', arguments: 'raw' })).toEqual({ kind: 'text', text: 'raw' })
    expect(toolArgDisplay({ name: 'x', arguments: { startLine: 1, endLine: 2 } })).toBeNull()
    expect(toolArgDisplay({ name: 'x', arguments: undefined })).toBeNull()
    expect(toolArgDisplay({ name: 'x', arguments: 123 })).toBeNull()
  })
})
