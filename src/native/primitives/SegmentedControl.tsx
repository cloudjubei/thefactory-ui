import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export interface SegmentedOption {
  value: string
  label: string
  icon?: ReactNode
}

export type SegmentedSize = 'sm' | 'md'

export interface SegmentedControlProps {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  size?: SegmentedSize
  ariaLabel?: string
  /** Stable handle for UI-test tooling; each option becomes `${testID}-${value}`. */
  testID?: string
  className?: string
  /** Visually hide per-option text labels; icons stay. */
  hideLabels?: boolean
  style?: StyleProp<ViewStyle>
}

const HEIGHT: Record<SegmentedSize, number> = { sm: 28, md: 34 }
const PAD_X: Record<SegmentedSize, number> = { sm: nativeSpace[6], md: nativeSpace[7] }
const TEXT_SIZE: Record<SegmentedSize, number> = { sm: 12, md: 13 }

export default function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  ariaLabel = 'View switch',
  testID,
  className,
  hideLabels = false,
  style,
}: SegmentedControlProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={ariaLabel}
      className={className}
      style={[
        {
          flexDirection: 'row',
          alignSelf: 'flex-start',
          backgroundColor: theme.surface.raised,
          borderWidth: 1,
          borderColor: theme.border.default,
          borderRadius: nativeRadii.round,
          padding: 2,
          gap: 2,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, checked: active }}
            accessibilityLabel={opt.label}
            testID={testID ? `${testID}-${opt.value}` : undefined}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => ({
              height: HEIGHT[size],
              paddingHorizontal: PAD_X[size],
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: nativeSpace[3],
              borderRadius: nativeRadii.round,
              backgroundColor: active ? theme.accent.primary : 'transparent',
              opacity: pressed && !active ? 0.7 : 1,
            })}
          >
            {opt.icon}
            {!hideLabels && (
              <Text
                style={{
                  fontSize: TEXT_SIZE[size],
                  fontWeight: active ? '600' : '500',
                  color: active ? theme.text.inverted : theme.text.secondary,
                }}
              >
                {opt.label}
              </Text>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}
