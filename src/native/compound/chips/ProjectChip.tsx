import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import Tooltip from '../../primitives/Tooltip'
import { nativePalette, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { chipPillStyle, chipPillTextStyle } from './pillStyles'

export interface ProjectChipProps {
  label: string
  description?: ReactNode
  nonActionable?: boolean
  onPress?: () => void
  className?: string
}

export default function ProjectChip({
  label,
  description,
  nonActionable = false,
  onPress,
  className,
}: ProjectChipProps) {
  const { theme } = useNativeTheme()
  const body = (
    <View style={chipPillStyle(theme)}>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: nativePalette.orange[500],
        }}
      />
      <Text numberOfLines={1} style={[chipPillTextStyle(theme), { color: theme.text.primary }]}>
        {label}
      </Text>
    </View>
  )

  const chip = nonActionable ? (
    <View className={className} accessibilityLabel={label}>
      {body}
    </View>
  ) : (
    <Pressable
      className={className}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {body}
    </Pressable>
  )

  return (
    <Tooltip
      disabled={nonActionable}
      content={
        <View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
            {label}
          </Text>
          {description ? (
            typeof description === 'string' ? (
              <Text
                style={{
                  marginTop: nativeSpace[2],
                  fontSize: 12,
                  color: theme.text.secondary,
                }}
              >
                {description}
              </Text>
            ) : (
              <View style={{ marginTop: nativeSpace[2] }}>{description}</View>
            )
          ) : null}
        </View>
      }
    >
      {chip}
    </Tooltip>
  )
}
