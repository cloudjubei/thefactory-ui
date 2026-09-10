import { Pressable, ScrollView, Text, View } from 'react-native'

import type { ReviewTab, ReviewTabId } from '../../../../headless'
import { nativeAlpha, nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

export type ReviewTabBarProps = {
  tabs: readonly ReviewTab[]
  active: ReviewTabId
  onChange: (tab: ReviewTabId) => void
}

/**
 * The evidence tabs. A tab exists only when that kind of proof was filed, so
 * the bar itself says what the run produced — no empty galleries.
 */
export default function ReviewTabBar({ tabs, active, onChange }: ReviewTabBarProps) {
  const { theme } = useNativeTheme()
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      style={{ flexGrow: 0 }}
      contentContainerStyle={{
        flexDirection: 'row',
        gap: 2,
        minWidth: '100%',
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              marginBottom: -1,
              borderBottomWidth: 2,
              borderBottomColor: selected ? theme.accent.primary : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: '500',
                color: selected ? theme.text.primary : theme.text.muted,
              }}
            >
              {tab.label}
            </Text>
            {tab.count !== undefined ? (
              <View
                style={{
                  // Circle at one digit, pill only when it needs the width.
                  minWidth: 16,
                  height: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                  borderRadius: nativeRadii.round,
                  borderWidth: 1,
                  borderColor: selected
                    ? nativeAlpha(theme.accent.primary, 0.4)
                    : theme.border.subtle,
                  backgroundColor: selected
                    ? nativeAlpha(theme.accent.primary, 0.15)
                    : theme.surface.base,
                }}
              >
                <Text
                  style={{
                    fontSize: 9.5,
                    lineHeight: 11,
                    fontWeight: '600',
                    fontVariant: ['tabular-nums'],
                    color: selected ? theme.text.primary : theme.text.muted,
                  }}
                >
                  {tab.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
