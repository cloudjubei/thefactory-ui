import { ScrollView, Text, View } from 'react-native'

import { useCodeBlockTheme } from '../../headless/hooks/useCodeBlockTheme'
import type { CodeBlockTheme } from '../../headless/types/settings'
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

// Prism-tomorrow palette. Both light + dark themes share these token
// colours so a JSON / diff rendered on either web or mobile, at either
// theme, reads with identical highlighting — only the surface colour
// changes per theme.
const PALETTE = {
  key: '#f08d49',
  string: '#7ec699',
  number: '#f8c555',
  literal: '#cc99cd',
  punct: '#cccccc',
  add: '#7ec699',
  del: '#e2777a',
  hunk: '#67cdcc',
  text: '#ccc',
} as const

const DARK_BG = '#2d2d2d'
const LIGHT_BG = '#ffffff'
// Plain (non-highlightable) language fallback needs a readable text colour
// against the surface — light surface gets dark text, dark surface keeps
// prism-tomorrow's `#ccc`.
const LIGHT_PLAIN_TEXT = '#383a42'

type Seg = { v: string; c: string }

/**
 * Minimal regex tokeniser for JSON. Strings recognise escapes; keys are
 * detected by a trailing `:` after whitespace. Numbers / literals / punct
 * each get their own token type. Everything else (whitespace, newlines)
 * falls through as `text` so the original line layout is preserved.
 */
function highlightJson(code: string): Seg[] {
  const out: Seg[] = []
  const re =
    /(\s+)|("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],:])|([^\s"{}\[\],:0-9-]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(code)) !== null) {
    if (m[1]) out.push({ v: m[1], c: PALETTE.text })
    else if (m[2]) {
      const txt = m[2]
      const colonIdx = txt.lastIndexOf(':')
      const keyPart = txt.slice(0, colonIdx).trimEnd()
      const spaceAfter = txt.slice(keyPart.length, colonIdx)
      out.push({ v: keyPart, c: PALETTE.key })
      if (spaceAfter) out.push({ v: spaceAfter, c: PALETTE.text })
      out.push({ v: ':', c: PALETTE.punct })
    } else if (m[3]) out.push({ v: m[3], c: PALETTE.string })
    else if (m[4]) out.push({ v: m[4], c: PALETTE.literal })
    else if (m[5]) out.push({ v: m[5], c: PALETTE.number })
    else if (m[6]) out.push({ v: m[6], c: PALETTE.punct })
    else if (m[7]) out.push({ v: m[7], c: PALETTE.text })
  }
  return out
}

/**
 * Line-prefix-based diff colouriser. Cheap, no parser — every line is
 * coloured by its first character. Matches Prism's diff grammar at a
 * line-level granularity (which is what diff highlighting actually
 * conveys; sub-line intra-diff is rare in tool outputs).
 */
function highlightDiff(code: string): Seg[] {
  const out: Seg[] = []
  const lines = code.split('\n')
  lines.forEach((line, i) => {
    const ch = line.charAt(0)
    const color =
      ch === '+'
        ? PALETTE.add
        : ch === '-'
          ? PALETTE.del
          : ch === '@'
            ? PALETTE.hunk
            : PALETTE.text
    out.push({ v: line, c: color })
    if (i < lines.length - 1) out.push({ v: '\n', c: PALETTE.text })
  })
  return out
}

/**
 * Native peer of [web's `Code`](../../web/compound/Code.tsx). A monospaced,
 * horizontally + vertically scrollable code block. Mobile colourises JSON
 * and diff inline using a regex tokeniser styled with the prism-tomorrow
 * palette. The active surface follows the user's `codeBlockTheme`
 * preference resolved via `useCodeBlockTheme()` — light = white, dark =
 * `#2d2d2d` — and matches web's `Code` 1:1.
 */
export default function Code({ code, language, theme }: CodeProps) {
  const resolvedTheme = useCodeBlockTheme()
  const isDark = (theme ?? resolvedTheme) === 'dark'
  const bg = isDark ? DARK_BG : LIGHT_BG
  const plainColor = isDark ? PALETTE.text : LIGHT_PLAIN_TEXT
  const segs: Seg[] | null =
    language === 'json'
      ? highlightJson(code)
      : language === 'diff'
        ? highlightDiff(code)
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
            <Text style={{ color: plainColor }}>{code}</Text>
          )}
        </Text>
      </ScrollView>
    </View>
  )
}
