import type { ComponentType } from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import {
  CHECK_STATE_LABELS,
  type CheckMethodId,
  type CheckMethodRow,
  type CheckMethodState,
} from '../../../headless'
import {
  nativeRadii,
  type NativeSemanticTheme,
  type NativeStatusTokens,
} from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import {
  IconBuild,
  IconClipboardCheck,
  IconCode,
  IconDocument,
  IconList,
  IconMobile,
  IconMonitor,
  IconPlay,
  IconTests,
} from '../../icons'

const GLYPH: Record<CheckMethodId, ComponentType<{ size?: number; color?: string }>> = {
  tests: IconTests,
  types: IconCode,
  lint: IconList,
  format: IconClipboardCheck,
  build: IconBuild,
  device: IconMobile,
  screens: IconMonitor,
  walkthrough: IconPlay,
  report: IconDocument,
}

const MARK: Record<CheckMethodState, string> = {
  passed: '✓',
  failed: '✕',
  unchecked: '?',
  unconfigured: '+',
}

export type CheckChipPalette = { bg: string; border: string; fg: string; dashed: boolean }

/**
 * Colour says only pass / fail / absent. The two absences draw dashed with no
 * fill — the treatment reserved for "nobody looked" — so neither can be read
 * as a verdict.
 */
export function checkChipPalette(
  state: CheckMethodState,
  theme: NativeSemanticTheme,
  status: NativeStatusTokens,
): CheckChipPalette {
  switch (state) {
    case 'passed':
      return {
        bg: status.done.softBg,
        border: status.done.softBorder,
        fg: status.done.softFg,
        dashed: false,
      }
    case 'failed':
      return {
        bg: status.stuck.softBg,
        border: status.stuck.softBorder,
        fg: status.stuck.softFg,
        dashed: false,
      }
    case 'unchecked':
      return {
        bg: 'transparent',
        border: status.review.softBorder,
        fg: status.review.softFg,
        dashed: true,
      }
    case 'unconfigured':
      return { bg: 'transparent', border: theme.border.strong, fg: theme.text.muted, dashed: true }
  }
}

export function checkChipStyle(palette: CheckChipPalette): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 24,
    paddingLeft: 7,
    paddingRight: 9,
    borderRadius: nativeRadii.round,
    borderWidth: 1,
    borderStyle: palette.dashed ? 'dashed' : 'solid',
    borderColor: palette.border,
    backgroundColor: palette.bg,
  }
}

export type CheckChipProps = {
  row: Pick<CheckMethodRow, 'id' | 'label' | 'state'>
  onPress?: () => void
  /** Renders the chip inert — for a block heading that is not a control. */
  inert?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * One verification method as a chip: its glyph, its name, and a mark for its
 * state. The glyph never changes — a reader learns "this is lint" once.
 */
export default function CheckChip({ row, onPress, inert, style }: CheckChipProps) {
  const { theme, status } = useNativeTheme()
  const palette = checkChipPalette(row.state, theme, status)
  const Glyph = GLYPH[row.id]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.label}: ${CHECK_STATE_LABELS[row.state]}`}
      accessibilityState={{ disabled: !!inert }}
      disabled={inert}
      onPress={onPress}
      style={({ pressed }) => [checkChipStyle(palette), { opacity: pressed ? 0.8 : 1 }, style]}
    >
      <Glyph size={13} color={palette.fg} />
      <Text style={{ fontSize: 12, fontWeight: '500', color: palette.fg }}>{row.label}</Text>
      <View
        style={{
          width: 13,
          height: 13,
          marginLeft: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 9, lineHeight: 11, fontWeight: '700', color: palette.fg }}>
          {MARK[row.state]}
        </Text>
      </View>
    </Pressable>
  )
}
