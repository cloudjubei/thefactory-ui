import { Text, View } from 'react-native'

import type { RunReviewFacts } from '../../../../headless'
import { nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import DurationPill from './DurationPill'

export type DurCostChipsProps = {
  facts: Partial<Pick<RunReviewFacts, 'costLabel' | 'durationLabel'>>
}

/**
 * A run's time + spend as the product's own chips — the blue duration pill and a
 * neutral cost pill — never plain grey text. The native peer of the web
 * `DurCostChips`, reused in the sign-off head and each section header.
 */
export default function DurCostChips({ facts }: DurCostChipsProps) {
  const { theme } = useNativeTheme()
  if (!facts.durationLabel && !facts.costLabel) return null
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {facts.durationLabel ? <DurationPill label={facts.durationLabel} /> : null}
      {facts.costLabel ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: nativeRadii.round,
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.overlay,
          }}
        >
          <View
            style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }}
            aria-hidden
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: theme.text.secondary,
              fontVariant: ['tabular-nums'],
            }}
          >
            {facts.costLabel}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
