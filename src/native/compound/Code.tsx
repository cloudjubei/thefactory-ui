import { ScrollView, Text, View } from 'react-native'

import { useCodeBlockTheme } from '../../headless/hooks/useCodeBlockTheme'
import type { CodeBlockTheme } from '../../headless/types/settings'
import { CODE_BLOCK_PALETTES, CODE_BLOCK_SURFACES } from '../../headless/utils/codeBlockConstants'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../tokens/native'

export type CodeProps = {
  code: string
  /** Highlighter dispatch — `'json'` and `'diff'` get colorised; other
   *  languages render plain monospace (Prism's full grammar set isn't
   *  worth pulling as a native dep). */
  language?: 'bash' | 'diff' | 'json' | 'python' | 'text' | 'typescript' | (string & {})
  /** Explicit override; defaults to the value resolved by
   *  `useCodeBlockTheme()` so call-sites usually omit this. */
  theme?: CodeBlockTheme
}

// Skip the synchronous regex tokeniser for pathologically large strings (a huge tool result) — it would
// emit one <Text> per token and block the JS thread. Above this it renders as plain monospace.
const MAX_HIGHLIGHT_CHARS = 50000

type Seg = { v: string; c: string }
type Palette = (typeof CODE_BLOCK_PALETTES)[CodeBlockTheme]

/**
 * Minimal regex tokeniser for JSON. Strings recognise escapes; keys are
 * detected by a trailing `:` after whitespace. Numbers / literals / punct
 * each get their own token type. Everything else (whitespace, newlines)
 * falls through as `text` so the original line layout is preserved.
 */
function highlightJson(code: string, palette: Palette): Seg[] {
  const out: Seg[] = []
  const re =
    /(\s+)|("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],:])|([^\s"{}\[\],:0-9-]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(code)) !== null) {
    if (m[1]) out.push({ v: m[1], c: palette.text })
    else if (m[2]) {
      const txt = m[2]
      const colonIdx = txt.lastIndexOf(':')
      const keyPart = txt.slice(0, colonIdx).trimEnd()
      const spaceAfter = txt.slice(keyPart.length, colonIdx)
      out.push({ v: keyPart, c: palette.key })
      if (spaceAfter) out.push({ v: spaceAfter, c: palette.text })
      out.push({ v: ':', c: palette.punct })
    } else if (m[3]) out.push({ v: m[3], c: palette.string })
    else if (m[4]) out.push({ v: m[4], c: palette.literal })
    else if (m[5]) out.push({ v: m[5], c: palette.number })
    else if (m[6]) out.push({ v: m[6], c: palette.punct })
    else if (m[7]) out.push({ v: m[7], c: palette.text })
  }
  return out
}

/**
 * Line-prefix-based diff colouriser. Cheap, no parser — every line is
 * coloured by its first character. Matches Prism's diff grammar at a
 * line-level granularity (which is what diff highlighting actually
 * conveys; sub-line intra-diff is rare in tool outputs).
 */
function highlightDiff(code: string, palette: Palette): Seg[] {
  const out: Seg[] = []
  const lines = code.split('\n')
  lines.forEach((line, i) => {
    const ch = line.charAt(0)
    const color =
      ch === '+' ? palette.add : ch === '-' ? palette.del : ch === '@' ? palette.hunk : palette.text
    out.push({ v: line, c: color })
    if (i < lines.length - 1) out.push({ v: '\n', c: palette.text })
  })
  return out
}

/**
 * Native peer of [web's `Code`](../../web/compound/Code.tsx). A monospaced,
 * horizontally + vertically scrollable code block. Mobile colourises JSON
 * and diff inline using a regex tokeniser. The theme follows the user's
 * `codeBlockTheme` preference resolved via `useCodeBlockTheme()`, and each
 * theme has its own surface and token colours (`CODE_BLOCK_PALETTES`), the
 * same as web's `Code`.
 */
export default function Code({ code, language, theme }: CodeProps) {
  const resolvedTheme = useCodeBlockTheme()
  const isDark = (theme ?? resolvedTheme) === 'dark'
  const palette = CODE_BLOCK_PALETTES[isDark ? 'dark' : 'light']
  const bg = CODE_BLOCK_SURFACES[isDark ? 'dark' : 'light']
  const segs: Seg[] | null =
    code.length > MAX_HIGHLIGHT_CHARS
      ? null
      : language === 'json'
        ? highlightJson(code, palette)
        : language === 'diff'
          ? highlightDiff(code, palette)
          : null

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: nativeRadii[3],
        marginVertical: nativeSpace[2],
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={{ padding: nativeSpace[2] }}
      >
        <Text
          selectable
          style={{
            fontFamily: nativeFontFamilies.mono,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {segs ? (
            segs.map((s, i) => (
              <Text key={i} style={{ color: s.c }}>
                {s.v}
              </Text>
            ))
          ) : (
            <Text style={{ color: palette.text }}>{code}</Text>
          )}
        </Text>
      </ScrollView>
    </View>
  )
}
