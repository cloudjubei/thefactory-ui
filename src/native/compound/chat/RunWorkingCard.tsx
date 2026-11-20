import { Text, View } from 'react-native'

import type { ReviewRunWorkingView } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Spinner from '../../primitives/Spinner'
import ToneBadge from '../chips/ToneBadge'
import { MergeSection } from './ColleagueReviewCard'

export type RunWorkingCardProps = {
  view: ReviewRunWorkingView
}

/**
 * Native peer of web's `RunWorkingCard`: a review run's card while it works
 * off the chat, once the person chose — the step it is on with the run's
 * badge, and its round's merge pull request by pull request.
 */
export default function RunWorkingCard({ view }: RunWorkingCardProps) {
  const { theme } = useNativeTheme()
  const label = `${view.name} · ${view.step}`
  return (
    <View
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{ gap: nativeSpace[2] }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Spinner size={12} />
        <Text
          numberOfLines={1}
          style={{ flexShrink: 1, fontSize: 13, fontWeight: '600', color: theme.text.primary }}
        >
          {label}
        </Text>
        <View style={{ marginLeft: 'auto' }}>
          <ToneBadge tone={view.badge.tone} label={view.badge.label} />
        </View>
      </View>
      {view.merge ? <MergeSection merge={view.merge} /> : null}
    </View>
  )
}
