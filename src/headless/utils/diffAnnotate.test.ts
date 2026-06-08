import { describe, expect, it } from 'vitest'
import {
  annotateHunks,
  diffIntra,
  generateSelectedPatch,
  hunkLineRange,
  parseUnifiedDiffAnnotated,
  selectionKeysForLineRange,
  type ParsedDiffHunk,
} from './diffAnnotate'

const SAMPLE_PATCH = [
  '--- a/src/foo.ts',
  '+++ b/src/foo.ts',
  '@@ -1,5 +1,5 @@',
  ' import x from "x"',
  ' ',
  '-const greet = "hello"',
  '+const greet = "Hello, world"',
  ' ',
  ' export { greet }',
  '',
].join('\n')

describe('parseUnifiedDiffAnnotated', () => {
  it('parses hunks and maps context lines to `ctx`', () => {
    const hunks = parseUnifiedDiffAnnotated(SAMPLE_PATCH)
    expect(hunks).toHaveLength(1)
    const lines = hunks[0].lines
    // Header lines vs. body lines: every line that's not add/del/meta is ctx.
    const types = lines.map((l) => l.type)
    expect(types).toEqual(['ctx', 'ctx', 'del', 'add', 'ctx', 'ctx'])
  })

  it('classifies the `\\ No newline at end of file` marker as `meta`', () => {
    const patch = [
      '--- a/x',
      '+++ b/x',
      '@@ -1,1 +1,1 @@',
      '-old',
      '\\ No newline at end of file',
      '+new',
      '',
    ].join('\n')
    const [hunk] = parseUnifiedDiffAnnotated(patch)
    const metas = hunk.lines.filter((l) => l.type === 'meta')
    expect(metas).toHaveLength(1)
    expect(metas[0].text.startsWith('\\ ')).toBe(true)
  })

  it('returns an empty array for empty / nullish input', () => {
    expect(parseUnifiedDiffAnnotated('')).toEqual([])
    expect(parseUnifiedDiffAnnotated(undefined)).toEqual([])
    expect(parseUnifiedDiffAnnotated(null)).toEqual([])
  })
})

describe('annotateHunks', () => {
  function buildHunk(lines: ParsedDiffHunk['lines']): ParsedDiffHunk {
    return { oldStart: 1, newStart: 1, lines }
  }

  it('is a no-op when no options are passed', () => {
    const hunks = parseUnifiedDiffAnnotated(SAMPLE_PATCH)
    const out = annotateHunks(hunks, {})
    expect(out[0].lines.some((l) => l._hidden)).toBe(false)
    expect(out[0].lines.some((l) => l._markup)).toBe(false)
  })

  it('returns a deep-cloned copy — input hunks are not mutated', () => {
    const input = parseUnifiedDiffAnnotated(SAMPLE_PATCH)
    const out = annotateHunks(input, { intra: 'word' })
    expect(out).not.toBe(input)
    expect(out[0]).not.toBe(input[0])
    expect(out[0].lines[0]).not.toBe(input[0].lines[0])
    // Input is untouched
    expect(input[0].lines.every((l) => l._markup === undefined)).toBe(true)
  })

  it('hides paired add/del whose text differs only in whitespace when ignoreWhitespace=true', () => {
    const hunk = buildHunk([
      { type: 'del', text: 'const x =  1' },
      { type: 'add', text: 'const x = 1' },
    ])
    const out = annotateHunks([hunk], { ignoreWhitespace: true })
    expect(out[0].lines[0]._hidden).toBe(true)
    expect(out[0].lines[1]._hidden).toBe(true)
  })

  it('does NOT hide paired add/del when ignoreWhitespace=false', () => {
    const hunk = buildHunk([
      { type: 'del', text: 'const x =  1' },
      { type: 'add', text: 'const x = 1' },
    ])
    const out = annotateHunks([hunk], { ignoreWhitespace: false })
    expect(out[0].lines[0]._hidden).toBeUndefined()
    expect(out[0].lines[1]._hidden).toBeUndefined()
  })

  it('writes per-segment `_markup` on paired add/del when intra is `word`', () => {
    const hunk = buildHunk([
      { type: 'del', text: 'hello world' },
      { type: 'add', text: 'hello brave world' },
    ])
    const out = annotateHunks([hunk], { intra: 'word' })
    const aMarkup = out[0].lines[0]._markup
    const bMarkup = out[0].lines[1]._markup
    expect(aMarkup).toBeDefined()
    expect(bMarkup).toBeDefined()
    // The shared `hello` and `world` tokens render as `text`; only the
    // added `brave` shows up as `ins` on the b-side, with nothing on the
    // a-side except the shared tokens.
    expect(bMarkup!.some((s) => s.t === 'ins' && s.v.includes('brave'))).toBe(true)
    expect(aMarkup!.every((s) => s.t === 'text')).toBe(true)
  })

  it('skips intra annotation when intra is `none`', () => {
    const hunk = buildHunk([
      { type: 'del', text: 'a' },
      { type: 'add', text: 'b' },
    ])
    const out = annotateHunks([hunk], { intra: 'none' })
    expect(out[0].lines[0]._markup).toBeUndefined()
    expect(out[0].lines[1]._markup).toBeUndefined()
  })

  it('prefers ignoreWhitespace over intra when both match — paired lines hide rather than markup', () => {
    const hunk = buildHunk([
      { type: 'del', text: 'foo  bar' },
      { type: 'add', text: 'foo bar' },
    ])
    const out = annotateHunks([hunk], { ignoreWhitespace: true, intra: 'word' })
    // Whitespace-only diff: hide BOTH and don't bother annotating intra.
    expect(out[0].lines[0]._hidden).toBe(true)
    expect(out[0].lines[1]._hidden).toBe(true)
    expect(out[0].lines[0]._markup).toBeUndefined()
    expect(out[0].lines[1]._markup).toBeUndefined()
  })

  it('falls back to intra markup when whitespace check does NOT match', () => {
    const hunk = buildHunk([
      { type: 'del', text: 'const x = 1' },
      { type: 'add', text: 'const x = 2' },
    ])
    const out = annotateHunks([hunk], { ignoreWhitespace: true, intra: 'word' })
    expect(out[0].lines[0]._hidden).toBeUndefined()
    expect(out[0].lines[0]._markup).toBeDefined()
    expect(out[0].lines[1]._markup).toBeDefined()
  })

  it('only pairs add/del that are consecutive in the hunk — context lines reset the queue', () => {
    const hunk = buildHunk([
      { type: 'del', text: 'a' },
      { type: 'ctx', text: 'unchanged' },
      { type: 'add', text: 'b' }, // ctx in between → NOT paired with the del above
    ])
    const out = annotateHunks([hunk], { intra: 'word' })
    expect(out[0].lines[0]._markup).toBeUndefined()
    expect(out[0].lines[2]._markup).toBeUndefined()
  })

  it('pairs in FIFO order — first del with first add, second del with second add', () => {
    const hunk = buildHunk([
      { type: 'del', text: 'one' },
      { type: 'del', text: 'two' },
      { type: 'add', text: 'one!' },
      { type: 'add', text: 'two!' },
    ])
    const out = annotateHunks([hunk], { intra: 'char' })
    // Both pairs get markup; del[0]↔add[0], del[1]↔add[1].
    expect(out[0].lines[0]._markup).toBeDefined()
    expect(out[0].lines[1]._markup).toBeDefined()
    expect(out[0].lines[2]._markup).toBeDefined()
    expect(out[0].lines[3]._markup).toBeDefined()
  })

  it('leaves orphan add or del lines unannotated', () => {
    const hunkAddOnly = buildHunk([{ type: 'add', text: 'new' }])
    const hunkDelOnly = buildHunk([{ type: 'del', text: 'gone' }])
    expect(annotateHunks([hunkAddOnly], { intra: 'word' })[0].lines[0]._markup).toBeUndefined()
    expect(annotateHunks([hunkDelOnly], { intra: 'word' })[0].lines[0]._markup).toBeUndefined()
  })
})

describe('diffIntra', () => {
  it('returns the full strings as single `text` segments in `none` mode', () => {
    const r = diffIntra('foo', 'bar', 'none')
    expect(r.aSegs).toEqual([{ t: 'text', v: 'foo' }])
    expect(r.bSegs).toEqual([{ t: 'text', v: 'bar' }])
  })

  it('marks word-level inserts/deletes', () => {
    const r = diffIntra('the quick brown fox', 'the quick red fox', 'word')
    // `brown` is removed from a, `red` is added to b. Other tokens are shared `text`.
    expect(r.aSegs.some((s) => s.t === 'del' && s.v === 'brown')).toBe(true)
    expect(r.bSegs.some((s) => s.t === 'ins' && s.v === 'red')).toBe(true)
  })

  it('marks character-level inserts/deletes', () => {
    const r = diffIntra('color', 'colour', 'char')
    // `colour` adds the `u`. Everything else is shared.
    expect(r.bSegs.some((s) => s.t === 'ins' && s.v === 'u')).toBe(true)
  })

  it('merges adjacent same-type segments — no consecutive runs of the same `t`', () => {
    const r = diffIntra('aaa', 'aab', 'char')
    for (const segs of [r.aSegs, r.bSegs]) {
      for (let i = 1; i < segs.length; i++) {
        expect(segs[i].t).not.toBe(segs[i - 1].t)
      }
    }
  })
})

describe('hunkLineRange', () => {
  it('returns the min/max of all line numbers across the hunk', () => {
    const hunk: ParsedDiffHunk = {
      oldStart: 5,
      newStart: 5,
      lines: [
        { type: 'ctx', text: '', oldLine: 5, newLine: 5 },
        { type: 'del', text: '', oldLine: 6 },
        { type: 'add', text: '', newLine: 6 },
        { type: 'add', text: '', newLine: 7 },
        { type: 'ctx', text: '', oldLine: 7, newLine: 8 },
      ],
    }
    expect(hunkLineRange(hunk)).toEqual({ start: 5, end: 8 })
  })

  it('falls back to oldStart for both bounds when the hunk has no line numbers', () => {
    const hunk: ParsedDiffHunk = {
      oldStart: 12,
      newStart: 12,
      lines: [{ type: 'meta', text: '\\ No newline at end of file' }],
    }
    expect(hunkLineRange(hunk)).toEqual({ start: 12, end: 12 })
  })
})

describe('generateSelectedPatch', () => {
  const TWO_HUNK_PATCH = [
    'diff --git a/x.txt b/x.txt',
    '--- a/x.txt',
    '+++ b/x.txt',
    '@@ -1,3 +1,3 @@',
    ' alpha',
    '-bravo',
    '+BRAVO',
    ' charlie',
    '@@ -10,2 +10,2 @@',
    '-delta',
    '+DELTA',
    '',
  ].join('\n')

  it('returns just the file-header preamble when no lines are selected', () => {
    const out = generateSelectedPatch(TWO_HUNK_PATCH, new Set())
    // No `hasModifications` hunk got included, so the result is the preamble
    // only — no `@@` lines remain.
    expect(out).not.toContain('@@')
    expect(out).toContain('diff --git a/x.txt b/x.txt')
  })

  it('includes only the hunk(s) whose selected lines drive modifications', () => {
    // Select the `+BRAVO` from hunk 0 (line index 2).
    const out = generateSelectedPatch(TWO_HUNK_PATCH, new Set(['0:2']))
    expect(out).toContain('@@ -1,')
    expect(out).toContain('+BRAVO')
    // Hunk 1 should NOT appear — nothing selected there.
    expect(out).not.toContain('-delta')
    expect(out).not.toContain('+DELTA')
  })

  it('forward mode: unselected `-` becomes context; unselected `+` is dropped', () => {
    // Select only the `-bravo` (line index 1) from hunk 0. In forward mode
    // the unselected `+BRAVO` is NOT in the old side, so it's dropped
    // entirely (not promoted to context). The unselected `-` lines (none
    // in this hunk besides the one we selected) would become context.
    const out = generateSelectedPatch(TWO_HUNK_PATCH, new Set(['0:1']))
    expect(out).toContain('-bravo')
    // `+BRAVO` is unselected in forward mode → dropped entirely.
    expect(out).not.toContain('BRAVO')
  })

  it('forward mode: unselected `-` lines promote to context', () => {
    // Add a second `-` so we can verify unselected del → context. Select
    // only the FIRST del; the second should appear as context.
    const patch = [
      'diff --git a/y b/y',
      '--- a/y',
      '+++ b/y',
      '@@ -1,3 +1,1 @@',
      '-one',
      '-two',
      ' three',
      '',
    ].join('\n')
    const out = generateSelectedPatch(patch, new Set(['0:0']))
    expect(out).toContain('-one')
    // `-two` is unselected → becomes context ` two`.
    expect(out).toContain(' two')
    expect(out).not.toContain('-two')
  })

  it('reverse=true: unselected `+` stays as context, unselected `-` is dropped', () => {
    // Select the `+BRAVO` (line index 2). The unselected `-bravo` is the
    // pre-staged state in reverse mode, so it must be SKIPPED entirely (not
    // promoted to context). The unselected status of the `+BRAVO` is
    // moot here since it IS selected.
    const out = generateSelectedPatch(TWO_HUNK_PATCH, new Set(['0:2']), true)
    expect(out).toContain('+BRAVO')
    // `-bravo` was not selected and we're in reverse mode → dropped.
    expect(out).not.toContain('-bravo')
    // Not promoted to context either.
    expect(out).not.toContain(' bravo')
  })

  it('rewrites the hunk-header counts to match the actually-emitted lines', () => {
    // Hunk 0 has 2 context lines + 1 del + 1 add. Selecting only the `-bravo`
    // drops the `+BRAVO` entirely (forward mode), so output should have
    // 3 old lines (alpha + bravo + charlie) / 2 new lines (alpha + charlie).
    const out = generateSelectedPatch(TWO_HUNK_PATCH, new Set(['0:1']))
    expect(out).toMatch(/@@ -1,3 \+1,2 @@/)
  })
})

describe('selectionKeysForLineRange', () => {
  // SAMPLE_PATCH hunk lines map to: ['ctx','ctx','del','add','ctx','ctx'] —
  // del at index 2, add at index 3.
  const hunk = parseUnifiedDiffAnnotated(SAMPLE_PATCH)[0]

  it('returns the add/del keys inside the range, keyed by hunk index', () => {
    expect(selectionKeysForLineRange(hunk, 0, 2, 3)).toEqual(new Set(['0:2', '0:3']))
  })

  it('uses the supplied hunk index in the keys', () => {
    expect(selectionKeysForLineRange(hunk, 4, 2, 3)).toEqual(new Set(['4:2', '4:3']))
  })

  it('excludes context lines that fall within the range', () => {
    // Whole-hunk range [0,5] still only yields the two changed lines.
    expect(selectionKeysForLineRange(hunk, 0, 0, 5)).toEqual(new Set(['0:2', '0:3']))
  })

  it('returns an empty set for a context-only range', () => {
    expect(selectionKeysForLineRange(hunk, 0, 0, 1)).toEqual(new Set())
  })

  it('selects a single changed line', () => {
    expect(selectionKeysForLineRange(hunk, 0, 2, 2)).toEqual(new Set(['0:2']))
  })

  it('normalises a reversed range (end before start)', () => {
    expect(selectionKeysForLineRange(hunk, 0, 3, 2)).toEqual(new Set(['0:2', '0:3']))
  })

  it('excludes the `\\ No newline` meta line from the range', () => {
    const metaHunk = parseUnifiedDiffAnnotated(
      [
        '--- a/x',
        '+++ b/x',
        '@@ -1,1 +1,1 @@',
        '-old',
        '+new',
        '\\ No newline at end of file',
        '',
      ].join('\n'),
    )[0]
    // Range covers del(0), add(1), meta(2) — only the add/del survive.
    expect(selectionKeysForLineRange(metaHunk, 0, 0, 2)).toEqual(new Set(['0:0', '0:1']))
  })

  it('round-trips through generateSelectedPatch into a valid partial patch', () => {
    const keys = selectionKeysForLineRange(hunk, 0, 2, 3)
    const out = generateSelectedPatch(SAMPLE_PATCH, keys, false)
    expect(out).toContain('@@ -1,')
    expect(out).toContain('-const greet = "hello"')
    expect(out).toContain('+const greet = "Hello, world"')
  })

  it('excludes lines hidden by ignoreWhitespace from a dragged range', () => {
    // A whitespace-only del/add pair gets `_hidden` under ignoreWhitespace and
    // renders no row — so a drag spanning the surrounding visible rows must NOT
    // sweep those invisible lines into the patch.
    const wsHunk = annotateHunks(
      parseUnifiedDiffAnnotated(
        ['--- a/x', '+++ b/x', '@@ -1,1 +1,1 @@', '-const b =  2', '+const b = 2', ''].join('\n'),
      ),
      { ignoreWhitespace: true },
    )[0]
    expect(wsHunk.lines[0]._hidden).toBe(true)
    expect(wsHunk.lines[1]._hidden).toBe(true)
    // Whole-range drag over both hidden lines yields nothing.
    expect(selectionKeysForLineRange(wsHunk, 0, 0, 1)).toEqual(new Set())
  })

  it('keeps non-whitespace changes that sit beside hidden lines in range', () => {
    // ctx(0), ws-only del(1)+add(2) hidden, real del(3)+add(4). A drag from the
    // ctx to the real change spans the hidden pair but only the real change
    // should be keyed.
    const mixed = annotateHunks(
      parseUnifiedDiffAnnotated(
        [
          '--- a/x',
          '+++ b/x',
          '@@ -1,3 +1,3 @@',
          ' ctx',
          '-const b =  2',
          '+const b = 2',
          '-const a = 1',
          '+const a = 11',
          '',
        ].join('\n'),
      ),
      { ignoreWhitespace: true },
    )[0]
    expect(mixed.lines[1]._hidden).toBe(true)
    expect(mixed.lines[2]._hidden).toBe(true)
    expect(selectionKeysForLineRange(mixed, 0, 0, 4)).toEqual(new Set(['0:3', '0:4']))
  })
})
