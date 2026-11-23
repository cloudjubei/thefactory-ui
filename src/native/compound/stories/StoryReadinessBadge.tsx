import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { STORY_READINESS_COPY } from '../../../headless/utils/storyReadinessViewConstants'
import type { StoryReadinessView } from '../../../headless/utils/storyReadinessViewTypes'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type StoryReadinessBadgeProps = {
  view: StoryReadinessView
  onOpenFeature?: (featureId: string) => void
}

/** Native peer of the web `StoryReadinessBadge`. */
export default function StoryReadinessBadge({ view, onOpenFeature }: StoryReadinessBadgeProps) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const tone = status[view.tone]
  const chip = (
    <View
      style={{
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        backgroundColor: tone.softBg,
        borderColor: tone.softBorder,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', lineHeight: 18, color: tone.softFg }}>
        {view.label}
      </Text>
    </View>
  )
  if (view.ready) return chip
  return (
    <View style={{ gap: 6, alignItems: 'flex-start' }}>
      <Pressable
        accessibilityLabel={view.label}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
      >
        {chip}
      </Pressable>
      {open ? (
        <View
          style={{
            gap: 4,
            borderWidth: 1,
            borderColor: theme.border.subtle,
            borderRadius: 8,
            backgroundColor: theme.surface.raised,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: theme.text.secondary,
            }}
          >
            {STORY_READINESS_COPY.heading}
          </Text>
          {view.problems.map((problem) => {
            const featureId = problem.featureId
            const line = (
              <Text style={{ fontSize: 13, color: theme.text.primary }}>{problem.message}</Text>
            )
            return featureId && onOpenFeature ? (
              <Pressable
                key={problem.key}
                accessibilityLabel={problem.message}
                accessibilityRole="button"
                onPress={() => onOpenFeature(featureId)}
              >
                {line}
              </Pressable>
            ) : (
              <View key={problem.key}>{line}</View>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}
