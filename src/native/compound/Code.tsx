import { ScrollView, Text, View } from 'react-native'

import { nativeFontFamilies, nativeLightTheme, nativeRadii, nativeSpace } from '../../tokens/native'

export type CodeProps = {
  code: string
  /** Accepted for API parity with web's `Code`; native renders monospaced
   *  plain text without per-token highlighting. */
  language?: 'bash' | 'diff' | 'json' | 'python' | 'text' | 'typescript' | (string & {})
}

/**
 * Native peer of [web's `Code`](../../web/compound/Code.tsx). A monospaced,
 * horizontally + vertically scrollable code block. Web highlights tokens via
 * Prism; native renders plain monospaced text — a deliberate rendering
 * difference (the parity contract is features/behaviour, not pixels), and it
 * keeps the block free of an unmaintained native highlighter dependency.
 */
export default function Code({ code }: CodeProps) {
  return (
    <View
      style={{
        backgroundColor: nativeLightTheme.surface.muted,
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
            color: nativeLightTheme.text.primary,
          }}
        >
          {code}
        </Text>
      </ScrollView>
    </View>
  )
}
