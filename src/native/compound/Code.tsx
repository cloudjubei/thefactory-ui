import SyntaxHighlighter from 'react-native-syntax-highlighter'
// Light-theme Prism style for parity with web's `prism-tomorrow.css` mapping
// — when native dark theme lands, swap to a dark prism style here.
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
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
