import { useState, type ReactNode } from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { RUN_STEPS_CARD_COPY } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type RunStepsCardProps = {
  /** "10 of 11 done". */
  line: string
  total: number
  /** Open from the start — while the run works and nothing waits on the person. */
  defaultOpen: boolean
  /** The steps themselves. */
  children: ReactNode
  /** Laid over the card's own style — the sign-off places it flush in its column. */
  style?: StyleProp<ViewStyle>
}

/**
 * Native peer of
 * [web's `RunStepsCard`](../../../web/compound/process/RunStepsCard.tsx).
 * A run's steps under one line of how far it got — folded while something
 * else leads the page.
 */
export default function RunStepsCard({
  line,
  total,
  defaultOpen,
  children,
  style,
}: RunStepsCardProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(defaultOpen)
  return (
    <View
      accessibilityLabel={RUN_STEPS_CARD_COPY.title}
      style={[
        {
          marginHorizontal: nativeSpace[3],
          marginTop: nativeSpace[3],
          borderRadius: nativeRadii[4],
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          columnGap: 10,
          rowGap: 4,
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}
        >
          {RUN_STEPS_CARD_COPY.title}
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.text.muted }}>{line}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
          hitSlop={6}
          style={{ marginLeft: 'auto' }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '500', color: theme.accent.primary }}>
            {open ? RUN_STEPS_CARD_COPY.hide : RUN_STEPS_CARD_COPY.show(total)}
          </Text>
        </Pressable>
      </View>
      {open ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
            paddingBottom: 6,
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  )
}
