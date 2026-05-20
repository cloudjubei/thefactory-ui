import SyntaxHighlighter from 'react-native-syntax-highlighter'
// Light-theme Prism style for parity with web's `prism-tomorrow.css` mapping
// — when native dark theme lands, swap to a dark prism style here.
// `react-native-syntax-highlighter` ships an old (v6) `react-syntax-highlighter`
// alongside the bundle, so resolve the style from the CJS path rather than the
// v15+ `dist/esm/...` path that doesn't exist in v6. @types only ship for v15+,
// so there's no declaration file for this sub-path — the import is typed `any`,
// which is fine because we only forward `tomorrow` as a style prop.
// eslint-disable-next-line import/no-unresolved
// @ts-expect-error: no @types for v6 sub-paths
import { tomorrow } from 'react-syntax-highlighter/dist/styles/prism'
import { View } from 'react-native'

import { nativeLightTheme, nativeRadii, nativeSpace } from '../../tokens/native'

export type CodeProps = {
  code: string
  language: 'bash' | 'diff' | 'json' | 'python' | 'text' | 'typescript' | (string & {})
}

const SUPPORTED: Record<string, true> = {
  bash: true,
  diff: true,
  json: true,
  python: true,
  text: true,
  typescript: true,
}

/**
 * Native peer of [web's `Code`](../../web/compound/Code.tsx). Syntax-
 * highlighted via `react-native-syntax-highlighter` (Prism, light theme).
 * Same supported languages list as web; falls back to plain monospaced
 * text for everything else. Pulls block chrome (radius, padding,
 * surface colour) from native tokens so the block reads identically next
 * to surrounding compounds.
 */
export default function Code({ code, language }: CodeProps) {
  const lang = SUPPORTED[language] ? language : 'text'

  return (
    <View
      style={{
        backgroundColor: nativeLightTheme.surface.muted,
        borderRadius: nativeRadii[3],
        padding: nativeSpace[2],
        marginVertical: nativeSpace[2],
      }}
    >
      <SyntaxHighlighter
        language={lang}
        style={tomorrow}
        fontSize={13}
        fontFamily="Courier"
        highlighter="prism"
        customStyle={{
          backgroundColor: 'transparent',
          padding: 0,
          margin: 0,
        }}
      >
        {code}
      </SyntaxHighlighter>
    </View>
  )
}
