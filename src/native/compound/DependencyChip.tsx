import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import Tooltip from '../primitives/Tooltip'
import { nativeLightTheme, nativePalette, nativeRadii, nativeSpace } from '../../tokens/native'

export type DependencyChipKind = 'story' | 'feature' | 'missing'
export type DependencyChipVariant = 'ok' | 'blocks' | 'missing'

export interface DependencyChipProps {
  /** Text shown after the leading `#` (e.g. `"3"` or `"3.2"`). */
  display: string
  kind: DependencyChipKind
  variant: DependencyChipVariant
  tooltip?: ReactNode
  /** When true, suppress the tooltip even if provided. */
  disableHoverInfo?: boolean
  interactive?: boolean
  onPress?: () => void
  onRemove?: () => void
  className?: string
  style?: StyleProp<ViewStyle>
  title?: string
}

interface ChipColors {
  bg: string
  fg: string
  border: string
}

function chipColors(kind: DependencyChipKind, variant: DependencyChipVariant): ChipColors {
  if (kind === 'missing' || variant === 'missing') {
    return {
      bg: nativePalette.red[50],
      fg: nativeLightTheme.text.primary,
      border: nativePalette.red[200],
    }
  }
  if (kind === 'story') {
    return {
      bg: nativePalette.blue[50],
      fg: nativePalette.blue[800],
      border: variant === 'blocks' ? nativePalette.purple[700] : nativePalette.blue[700],
    }
  }
  if (kind === 'feature') {
    return {
      bg: nativePalette.green[50],
      fg: nativePalette.green[800],
      border: variant === 'blocks' ? nativePalette.red[700] : nativePalette.green[700],
    }
  }
  return {
    bg: nativeLightTheme.surface.base,
    fg: nativeLightTheme.text.secondary,
    border: nativeLightTheme.border.default,
  }
}

export default function DependencyChip({
  display,
  kind,
  variant,
  tooltip,
  disableHoverInfo = false,
  interactive = true,
  onPress,
  onRemove,
  className,
  style,
  title,
}: DependencyChipProps) {
  const colors = chipColors(kind, variant)
  const isInteractive = interactive && !onRemove && onPress != null

  const body = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          height: 24,
          paddingHorizontal: nativeSpace[5],
          borderRadius: nativeRadii.round,
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 12, color: colors.fg }}>#{display}</Text>
      {onRemove && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove"
          onPress={onRemove}
          hitSlop={4}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 0.8 })}
        >
          <Text style={{ fontSize: 12, color: colors.fg }}>×</Text>
        </Pressable>
      )}
    </View>
  )

  const chip = isInteractive ? (
    <Pressable
      className={className}
      accessibilityRole="button"
      accessibilityLabel={title ?? display}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {body}
    </Pressable>
  ) : (
    <View className={className} accessibilityLabel={title ?? display}>
      {body}
    </View>
  )

  if (!tooltip || disableHoverInfo) return chip
  return (
    <Tooltip content={tooltip} variant="bare">
      {chip}
    </Tooltip>
  )
}
