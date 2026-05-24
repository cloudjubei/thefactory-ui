// Shared diff annotation logic. The unified-diff parser itself lives in
// `thefactory-tools/utils` (single source of truth, used by backend + web +
// native). This module adapts that parser's output to a hunk model the
// renderer needs (`'context'` line type split into `'ctx'` / `'meta'`) and
// layers two optional annotations on top:
//
//   • `ignoreWhitespace` — when a paired add/del differ only in
//     whitespace, both lines are marked `_hidden` so the renderer can skip
//     them. Reduces noise on lint / formatter diffs.
//   • `intra` (`'word'` | `'char'`) — paired add/del get per-segment
//     `_markup` arrays so the renderer can highlight the actual changed
//     spans within the line. `'none'` is the no-op default.
//
// Both web `StructuredUnifiedDiff` and native `UnifiedDiff` import from
// here so the two renderers share identical hunk classification.

import { parseUnifiedDiff as parseUnifiedDiffShared } from 'thefactory-tools/utils'

export type IntraMode = 'none' | 'word' | 'char'

export type DiffLineMarkupSegment = { t: 'text' | 'ins' | 'del'; v: string }

export type ParsedDiffLine = {
  type: 'add' | 'del' | 'ctx' | 'meta'
  text: string
  oldLine?: number
  newLine?: number
  /** Set by `annotateHunks` when `ignoreWhitespace` matched a paired
   *  add/del. Renderers should skip these lines visually. */
  _hidden?: boolean
  /** Set by `annotateHunks` when `intra` produced per-segment markup.
   *  Renderers should highlight `ins` / `del` runs within the line. */
  _markup?: Array<DiffLineMarkupSegment>
}

export type ParsedDiffHunk = {
  header?: string
  oldStart: number
  oldLines?: number
  newStart: number
  newLines?: number
  lines: ParsedDiffLine[]
}

/** Adapter around the shared parser that yields renderer-shaped hunks
 *  (`'ctx'` / `'meta'` line types, leaves `_hidden` / `_markup` untouched). */
export function parseUnifiedDiffAnnotated(patch: string | undefined | null): ParsedDiffHunk[] {
  const hunks = parseUnifiedDiffShared(patch ?? undefined) ?? []
  return hunks.map((h) => ({
    header: h.header,
    oldStart: h.oldStart,
    oldLines: h.oldLines,
    newStart: h.newStart,
    newLines: h.newLines,
    lines: h.lines.map((l) => ({
      type:
        l.type === 'context' ? (l.text.startsWith('\\ ') ? 'meta' : 'ctx') : l.type,
      text: l.text,
      oldLine: l.oldLine,
      newLine: l.newLine,
    })),
  }))
}

function normalizeWS(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * LCS-driven intra-line diff. Word mode tokenises on whitespace and word
 * boundaries; char mode operates per-codepoint. Returns paired `aSegs`
 * (deletions) and `bSegs` (insertions) covering the full original strings
 * so consumers can render both sides faithfully.
 */
export function diffIntra(
  a: string,
  b: string,
  mode: IntraMode,
): {
  aSegs: Array<{ t: 'text' | 'del'; v: string }>
  bSegs: Array<{ t: 'text' | 'ins'; v: string }>
} {
  if (mode === 'none') return { aSegs: [{ t: 'text', v: a }], bSegs: [{ t: 'text', v: b }] }
  const seqA = mode === 'word' ? a.split(/(\s+|\b)/) : a.split('')
  const seqB = mode === 'word' ? b.split(/(\s+|\b)/) : b.split('')
  const n = seqA.length
  const m = seqB.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = seqA[i] === seqB[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const aOut: Array<{ t: 'text' | 'del'; v: string }> = []
  const bOut: Array<{ t: 'text' | 'ins'; v: string }> = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (seqA[i] === seqB[j]) {
      aOut.push({ t: 'text', v: seqA[i] })
      bOut.push({ t: 'text', v: seqB[j] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      aOut.push({ t: 'del', v: seqA[i++] })
    } else {
      bOut.push({ t: 'ins', v: seqB[j++] })
    }
  }
  while (i < n) aOut.push({ t: 'del', v: seqA[i++] })
  while (j < m) bOut.push({ t: 'ins', v: seqB[j++] })

  const merge = <T extends { t: string; v: string }>(arr: T[]) =>
    arr.reduce<T[]>((acc, cur) => {
      const prev = acc[acc.length - 1]
      if (prev && prev.t === cur.t) prev.v += cur.v
      else acc.push({ ...cur })
      return acc
    }, [])

  return {
    aSegs: merge(aOut) as Array<{ t: 'text' | 'del'; v: string }>,
    bSegs: merge(bOut) as Array<{ t: 'text' | 'ins'; v: string }>,
  }
}

/**
 * Layer optional `ignoreWhitespace` + `intra` annotations onto a parsed
 * hunk list. Returns a deep-cloned copy; the input is not mutated.
 */
export function annotateHunks(
  hunks: ParsedDiffHunk[],
  opts: { ignoreWhitespace?: boolean; intra?: IntraMode },
): ParsedDiffHunk[] {
  const out = hunks.map((h) => ({
    ...h,
    lines: h.lines.map((l) => ({ ...l })),
  }))

  for (const h of out) {
    const dels: { idx: number; text: string }[] = []

    for (let i = 0; i < h.lines.length; i++) {
      const ln = h.lines[i]
      if (ln.type === 'del') {
        dels.push({ idx: i, text: ln.text })
      } else if (ln.type === 'add') {
        if (dels.length > 0) {
          const cand = dels.shift()!
          if (cand) {
            const a = h.lines[cand.idx]
            const b = ln

            let matched = false
            if (opts.ignoreWhitespace) {
              if (normalizeWS(a.text) === normalizeWS(b.text)) {
                a._hidden = true
                b._hidden = true
                matched = true
              }
            }

            if (!matched && opts.intra && opts.intra !== 'none') {
              const { aSegs, bSegs } = diffIntra(a.text, b.text, opts.intra)
              a._markup = aSegs
              b._markup = bSegs
            }
          }
        }
      } else {
        dels.length = 0
      }
    }
  }
  return out
}

/**
 * Build a partial patch from a user-selected subset of add/del lines.
 * `selectedLines` keys are `"hunkIndex:lineIndex"` (lineIndex relative to
 * the hunk's full lines list, including ctx + meta).
 *
 * `reverse` matters for staged diffs: when the resulting patch will be
 * applied with `git apply --cached --reverse` (i.e. the user is unstaging),
 * the contract for unselected `+/-` lines flips — see inline comments below.
 *
 * Empty selection → only the file-header preamble is returned (no hunks),
 * which `git apply` treats as a no-op patch.
 */
export function generateSelectedPatch(
  patch: string,
  selectedLines: Set<string>,
  reverse = false,
): string {
  const hunks = parseUnifiedDiffAnnotated(patch)

  let out = ''
  const lines = patch.replace(/\r\n/g, '\n').split('\n')
  for (const l of lines) {
    if (l.startsWith('@@')) break
    out += l + '\n'
  }

  for (let hIdx = 0; hIdx < hunks.length; hIdx++) {
    const hunk = hunks[hIdx]
    let oldLinesCount = 0
    let newLinesCount = 0
    let hunkBody = ''
    let hasModifications = false

    let lastLineIncluded: 'add' | 'del' | 'ctx' | null = null

    for (let lIdx = 0; lIdx < hunk.lines.length; lIdx++) {
      const line = hunk.lines[lIdx]
      const isSelected = selectedLines.has(`${hIdx}:${lIdx}`)

      if (line.type === 'meta') {
        // `\ No newline at end of file` follows the line it qualifies — only
        // emit when the preceding line was actually included.
        if (lastLineIncluded) {
          hunkBody += line.text + '\n'
        }
        continue
      }

      if (line.type === 'ctx') {
        hunkBody += ' ' + line.text + '\n'
        oldLinesCount++
        newLinesCount++
        lastLineIncluded = 'ctx'
      } else if (line.type === 'add') {
        if (isSelected) {
          hunkBody += '+' + line.text + '\n'
          newLinesCount++
          hasModifications = true
          lastLineIncluded = 'add'
        } else if (reverse) {
          // Reverse direction: unselected `+` line IS still in the index
          // (we're leaving the staged change in place). Emit as context so
          // git apply's hunk-matching can anchor.
          hunkBody += ' ' + line.text + '\n'
          oldLinesCount++
          newLinesCount++
          lastLineIncluded = 'ctx'
        } else {
          lastLineIncluded = null
        }
      } else if (line.type === 'del') {
        if (isSelected) {
          hunkBody += '-' + line.text + '\n'
          oldLinesCount++
          hasModifications = true
          lastLineIncluded = 'del'
        } else if (reverse) {
          // Reverse direction: unselected `-` line is NOT in the index (the
          // staged change already removed it). Skip it entirely — emitting
          // as context would claim it's still there and break `git apply
          // --reverse` matching.
          lastLineIncluded = null
        } else {
          hunkBody += ' ' + line.text + '\n'
          oldLinesCount++
          newLinesCount++
          lastLineIncluded = 'ctx'
        }
      }
    }

    if (hasModifications) {
      out += `@@ -${hunk.oldStart},${oldLinesCount} +${hunk.newStart},${newLinesCount} @@${hunk.header ? ' ' + hunk.header : ''}\n`
      out += hunkBody
    }
  }
  return out.trimEnd() + '\n'
}

/** Compute the line range covered by a hunk — first to last actual line
 *  number touched. Useful for hunk-header captions like "Lines 12–24". */
export function hunkLineRange(hunk: ParsedDiffHunk): { start: number; end: number } {
  const nums: number[] = []
  for (const l of hunk.lines) {
    if (l.oldLine !== undefined) nums.push(l.oldLine)
    if (l.newLine !== undefined) nums.push(l.newLine)
  }
  if (nums.length === 0) return { start: hunk.oldStart, end: hunk.oldStart }
  return { start: Math.min(...nums), end: Math.max(...nums) }
}
