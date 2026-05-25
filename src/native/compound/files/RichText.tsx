import { useMemo, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { tokenizeRichText } from '../../../headless/utils/richTextTokenize'
import { nativeLightTheme, nativePalette, nativeRadii, nativeSpace } from '../../../tokens/native'
import FileDisplay, { type UikitFileMeta } from './FileDisplay'

export interface RichTextProps {
  text: string | null | undefined
  /** Resolves `@<token>` to a file. Returning `null` renders an unresolved pill. */
  onResolveFile?: (token: string) => UikitFileMeta | null
  /** Renders `#<dep>`. Receives the value without the leading `#`. When
   * omitted, the raw token renders as plain text. */
  renderDependency?: (dep: string) => ReactNode
  /**
   * Overrides the default text color. Used by the user-bubble in chat
   * messages to render white text on the blue background (matches web).
   */
  textColor?: string
}

const TOKEN_PILL_STYLE = {
  paddingHorizontal: nativeSpace[3],
  paddingVertical: 2,
  borderRadius: nativeRadii[1],
  borderWidth: 1,
  borderColor: nativeLightTheme.border.subtle,
}

export default function RichText({ text, onResolveFile, renderDependency, textColor }: RichTextProps) {
  const segments = useMemo(() => tokenizeRichText(text ?? ''), [text])
  const baseColor = textColor ?? nativeLightTheme.text.primary

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return (
            <Text key={idx} style={{ fontSize: 14, color: baseColor }}>
              {seg.value}
            </Text>
          )
        }
        if (seg.type === 'dep') {
          if (renderDependency) return <View key={idx}>{renderDependency(seg.value)}</View>
          return (
            <Text key={idx} style={{ fontSize: 14, color: baseColor }}>
              {seg.raw}
            </Text>
          )
        }
        const meta = onResolveFile?.(seg.value) ?? null
        if (!meta) {
          return (
            <View
              key={idx}
              accessibilityLabel={`File not found: ${seg.value}`}
              style={{
                ...TOKEN_PILL_STYLE,
                borderStyle: 'dashed',
                backgroundColor: 'transparent',
              }}
            >
              <Text style={{ fontSize: 13, color: nativeLightTheme.text.secondary }}>
                @{seg.value}
              </Text>
            </View>
          )
        }
        return (
          <View
            key={idx}
            style={{
              ...TOKEN_PILL_STYLE,
              backgroundColor: nativePalette.blue[50],
            }}
          >
            <FileDisplay file={meta} density="compact" showMeta={false} />
          </View>
        )
      })}
    </View>
  )
}
