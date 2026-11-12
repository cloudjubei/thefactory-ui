import { Text, View } from 'react-native'

import type { LiveCheckWatchView } from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import RichText from '../files/RichText'

const BADGE_TONES = {
  ready: 'done',
  problem: 'stuck',
  unprepared: 'on_hold',
} as const

export type LiveCheckWatchHeaderProps = {
  view: LiveCheckWatchView
  embedded?: boolean
}

/** Native peer of the web `LiveCheckWatchHeader`. */
export default function LiveCheckWatchHeader({
  view,
  embedded = false,
}: LiveCheckWatchHeaderProps) {
  const { theme, status } = useNativeTheme()
  const tone = status[BADGE_TONES[view.state]]
  return (
    <View style={{ gap: 6 }} testID={`live-check-watch-${view.state}`}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text
          style={{ fontSize: embedded ? 16 : 13, fontWeight: '600', color: theme.text.primary }}
        >
          {view.title}
        </Text>
        {view.badge ? (
          <Text
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: tone.softFg,
              backgroundColor: tone.softBg,
              borderColor: tone.softBorder,
              borderWidth: 1,
              borderRadius: nativeRadii.round,
              paddingHorizontal: 8,
              paddingVertical: 1,
              overflow: 'hidden',
            }}
          >
            {view.badge}
          </Text>
        ) : null}
      </View>
      <RichText text={view.line} textColor={theme.text.primary} fontSize={12.5} />
      <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{view.walk}</Text>
      {view.noPassesLine ? (
        <Text style={{ fontSize: 11.5, color: theme.text.muted }}>{view.noPassesLine}</Text>
      ) : null}
    </View>
  )
}
