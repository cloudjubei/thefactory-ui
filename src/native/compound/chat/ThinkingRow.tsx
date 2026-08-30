import { memo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Spinner from '../../primitives/Spinner'
import { IconHourglass } from '../../icons'
import { nativePalette, nativeRadii, nativeShadows, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface ThinkingRowProps {
  thinking?: string
  defaultOpen?: boolean
  label?: string
  /** Optional text shown beside the spinner in the no-reasoning state — used for
   * a transient status (e.g. "Starting the agent…" while a CLI sandbox boots). */
  spinnerLabel?: string
  /** Optional secondary line under {@link spinnerLabel} (e.g. a reassuring note
   * that the first CLI turn is the slow one while the sandbox warms up). */
  spinnerSubLabel?: string
  /**
   * `'blocked'` swaps the spinner for the teal hourglass the tool cards already
   * use for `require_confirmation` — a run parked on a human decision must not
   * animate as though it were working.
   */
  tone?: 'working' | 'blocked'
}

function ThinkingRow({
  thinking,
  defaultOpen = false,
  label = 'Reasoning',
  spinnerLabel,
  spinnerSubLabel,
  tone = 'working',
}: ThinkingRowProps) {
  const { theme } = useNativeTheme()
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
          borderColor: theme.border.subtle,
          backgroundColor: nativePalette.blue[50],
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.primary }}>AI</Text>
      </View>
      <View style={{ flex: 1, maxWidth: '72%', minWidth: 80, gap: nativeSpace[2] }}>
        {reasoning ? (
          <View
            style={{
              borderRadius: nativeRadii[5],
              borderTopLeftRadius: nativeRadii[5],
              borderBottomLeftRadius: nativeRadii[1],
              borderWidth: 1,
              borderColor: theme.border.subtle,
              backgroundColor: theme.surface.raised,
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
                backgroundColor: pressed ? theme.surface.overlay : 'transparent',
              })}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
                {label}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.text.secondary,
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
                  borderTopColor: theme.border.subtle,
                  paddingHorizontal: nativeSpace[6],
                  paddingVertical: nativeSpace[4],
                }}
              >
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>{reasoning}</Text>
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
              borderColor: tone === 'blocked' ? nativePalette.teal[600] : theme.border.subtle,
              backgroundColor: theme.surface.raised,
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: nativeSpace[2],
              ...nativeShadows[1],
            }}
          >
            {tone === 'blocked' ? (
              <IconHourglass size={16} color={nativePalette.teal[600]} />
            ) : (
              <Spinner />
            )}
            {spinnerLabel || spinnerSubLabel ? (
              <View style={{ gap: 1 }}>
                {spinnerLabel ? (
                  <Text style={{ fontSize: 12, color: theme.text.secondary }}>{spinnerLabel}</Text>
                ) : null}
                {spinnerSubLabel ? (
                  <Text style={{ fontSize: 11, color: theme.text.muted }}>{spinnerSubLabel}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  )
}

export default memo(ThinkingRow)
