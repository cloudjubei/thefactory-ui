import { describe, expect, it } from 'vitest'
import { ToolSchemas } from 'thefactory-tools/constants'
import {
  MAX_TOOL_PREVIEW_CHARS,
  canonicalToolPreviewName,
  chatToolPreviewOf,
  getToolHeaderPath,
  isFilePathTool,
  reorderedFeatureId,
  storyAfterPatch,
  safePreviewString,
  searchResultLines,
  toolArgDisplay,
  toolNotRunReason,
} from './toolPreview'

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
    expect(
      toolArgDisplay({ name: 'command_execution', arguments: { command: '/bin/bash -lc "x"' } }),
    ).toEqual({
      kind: 'command',
      text: '/bin/bash -lc "x"',
    })
    expect(toolArgDisplay({ name: 'Bash', arguments: { cmd: 'ls -la' } })).toEqual({
      kind: 'command',
      text: 'ls -la',
    })
  })

  it('shows a single path for our file tools (path beats pattern for grepFile)', () => {
    expect(toolArgDisplay({ name: 'listContents', arguments: { path: 'src' } })).toEqual({
      kind: 'path',
      path: 'src',
    })
    expect(
      toolArgDisplay({ name: 'readFile', arguments: { path: 'a.ts', encoding: 'utf8' } }),
    ).toEqual({
      kind: 'path',
      path: 'a.ts',
    })
    expect(
      toolArgDisplay({ name: 'grepFile', arguments: { path: 'a.ts', pattern: 'foo' } }),
    ).toEqual({
      kind: 'path',
      path: 'a.ts',
    })
  })

  it('shows the native single param (file_path, glob/grep pattern)', () => {
    expect(toolArgDisplay({ name: 'Read', arguments: { file_path: '/repo/a.ts' } })).toEqual({
      kind: 'path',
      path: '/repo/a.ts',
    })
    expect(
      toolArgDisplay({ name: 'Glob', arguments: { pattern: '**/*.ts', path: '/repo' } }),
    ).toEqual({
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
      toolArgDisplay({
        name: 'grepFiles',
        arguments: {
          queries: [
            { path: 'a.ts', pattern: 'x' },
            { path: 'b.ts', pattern: 'y' },
          ],
        },
      }),
    ).toEqual({ kind: 'paths', paths: ['a.ts', 'b.ts'] })
  })

  it('falls back to a salient text field, a raw string, or null', () => {
    expect(toolArgDisplay({ name: 'searchFiles', arguments: { query: 'needle' } })).toEqual({
      kind: 'text',
      text: 'needle',
    })
    expect(toolArgDisplay({ name: 'x', arguments: 'raw' })).toEqual({ kind: 'text', text: 'raw' })
    expect(toolArgDisplay({ name: 'x', arguments: { startLine: 1, endLine: 2 } })).toBeNull()
    expect(toolArgDisplay({ name: 'x', arguments: undefined })).toBeNull()
    expect(toolArgDisplay({ name: 'x', arguments: 123 })).toBeNull()
  })
})

describe('isFilePathTool', () => {
  it('recognises the AST outline tool by its REGISTRY name', () => {
    expect(isFilePathTool('astGetOutline')).toBe(true)
  })

  it('does not recognise the drifted name the registry never had', () => {
    expect(isFilePathTool('getAstOutline')).toBe(false)
  })

  it('excludes the list-taking path tools, whose header is not one path', () => {
    expect(isFilePathTool('deletePaths')).toBe(false)
    expect(isFilePathTool('renamePaths')).toBe(false)
  })

  it('is false for an unknown name', () => {
    expect(isFilePathTool('nopeTool')).toBe(false)
    expect(isFilePathTool(undefined)).toBe(false)
  })
})

describe('getToolHeaderPath', () => {
  it('reads the path of a single-path tool', () => {
    expect(getToolHeaderPath({ name: 'astGetOutline', arguments: { path: 'a/b.ts' } })).toBe(
      'a/b.ts',
    )
  })

  it('joins every path a deletePaths call names', () => {
    expect(getToolHeaderPath({ name: 'deletePaths', arguments: { paths: ['a.ts', 'b.ts'] } })).toBe(
      'a.ts, b.ts',
    )
  })

  it('renders each renamePaths move as src → dst', () => {
    expect(
      getToolHeaderPath({ name: 'renamePaths', arguments: { moves: [{ src: 'a', dst: 'b' }] } }),
    ).toBe('a → b')
  })

  it('returns nothing for an empty deletePaths call rather than an empty string', () => {
    expect(getToolHeaderPath({ name: 'deletePaths', arguments: { paths: [] } })).toBeUndefined()
  })

  it('returns nothing for an empty renamePaths call', () => {
    expect(getToolHeaderPath({ name: 'renamePaths', arguments: { moves: [] } })).toBeUndefined()
  })

  it('still reads the story/feature reference tools', () => {
    expect(
      getToolHeaderPath({ name: 'updateFeature', arguments: { storyId: 's1', featureId: 'f1' } }),
    ).toBe('story s1 / feature f1')
  })

  it('names the story a story delete would remove', () => {
    expect((ToolSchemas as unknown as Record<string, unknown>).deleteStory).toBeDefined()
    expect(getToolHeaderPath({ name: 'deleteStory', arguments: { storyId: 's1' } })).toBe(
      'story s1',
    )
  })

  it('names the feature a feature delete would remove', () => {
    expect((ToolSchemas as unknown as Record<string, unknown>).deleteFeature).toBeDefined()
    expect(
      getToolHeaderPath({ name: 'deleteFeature', arguments: { storyId: 's1', featureId: 'f1' } }),
    ).toBe('story s1 / feature f1')
  })

  it('names only tools the generated registry actually carries', () => {
    const registry = ToolSchemas as unknown as Record<string, unknown>
    for (const name of ['astGetOutline', 'deletePaths', 'renamePaths', 'writeFile', 'readFile']) {
      expect(registry[name], `${name} is not a real tool`).toBeDefined()
      expect(getToolHeaderPath({ name, arguments: {} })).toBeUndefined()
    }
  })
})

describe('canonicalToolPreviewName', () => {
  it("maps a CLI agent's built-in shell tool onto our preview key", () => {
    // claude-code emits `Bash`; the registry key is `bash`. The lookup is an
    // exact-match Set, so casing alone lost the custom preview and a long shell
    // command fell through to the raw-JSON dump that breaks the row.
    expect(canonicalToolPreviewName('Bash')).toBe('bash')
    expect(canonicalToolPreviewName('bash')).toBe('bash')
    expect(canonicalToolPreviewName('shell')).toBe('bash')
    expect(canonicalToolPreviewName('runShellCommand')).toBe('bash')
  })

  it('passes an unaliased name through untouched (casing preserved)', () => {
    expect(canonicalToolPreviewName('updateStory')).toBe('updateStory')
    expect(canonicalToolPreviewName('mobileTestScreenshot')).toBe('mobileTestScreenshot')
  })

  it('falls back to a stable placeholder for a missing name', () => {
    expect(canonicalToolPreviewName(undefined)).toBe('tool')
  })
})

describe('toolNotRunReason', () => {
  it('gives the reason a decided ask records over what the agent was told while it waited', () => {
    expect(
      toolNotRunReason({
        outcome: 'denied',
        reason: 'You declined it.',
        agentInstruction: 'Waiting for approval — stop.',
      }),
    ).toBe('You declined it.')
  })

  it('gives what the host told the agent about the call', () => {
    expect(toolNotRunReason({ outcome: 'stopped', agentInstruction: 'It was REFUSED.' })).toBe(
      'It was REFUSED.',
    )
  })

  it('falls back to the raw result', () => {
    expect(toolNotRunReason({ outcome: 'denied' })).toContain('denied')
  })
})

describe('searchResultLines', () => {
  it('lists a path search as it came', () => {
    expect(searchResultLines(['src/a.ts', 'b.md'])).toEqual(['src/a.ts', 'b.md'])
  })

  it('gives a file hit its matched lines', () => {
    expect(
      searchResultLines([{ path: 'src/a.ts', startLine: 40, endLine: 58 }, { path: 'b.md' }]),
    ).toEqual(['src/a.ts:40-58', 'b.md'])
  })

  it('names a note, story or feature hit by kind, reference and title', () => {
    expect(
      searchResultLines([
        {
          record: { kind: 'note', noteId: 'n1', title: 'QA login', access: 'ask' },
          reference: '&n1',
        },
        { record: { kind: 'story', storyId: 's1', title: 'Refunds' }, reference: '#s1', text: 't' },
        { record: { kind: 'feature', title: 'Refund button' }, reference: '#s1.f1' },
      ]),
    ).toEqual(['note &n1 — QA login', 'story #s1 — Refunds', 'feature #s1.f1 — Refund button'])
  })

  it('lists what a search-and-read found by its keys', () => {
    expect(searchResultLines({ 'src/a.ts': 'code', '#s1': 'Story: Refunds' })).toEqual([
      'src/a.ts',
      '#s1',
    ])
  })

  it('skips what it cannot name', () => {
    expect(searchResultLines([42, { other: true }, { record: {} }])).toEqual([])
    expect(searchResultLines(undefined)).toEqual([])
  })
})

describe('storyAfterPatch', () => {
  const story = { id: 's1', title: 'T', description: 'Old words' }
  const patch = { description: 'New words' }

  it('applies the patch to the current story while no story came back', () => {
    expect(storyAfterPatch(story, patch, { status: 'pending' })).toEqual({
      id: 's1',
      title: 'T',
      description: 'New words',
    })
    expect(storyAfterPatch(story, patch, undefined)?.description).toBe('New words')
  })

  it('applies the patch when the call returned something that is not a story', () => {
    expect(storyAfterPatch(story, patch, { ok: true })?.description).toBe('New words')
    expect(storyAfterPatch(story, patch, 'done')?.description).toBe('New words')
    expect(storyAfterPatch(story, patch, [story])?.description).toBe('New words')
    expect(storyAfterPatch(story, patch, { kind: 'supported', preview: story })?.description).toBe(
      'New words',
    )
  })

  it('takes the story the call returned or proposed', () => {
    const saved = { id: 's1', title: 'T', description: 'Saved words' }
    expect(storyAfterPatch(story, patch, saved)).toBe(saved)
  })

  it('takes a returned story even when the current one is not known', () => {
    const saved = { id: 's1', description: 'Saved words' }
    expect(storyAfterPatch(undefined, patch, saved)).toBe(saved)
  })

  it('has nothing to show without a current story or a returned one', () => {
    expect(storyAfterPatch(undefined, patch, undefined)).toBeUndefined()
  })
})

describe('chatToolPreviewOf', () => {
  it('carries a supported preview as text', () => {
    expect(chatToolPreviewOf({ kind: 'supported', preview: { id: 's1', title: 'T' } })).toEqual({
      status: 'ready',
      patch: JSON.stringify({ id: 's1', title: 'T' }, null, 2),
    })
  })

  it('carries a text preview as it is', () => {
    expect(chatToolPreviewOf({ kind: 'supported', preview: '--- a\n+++ b' })).toEqual({
      status: 'ready',
      patch: '--- a\n+++ b',
    })
  })

  it('carries an empty preview as null text', () => {
    expect(chatToolPreviewOf({ kind: 'supported', preview: null })).toEqual({
      status: 'ready',
      patch: 'null',
    })
  })

  it('has no preview for a tool that cannot preview', () => {
    expect(
      chatToolPreviewOf({ kind: 'not_supported', toolName: 'reorderFeature', reason: 'x' }),
    ).toBeUndefined()
  })
})

describe('reorderedFeatureId', () => {
  const order = [{ id: 'f2' }, { id: 'f1' }, { id: 'f3' }]

  it('names the feature now at the target index', () => {
    expect(reorderedFeatureId({ payload: { fromIndex: 1, toIndex: 0 } }, order)).toBe('f2')
    expect(reorderedFeatureId({ payload: { fromIndex: 0, toIndex: 2 } }, order)).toBe('f3')
  })

  it('names nothing when the call carries no usable target index', () => {
    expect(reorderedFeatureId({}, order)).toBeUndefined()
    expect(reorderedFeatureId({ payload: { toIndex: '1' } }, order)).toBeUndefined()
    expect(reorderedFeatureId({ payload: { toIndex: 9 } }, order)).toBeUndefined()
    expect(reorderedFeatureId({ payload: { toIndex: 0 } }, ['f2'])).toBeUndefined()
    expect(reorderedFeatureId({ payload: { toIndex: 0 } }, [{ id: 7 }])).toBeUndefined()
  })
})
