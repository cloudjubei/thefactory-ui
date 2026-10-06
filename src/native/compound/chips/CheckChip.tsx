import type { ComponentType } from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import {
  checkChipFace,
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
  IconDiff,
  IconDocument,
  IconGlobe,
  IconList,
  IconMobile,
  IconMonitor,
  IconPlay,
  IconTests,
} from '../../icons'

const GLYPH: Record<CheckMethodId, ComponentType<{ size?: number; color?: string }>> = {
  tests: IconTests,
  uitests: IconGlobe,
  types: IconCode,
  lint: IconList,
  format: IconClipboardCheck,
  build: IconBuild,
  device: IconMobile,
  screens: IconMonitor,
  walkthrough: IconPlay,
  report: IconDocument,
  diff: IconDiff,
}

export type CheckChipPalette = { bg: string; border: string; fg: string; dashed: boolean }

/**
 * Colour says only pass / fail / flagged / absent. Flagged — only advisory
 * checks failed — is amber, never the red of a failure. The two absences draw
 * dashed with no fill — the treatment reserved for "nobody looked" — so neither
 * can be read as a verdict.
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
    case 'flagged':
      return {
        bg: status.working.softBg,
        border: status.working.softBorder,
        fg: status.working.softFg,
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
  row: Pick<CheckMethodRow, 'id' | 'label' | 'state' | 'available'>
  onPress?: () => void
  /** Renders the chip inert — for a block heading that is not a control. */
  inert?: boolean
  style?: StyleProp<ViewStyle>
  /** The chip is a tab, and the tab it opens is showing. */
  selected?: boolean
}

/**
 * One verification method as a chip: its glyph, its name, and a mark for its
 * state. The glyph never changes — a reader learns "this is lint" once.
 */
export default function CheckChip({ row, onPress, inert, style, selected }: CheckChipProps) {
  const { theme, status } = useNativeTheme()
  const palette = checkChipPalette(row.state, theme, status)
  const Glyph = GLYPH[row.id]
  const face = checkChipFace(row)
  return (
    <Pressable
      accessibilityRole={selected === undefined ? 'button' : 'tab'}
      accessibilityLabel={`${row.label}: ${face.stateLabel}`}
      accessibilityState={{ disabled: !!inert, ...(selected === undefined ? {} : { selected }) }}
      disabled={inert}
      onPress={onPress}
      style={({ pressed }) => [
        checkChipStyle(palette),
        { opacity: pressed ? 0.8 : 1 },
        selected ? { borderWidth: 1.5, borderColor: theme.accent.primary } : null,
        style,
      ]}
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
          {face.mark}
        </Text>
      </View>
    </Pressable>
  )
}
