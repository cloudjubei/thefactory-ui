import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../tokens/native'
import { renderLanguageIcon, type CodeInfoLanguage } from './codeInfoIcons'

export type CodeInfoChipProps = {
  type: 'language' | 'framework' | 'testFramework'
  value: string
  isInteractive?: boolean
  onPress?: () => void
}

/**
 * Native peer of web's
 * [`CodeInfoChip`](../../web/compound/CodeInfoChip.tsx). Pill-shaped tag
 * summarising one slice of a project's code-info: language, framework, or
 * testFramework. Language chips render a small coloured icon (see
 * `renderLanguageIcon`); framework / testFramework chips render the raw
 * string. Used by the mobile project editor (parity with web).
 */
export default function CodeInfoChip({
  type,
  value,
  isInteractive,
  onPress,
}: CodeInfoChipProps): ReactNode {
  const inner =
    type === 'language' ? (
      <View accessibilityLabel={value}>{renderLanguageIcon(value as CodeInfoLanguage, 16)}</View>
    ) : (
      <Text
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: nativeLightTheme.text.primary,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    )

  const containerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: nativeSpace[3],
    paddingHorizontal: nativeSpace[5],
    paddingVertical: 2,
    borderRadius: nativeRadii[5] ?? 999,
    borderWidth: 1,
    borderColor: nativeLightTheme.border.subtle,
    backgroundColor: nativeLightTheme.surface.raised,
  }

  if (isInteractive && onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value}
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          {
            backgroundColor: pressed
              ? nativeLightTheme.surface.muted
              : containerStyle.backgroundColor,
          },
        ]}
      >
        {inner}
      </Pressable>
    )
  }

  return (
    <View accessibilityLabel={value} style={containerStyle}>
      {inner}
    </View>
  )
}
