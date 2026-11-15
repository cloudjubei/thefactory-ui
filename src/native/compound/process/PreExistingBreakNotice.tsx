import { Text, View } from 'react-native'

import type { PreExistingBreakView, ProofPointList } from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

function GroupTitle({ text }: { text: string }) {
  const { theme } = useNativeTheme()
  return (
    <Text
      style={{
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.text.muted,
      }}
    >
      {text}
    </Text>
  )
}

function Group({ list, mono }: { list: ProofPointList; mono: boolean }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 2 }}>
      <GroupTitle text={list.title} />
      {list.items.map((item) => (
        <Text
          key={item}
          style={{
            fontSize: mono ? 12 : 13,
            color: theme.text.primary,
            ...(mono ? { fontFamily: nativeFontFamilies.mono } : {}),
          }}
        >
          {item}
        </Text>
      ))}
    </View>
  )
}

/**
 * A check target already broken before the change, on its stop: the
 * headline, where it fails the same way, the failing files and checks, and
 * its first failing lines. The same for a checks stop and a waiting developer.
 * Web peer: `web/compound/process/PreExistingBreakNotice`.
 */
export default function PreExistingBreakNotice({
  view,
  heading = true,
}: {
  view: PreExistingBreakView
  /** Off where the card's own title already says the headline. */
  heading?: boolean
}) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[2] }}>
      {heading ? (
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {view.headline}
        </Text>
      ) : null}
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.base}</Text>
      {view.files ? <Group list={view.files} mono /> : null}
      <Group list={view.checks} mono={false} />
      {view.failing ? (
        <View style={{ gap: 2 }}>
          <GroupTitle text={view.failing.title} />
          <View
            style={{
              borderLeftWidth: 2,
              borderLeftColor: theme.border.strong,
              backgroundColor: theme.surface.base,
              borderRadius: nativeRadii[2],
              paddingHorizontal: nativeSpace[2],
              paddingVertical: nativeSpace[1],
            }}
          >
            <Text
              numberOfLines={8}
              style={{
                fontSize: 11.5,
                lineHeight: 17,
                fontFamily: nativeFontFamilies.mono,
                color: theme.text.primary,
              }}
            >
              {view.failing.text}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}
