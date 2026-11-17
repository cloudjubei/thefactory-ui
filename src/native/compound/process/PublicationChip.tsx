import { Linking, Pressable, Text, View } from 'react-native'
import type { ProcessPublicationView } from '../../../headless'
import { nativeFontFamilies, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import ToneBadge from '../chips/ToneBadge'

export interface PublicationChipProps {
  view: ProcessPublicationView
  /** Show the published branch's name beside it. */
  withBranch?: boolean
}

/** Native peer of web's `PublicationChip`: "In review" and the pull request, one tap away. */
export default function PublicationChip({ view, withBranch = false }: PublicationChipProps) {
  const { theme } = useNativeTheme()
  const link = view.link
  return (
    <View
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: nativeSpace[2] }}
    >
      <ToneBadge tone={view.badge.tone} label={view.badge.label} />
      {link ? (
        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          onPress={() => void Linking.openURL(link.url).catch(() => undefined)}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: theme.accent.primary,
              textDecorationLine: 'underline',
            }}
          >
            {`${link.label} ↗`}
          </Text>
        </Pressable>
      ) : null}
      {withBranch ? (
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            fontSize: 11,
            fontFamily: nativeFontFamilies.mono,
            color: theme.text.muted,
          }}
        >
          {view.branch}
        </Text>
      ) : null}
    </View>
  )
}
