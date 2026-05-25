import { Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import {
  nativeLightStatus,
  nativePalette,
  nativeRadii,
  nativeSpace,
} from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export type BranchChipType = 'local' | 'remote' | 'current' | 'same' | 'updated' | 'story'

export interface BranchChipProps {
  type: BranchChipType
  label?: string
  size?: 'sm' | 'xs'
  className?: string
  style?: StyleProp<ViewStyle>
}

const DEFAULT_LABEL: Record<BranchChipType, string> = {
  local: 'Local',
  remote: 'Remote',
  current: 'Current',
  same: 'Same',
  updated: 'Updated',
  story: 'Story',
}

function typeColors(type: BranchChipType): { bg: string; fg: string; border: string } {
  const { theme } = useNativeTheme()
  const TYPE_COLORS: Record<BranchChipType, { bg: string; fg: string; border: string }> = {
    local: {
      bg: theme.surface.muted,
      fg: theme.text.secondary,
      border: theme.border.subtle,
    },
    same: {
      bg: theme.surface.muted,
      fg: theme.text.secondary,
      border: theme.border.subtle,
    },
    remote: {
      bg: nativePalette.orange[100],
      fg: nativePalette.orange[800],
      border: nativePalette.orange[200],
    },
    current: {
      bg: nativePalette.green[100],
      fg: nativePalette.green[800],
      border: nativePalette.green[200],
    },
    updated: {
      bg: nativePalette.blue[100],
      fg: nativePalette.blue[800],
      border: nativePalette.blue[200],
    },
    story: {
      bg: nativeLightStatus.queued.bg,
      fg: nativeLightStatus.queued.fg,
      border: theme.border.subtle,
    },
  }
  return TYPE_COLORS[type]
}

export function BranchChip({ type, label, size = 'sm', className, style }: BranchChipProps) {
  const colors = typeColors(type)
  const fontSize = size === 'xs' ? 9 : 10
  return (
    <View
      className={className}
      style={[
        {
          alignSelf: 'flex-start',
          paddingHorizontal: nativeSpace[5],
          paddingVertical: 2,
          borderRadius: nativeRadii.round,
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={{ fontSize, fontWeight: '500', color: colors.fg }}>
        {label ?? DEFAULT_LABEL[type]}
      </Text>
    </View>
  )
}
