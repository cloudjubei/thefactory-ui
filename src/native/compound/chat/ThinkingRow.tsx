import { memo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Spinner from '../../primitives/Spinner'
import {
  nativeLightTheme,
  nativePalette,
  nativeRadii,
  nativeShadows,
  nativeSpace,
} from '../../../tokens/native'

export interface ThinkingRowProps {
  thinking?: string
  defaultOpen?: boolean
  label?: string
}

function ThinkingRow({ thinking, defaultOpen = false, label = 'Reasoning' }: ThinkingRowProps) {
  const [open, setOpen] = useState(defaultOpen)
  const reasoning = thinking?.trim()

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[3] }}>
      <View
        accessibilityElementsHidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: nativeLightTheme.border.subtle,
          backgroundColor: nativePalette.blue[50],
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '600', color: nativeLightTheme.text.primary }}>
          AI
        </Text>
      </View>
      <View style={{ flex: 1, maxWidth: '72%', minWidth: 80, gap: nativeSpace[2] }}>
        {reasoning ? (
          <View
            style={{
              borderRadius: nativeRadii[5],
              borderTopLeftRadius: nativeRadii[5],
              borderBottomLeftRadius: nativeRadii[1],
              borderWidth: 1,
              borderColor: nativeLightTheme.border.subtle,
              backgroundColor: nativeLightTheme.surface.raised,
              overflow: 'hidden',
              ...nativeShadows[1],
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={label}
              onPress={() => setOpen((v) => !v)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: nativeSpace[6],
                paddingVertical: nativeSpace[4],
                backgroundColor: pressed ? nativeLightTheme.surface.overlay : 'transparent',
              })}
            >
              <Text
                style={{ fontSize: 12, fontWeight: '500', color: nativeLightTheme.text.secondary }}
              >
                {label}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: nativeLightTheme.text.secondary,
                  transform: [{ rotate: open ? '90deg' : '0deg' }],
                }}
              >
                ›
              </Text>
            </Pressable>
            {open && (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: nativeLightTheme.border.subtle,
                  paddingHorizontal: nativeSpace[6],
                  paddingVertical: nativeSpace[4],
                }}
              >
                <Text style={{ fontSize: 12, color: nativeLightTheme.text.secondary }}>
                  {reasoning}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View
            style={{
              paddingHorizontal: nativeSpace[6],
              paddingVertical: nativeSpace[4],
              borderRadius: nativeRadii[5],
              borderTopLeftRadius: nativeRadii[5],
              borderBottomLeftRadius: nativeRadii[1],
              borderWidth: 1,
              borderColor: nativeLightTheme.border.subtle,
              backgroundColor: nativeLightTheme.surface.raised,
              alignSelf: 'flex-start',
              ...nativeShadows[1],
            }}
          >
            <Spinner />
          </View>
        )}
      </View>
    </View>
  )
}

export default memo(ThinkingRow)
