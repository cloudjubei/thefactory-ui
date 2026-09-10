import { Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { nativeFontFamilies, nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconBranch, IconCommit } from '../../icons'

export type RefChipKind = 'commit' | 'branch'

export type RefChipProps = {
  /** A commit sha (shortened to 8 for display) or a branch name. */
  value: string
  kind: RefChipKind
  style?: StyleProp<ViewStyle>
}

/**
 * A git ref, as a chip. Commits and branches share one shape so a reader learns
 * it once; the branch is tinted so the two never read alike.
 */
export default function RefChip({ value, kind, style }: RefChipProps) {
  const { theme, status } = useNativeTheme()
  const display = kind === 'commit' && /^[0-9a-f]{12,}$/i.test(value) ? value.slice(0, 8) : value
  const Glyph = kind === 'branch' ? IconBranch : IconCommit
  const branch = kind === 'branch'
  const fg = branch ? status.on_hold.softFg : theme.text.secondary
  return (
    <View
      accessibilityLabel={value}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          height: 22,
          paddingHorizontal: 8,
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderColor: branch ? status.on_hold.softBorder : theme.border.default,
          backgroundColor: branch ? status.on_hold.softBg : theme.surface.base,
        },
        style,
      ]}
    >
      <View style={{ opacity: 0.8 }}>
        <Glyph size={11} color={fg} />
      </View>
      <Text
        numberOfLines={1}
        style={{ fontFamily: nativeFontFamilies.mono, fontSize: 11, color: fg }}
      >
        {display}
      </Text>
    </View>
  )
}
